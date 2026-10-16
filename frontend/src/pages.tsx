import {useMotionPreference} from "./motion-preferences";
import { EventGlyph } from "./events";
import { AnimatedNumber, Stagger, StaggerItem } from "./motion";
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  useInfiniteQuery,
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Activity as ActivityIcon,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Clock,
  Filter,
  Flag,
  ListFilter,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Zap,
  X,
} from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  api,
  ApiError,
  isLead,
  label,
  params,
  priorities,
  statuses,
  transitions,
  type Activity,
  type Comment,
  type Item,
  type Member,
  type Page,
  type Status,
  type Summary,
} from "./api";
import { useSession } from "./App";
import {
  Avatar,
  dueLabel,
  Empty,
  ErrorBox,
  Loading,
  overdue,
  PageEnter,
  PriorityMark,
  shortId,
  Spinner,
  StatusBadge,
  useToast,
} from "./ui";
import { ItemForm } from "./forms";
function useItems(values: Record<string, string | number | undefined>, retainPrevious = false) {
  return useQuery({
    queryKey: ["items", values],
    placeholderData:retainPrevious ? keepPreviousData : undefined,
    queryFn: () => api<Page<Item>>("/items?" + params(values)),
  });
}
function ItemLine({ item }: { item: Item }) {
  return (
    <Link className="item-line" to={"/items/" + item.id}>
      <span className={`item-type type-${item.type.toLowerCase()}`}>
        {item.type === "INCIDENT" ? (
          <Zap size={16} />
        ) : item.type === "COMPLIANCE" ? (
          <ShieldCheck size={16} />
        ) : (
          <CircleDashed size={16} />
        )}
      </span>
      <div className="item-line-title">
        <span className="item-id">{shortId(item.id)}</span>
        <strong>{item.title}</strong>
        <small>{item.teamName}</small>
      </div>
      <div className="item-line-end">
        <PriorityMark priority={item.priority} />
        <ChevronRight size={16} />
      </div>
    </Link>
  );
}
function Queue({
  title,
  subtitle,
  view,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  view: string;
  icon: typeof Zap;
}) {
  const { teamId } = useSession();
  const items = useItems({ teamId, view, limit: 3 });
  return (
    <section className="panel queue">
      <div className="panel-header">
        <div className="panel-title">
          <span className={"panel-icon " + view}>
            <Icon size={17} />
          </span>
          <div>
            <h3>{title}</h3>
            <p>{subtitle}</p>
          </div>
        </div>
        <Link
          className="icon-link"
          aria-label={"View " + title}
          to={"/items?view=" + view}
        >
          <ArrowUpRight size={17} />
        </Link>
      </div>
      {items.isPending ? (
        <Loading rows={3} />
      ) : items.isError ? (
        <ErrorBox error={items.error} retry={() => void items.refetch()} />
      ) : items.data.items.length ? (
        items.data.items.map((item) => <ItemLine key={item.id} item={item} />)
      ) : (
        <Empty title={view === "approvals" ? "No reviews waiting" : view === "urgent" ? "Urgent work has an owner" : view === "mine" ? "Your queue is clear" : "No overdue work"}>
          {view === "approvals"
            ? "No work is awaiting your team lead review."
            : view === "mine" ? "Pick up an unassigned item when you’re ready." : "Your team is up to date. New work will appear here."}
        </Empty>
      )}
      <Link className="panel-footer" to={"/items?view=" + view}>
        View all {title.toLowerCase()}
        <ArrowRight size={14} />
      </Link>
    </section>
  );
}
export function Dashboard() {
  const { user, teamId, create, teams } = useSession();
  const summary = useQuery({
    queryKey: ["summary", teamId],
    queryFn: () => api<Summary>("/dashboard/summary?" + params({ teamId })),
  });
  const [recentLimit,setRecentLimit]=useState(5);
  useEffect(()=>setRecentLimit(5),[teamId]);
  const metrics = summary.data?.metrics;
  const now = new Date();
  const canCreate = teams.some(
    (t) => (!teamId || t.id === teamId) && t.role !== "VIEWER",
  );
  const cards = [
    {
      label: "Active work", tone: "accent",
      value: metrics?.active,
      detail: "Across your workspace",
      icon: ListFilter,
      view: "",
    },
    {
      label: "Assigned to me", tone: "info",
      value: metrics?.mine,
      detail: "Your next moves",
      icon: UserRound,
      view: "mine",
    },
    {
      label: "Urgent & unassigned", tone: "warning",
      value: metrics?.urgent,
      detail: "Ready for an owner",
      icon: Zap,
      view: "urgent",
    },
    {
      label: "Awaiting my approval", tone: "success",
      value: metrics?.approvals,
      detail: "Your review makes progress",
      icon: ShieldCheck,
      view: "approvals",
    },
    {label:"Overdue work",value:metrics?.overdue,detail:"Past their due date",icon:Clock,view:"overdue",tone:"danger"},
  ];
  return (
    <PageEnter>
      <div className="page-heading">
        <div>
          <span className="eyebrow">OPERATIONS COMMAND CENTER</span>
          <h1>A clear view. A focused team.</h1>
          <p>
            Welcome back, {user.name.split(" ")[0]}. Here’s where things stand.
          </p>
        </div>
        <div className="overview-tools"><button className="button secondary small-button" onClick={()=>void summary.refetch()} disabled={summary.isFetching} aria-label="Refresh overview"><RefreshCw size={14} className={summary.isFetching?"spin":""}/>Refresh</button>
        <div className="date-label">
          <Calendar size={15} />
          {now.toLocaleDateString("en", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </div></div>
      </div>
      <div className="overview-banner">
        <div>
          <span className="banner-tag">
            <span className="mini-dot" />
            WORKSPACE SNAPSHOT
          </span>
          <h2>Turn signals into progress.</h2>
          <p>Bring clarity to the urgent. Keep every handoff accountable.</p>
          <Link to="/items?view=urgent">
            Find work that needs you
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="banner-graphic" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit-center">
            <ActivityIcon size={35} />
          </div>
          <span className="orbit-label label-one">
            <CheckCheck size={14} />
            Clear ownership
          </span>
          <span className="orbit-label label-two">
            <ShieldCheck size={14} />
            Trusted handoffs
          </span>
        </div>
      </div>
      {summary.isError ? (
        <ErrorBox error={summary.error} retry={() => void summary.refetch()} />
      ) : (
        <Stagger className="metric-grid">
          {cards.map((card) => (
            <StaggerItem key={card.label}>
              <Link
                className="metric-card" data-tone={card.tone}
                to={"/items" + (card.view ? "?view=" + card.view : "")}
              >
                <div className="metric-top">
                  <span>{card.label}</span>
                  <card.icon size={17} />
                </div>
                <div className="metric-value">
                  {summary.isPending ? (
                    <span className="skeleton metric-skeleton" />
                  ) : (
                    card.value === undefined ? "—" : <AnimatedNumber value={card.value}/>
                  )}
                  <ArrowUpRight size={18} />
                </div>
                <span className="metric-detail">{card.detail}</span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}
      <div className="section-heading">
        <div>
          <h2>Your attention, well placed.</h2>
          <p>The right work, at the right moment.</p>
        </div>
        <Link className="text-button" to="/items">
          Explore all work
          <ArrowRight size={15} />
        </Link>
      </div>
      <Stagger className="queue-grid">
        <StaggerItem><Queue
          title="Assigned to me"
          subtitle="Move your work forward"
          view="mine"
          icon={UserRound}
        /></StaggerItem>
        <StaggerItem><Queue
          title="Urgent & unassigned"
          subtitle="High-impact work that needs an owner"
          view="urgent"
          icon={Zap}
        /></StaggerItem>
        <StaggerItem><Queue
          title="Awaiting approval"
          subtitle="Review, resolve, and keep things moving"
          view="approvals"
          icon={ShieldCheck}
        /></StaggerItem>
        <StaggerItem><Queue
          title="Overdue items"
          subtitle="A little attention goes a long way"
          view="overdue"
          icon={Clock}
        /></StaggerItem>
      </Stagger>
      <div className="bottom-grid">
        <section className="panel activity-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-icon">
                <ActivityIcon size={17} />
              </span>
              <div>
                <h3>The latest across your teams</h3>
                <p>A shared record of progress</p>
              </div>
            </div>
            <span className="subtle-pill">Recent activity</span>
          </div>
          {summary.isPending ? (
            <Loading />
          ) : summary.data?.recent.length ? (
            <Stagger className="recent-list">
              {summary.data.recent.slice(0, recentLimit).map((e) => (
                <StaggerItem key={e.id}><Link
                  to={"/items/" + e.item_id}
                  key={e.id}
                  className="recent-event"
                >
                  <EventGlyph type={e.event_type}/>
                  <div>
                    <p>
                      <strong>{e.actor_name}</strong> {eventLabel(e.event_type)}
                    </p>
                    <span>{e.title}</span>
                  </div>
                  <time>{relativeTime(e.created_at)}</time>
                </Link></StaggerItem>
              ))}
            </Stagger>
          ) : (
            <Empty title="A fresh start">
              Team activity will appear here as work moves forward.
            </Empty>
          )}
          {summary.data && summary.data.recent.length>recentLimit && <button className="text-button load-more" onClick={()=>setRecentLimit(summary.data!.recent.length)}>Show all {summary.data.recent.length} recent events<ArrowRight size={13}/></button>}
        </section>
        <section className="panel progress-panel">
          <span className="eyebrow">WORKSPACE PULSE</span>
          <h3>Progress, made visible.</h3>
          <p>A live snapshot of your team’s workflow.</p>
          {!summary.isPending && summary.data && <div className="distribution-track" role="img" aria-label={summary.data.distribution.map(d=>`${label(d.status)}: ${d.count}`).join(", ")}>{statuses.map(status=>{
            const count=summary.data.distribution.find(d=>d.status===status)?.count??0;
            const total=summary.data.distribution.reduce((sum,d)=>sum+d.count,0);
            return count>0?<motion.span key={status} className={status.toLowerCase()} style={{flexBasis:`${count/Math.max(total,1)*100}%`}} initial={{scaleX:0}} animate={{scaleX:1}} transition={{duration:.45,ease:[.22,1,.36,1]}}/>:null;
          })}</div>}
          {summary.isPending ? (
            <Loading rows={3} />
          ) : (
            statuses.map((s) => {
              const count =
                summary.data?.distribution.find((d) => d.status === s)?.count ??
                0;
              const total =
                summary.data?.distribution.reduce((n, d) => n + d.count, 0) ??
                1;
              return (
                <div className="workflow-bar" key={s}>
                  <div>
                    <span>
                      <i className={"workflow-dot " + s.toLowerCase()} />
                      {label(s)}
                    </span>
                    <strong>{count}</strong>
                  </div>
                  <div className="bar-track">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      className={s.toLowerCase()}
                      style={{
                        width: `${(count / Math.max(total, 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
          <div className="pulse-foot">
            <CheckCheck size={15} />
            {metrics?.completed ?? "—"} items resolved or closed
          </div>
        </section>
      </div>
      {canCreate && (
        <div className="quiet-cta">
          <span>
            <Sparkles size={17} />
            Every resolution starts with a clear first step.
          </span>
          <button className="text-button" onClick={create}>
            Create a work item
            <Plus size={15} />
          </button>
        </div>
      )}
    </PageEnter>
  );
}
const views: Record<string, string> = {
  mine: "Assigned to me",
  urgent: "Urgent & unassigned",
  approvals: "Awaiting my approval",
  overdue: "Overdue items",
};
export function Explorer() {
  const reduced = useMotionPreference();
  const { teamId, teams, create } = useSession();
  const [search, setSearch] = useSearchParams();
  const [q, setQ] = useState(search.get("q") ?? "");
  const searchInput=useRef<HTMLInputElement>(null);
  useEffect(()=>{function shortcut(event:KeyboardEvent){const active=document.activeElement;const typing=active?.matches("input,textarea,select,[contenteditable=true]");if(event.key==="/"&&!typing&&!document.querySelector('[role="dialog"]')){event.preventDefault();searchInput.current?.focus()}if(event.key==="Escape"&&active===searchInput.current)setQ("")}window.addEventListener("keydown",shortcut);return()=>window.removeEventListener("keydown",shortcut)},[]);
  const [advanced, setAdvanced] = useState(false);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const page = cursors.length - 1;
  const view = search.get("view") ?? "";
  const status = search.get("status") ?? "";
  const priority = search.get("priority") ?? "";
  const assigneeId = search.get("assigneeId") ?? "";
  const memberQuery = useQuery({
    queryKey: ["members", teamId],
    queryFn: () => api<Member[]>("/teams/" + teamId + "/members"),
    enabled: !!teamId,
  });
  useEffect(() => {
    const timer = setTimeout(() => {
      if (q !== (search.get("q") ?? "")) {
        const next = new URLSearchParams(search);
        q ? next.set("q", q) : next.delete("q");
        setSearch(next, { replace: true });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [q, search]);
  useEffect(() => {
    setCursors([undefined]);
  }, [search.toString(), teamId]);
  const values = {
    teamId,
    q: search.get("q") ?? "",
    status,
    priority,
    assigneeId,
    view,
    createdFrom: search.get("createdFrom") ?? "",
    createdTo: search.get("createdTo") ?? "",
    dueFrom: search.get("dueFrom") ?? "",
    dueTo: search.get("dueTo") ?? "",
    cursor: cursors[page],
    limit: 15,
  };
  const items = useItems(values,true);
  const focusPage=useRef(false);
  useEffect(()=>{if(focusPage.current&&!items.isFetching){focusPage.current=false;document.getElementById("results-heading")?.focus()}},[items.isFetching,page]);
  function filter(name: string, value: string) {
    const next = new URLSearchParams(search);
    value ? next.set(name, value) : next.delete(name);
    setSearch(next);
  }
  const canCreate = teams.some(
    (t) => (!teamId || t.id === teamId) && t.role !== "VIEWER",
  );
  return (
    <PageEnter>
      <div className="page-heading">
        <div>
          <span className="eyebrow">WORKSPACE / WORK ITEMS</span>
          <h1>Work, with a clear direction.</h1>
          <p>Find the signal. Take ownership. Move things forward.</p>
        </div>
        {canCreate && (
          <button className="button secondary" onClick={create}>
            <Plus size={16} />
            Create item
          </button>
        )}
      </div>
      <LayoutGroup id="work-views"><div className="view-tabs">
        {[
          ["", "All work"],
          ["mine", "Assigned to me"],
          ["urgent", "Urgent"],
          ["approvals", "Approvals"],
          ["overdue", "Overdue"],
        ].map(([value, name]) => (
          <button
            key={value}
            className={view === value ? "active" : ""}
            onClick={() => filter("view", value)}
          >
            {name}
            {view === value && <motion.span className="tab-indicator" layoutId="work-view" transition={{type:"spring",stiffness:400,damping:34}}/>}
          </button>
        ))}
      </div></LayoutGroup>
      <section className="panel explorer" aria-busy={items.isFetching} data-updating={items.isPlaceholderData}>
        <div className="filter-bar">
          <div className="search-field">
            <Search size={17} />
            <input
              ref={searchInput} aria-label="Search work items"
              placeholder="Search work items…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {!q&&<kbd className="search-shortcut" aria-hidden="true">/</kbd>}{q && (
              <button
                className="text-button"
                onClick={() => setQ("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <div className="filter-controls">
            <select
              aria-label="Filter status"
              value={status}
              onChange={(e) => filter("status", e.target.value)}
            >
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter priority"
              value={priority}
              onChange={(e) => filter("priority", e.target.value)}
            >
              <option value="">All priorities</option>
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {label(p)}
                </option>
              ))}
            </select>
            {teamId && (
              <select
                aria-label="Filter assignee"
                value={assigneeId}
                onChange={(e) => filter("assigneeId", e.target.value)}
              >
                <option value="">All assignees</option>
                {memberQuery.data?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
            <button
              className={"button filter-button " + (advanced ? "selected" : "")}
              onClick={() => setAdvanced(!advanced)}
              aria-expanded={advanced}
            >
              <Filter size={15} />
              Dates
            </button>
          </div>
        </div>
        <AnimatePresence initial={false}>{advanced && (
          <motion.div className="advanced-filters" initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.18}}>
            {[
              ["createdFrom", "Created from"],
              ["createdTo", "Created to"],
              ["dueFrom", "Due from"],
              ["dueTo", "Due to"],
            ].map(([key, title]) => (
              <label key={key}>
                {title}
                <input
                  type="date"
                  value={search.get(key) ?? ""}
                  onChange={(e) => filter(key, e.target.value)}
                />
              </label>
            ))}
          </motion.div>
        )}</AnimatePresence>
        {Array.from(search.keys()).some(key=>key!=="view") && <div className="filter-chips" aria-label="Active filters">{Array.from(search.entries()).filter(([key])=>key!=="view").map(([key,value])=><button key={key} className="filter-chip" onClick={()=>{filter(key,"");if(key==="q")setQ("")}} aria-label={`Remove ${key} filter`}><span>{({q:"Search",status:"Status",priority:"Priority",assigneeId:"Assignee",createdFrom:"Created from",createdTo:"Created to",dueFrom:"Due from",dueTo:"Due to"} as Record<string,string>)[key]??key}: {key==="assigneeId"?memberQuery.data?.find(m=>m.id===value)?.name??"Selected":label(value)}</span><X size={12}/></button>)}<button className="text-button" onClick={()=>{setQ("");setSearch(view?{view}:{})}}>Clear filters</button></div>}
        <div className="list-meta">
          <span>
            <ListFilter size={14} />
            {views[view] ?? "All work items"}
          </span>
          <span role="status">{items.isFetching ? "Updating results…" : "Sorted by newest created"}</span>
        </div>
        {items.isPending ? (
          <Loading rows={8} />
        ) : items.isError ? (
          <ErrorBox error={items.error} retry={() => void items.refetch()} />
        ) : items.data.items.length ? (
<>          <div className="table-scroll" inert={items.isPlaceholderData}>
            <table><caption className="sr-only">Work item results</caption>
              <thead>
                <tr>
                  <th>Work item</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assignee</th>
                  <th>Due date</th>
                  <th aria-label="Open item" />
                </tr>
              </thead>
              <tbody>
                {items.data.items.map((item,index) => (
                  <motion.tr key={item.id} initial={reduced?false:{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:.22,delay:reduced?0:Math.min(index,8)*.025}}>
                    <td>
                      <Link className="table-title" to={"/items/" + item.id}>
                        <span>
                          {shortId(item.id)}
                          <span>· {label(item.type)}</span>
                        </span>
                        <strong>{item.title}</strong>
                        <small>{item.teamName}</small>
                      </Link>
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>
                      <PriorityMark priority={item.priority} />
                    </td>
                    <td>
                      {item.assigneeName ? (
                        <span className="assignee-cell">
                          <Avatar name={item.assigneeName} />
                          <span>{item.assigneeName}</span>
                        </span>
                      ) : (
                        <span className="unassigned">
                          <UserRound size={14} />
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={overdue(item) ? "overdue-date" : "due-date"}
                      >
                        {overdue(item) && <Clock size={13} />}{" "}
                        {dueLabel(item.dueDate)}
                      </span>
                    </td>
                    <td>
                      <Link
                        className="icon-link"
                        aria-label={"Open " + item.title}
                        to={"/items/" + item.id}
                      >
                        <ChevronRight size={17} />
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div><div className="mobile-work-list" role="list" aria-label="Work item cards" inert={items.isPlaceholderData}>{items.data.items.map(item=><article key={item.id} role="listitem"><Link className="mobile-work-card" to={"/items/"+item.id} aria-label={"View "+item.title}><div className="mobile-work-top"><span className="item-id">{shortId(item.id)}</span><PriorityMark priority={item.priority}/></div><h3>{item.title}</h3><p>{item.teamName}</p><div className="mobile-work-bottom"><StatusBadge status={item.status}/><span className={overdue(item)?"overdue-date":"due-date"}>{dueLabel(item.dueDate)}</span></div><div className="mobile-work-owner">{item.assigneeName?<><Avatar name={item.assigneeName}/>{item.assigneeName}</>:<><UserRound size={13}/>Unassigned</>}<ChevronRight size={15}/></div></Link></article>)}</div></>
        ) : (
          <Empty title="No work matches these filters">
            Try a different search or clear your filters.
            <button
              className="text-button"
              onClick={() => {
                setQ("");
                setSearch({});
              }}
            >
              Clear filters
            </button>
          </Empty>
        )}
        <h2 className="sr-only" id="results-heading" tabIndex={-1}>Work items, page {page+1}</h2><nav className="pagination" aria-label="Work item pagination">
          <span aria-live="polite">
            {items.data?.items.length ?? 0} items on page {page + 1}
            <small> · Server-side pagination</small>
          </span>
          <div>
            <button
              className="button secondary small-button"
              disabled={page === 0 || items.isFetching}
              onClick={() => {focusPage.current=true;setCursors((c) => c.slice(0, -1))}}
            >
              <ChevronLeft size={15} />
              Previous
            </button>
            <button
              className="button secondary small-button"
              disabled={!items.data?.nextCursor || items.isFetching}
              onClick={() =>
                setCursors((c) => [...c, items.data?.nextCursor ?? undefined])
              }
            >
              Next
              <ChevronRight size={15} />
            </button>
          </div>
        </nav>
      </section>
    </PageEnter>
  );
}
function eventLabel(type: string) {
  return (
    (
      {
        CREATED: "created a work item",
        UPDATED: "updated the work details",
        CLAIMED: "claimed ownership",
        STATUS_CHANGED: "moved the work forward",
        APPROVED: "approved the resolution",
        REJECTED: "requested further work",
        COMMENTED: "added a comment",
      } as Record<string, string>
    )[type] ?? label(type)
  );
}
function relativeTime(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  if (elapsed < 60000) return "Just now";
  if (elapsed < 3600000) return Math.floor(elapsed / 60000) + "m ago";
  if (elapsed < 86400000) return Math.floor(elapsed / 3600000) + "h ago";
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}
export function Detail() {
  const { id } = useParams();
  const { user, teams } = useSession();
  const client = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState("");
  const itemQuery = useQuery({
    queryKey: ["item", id],
    queryFn: () => api<Item>("/items/" + id),
  });
  const item = itemQuery.data;
  const role = teams.find((t) => t.id === item?.teamId)?.role ?? "VIEWER";
  const activity = useInfiniteQuery({
    queryKey: ["activity", id],
    queryFn: ({ pageParam }) =>
      api<Page<Activity>>(
        "/items/" +
          id +
          "/activity?" +
          params({ cursor: pageParam, limit: 15 }),
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (p) => p.nextCursor ?? undefined,
    enabled: !!item,
  });
  const comments = useInfiniteQuery({
    queryKey: ["comments", id],
    queryFn: ({ pageParam }) =>
      api<Page<Comment>>(
        "/items/" +
          id +
          "/comments?" +
          params({ cursor: pageParam, limit: 10 }),
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (p) => p.nextCursor ?? undefined,
    enabled: !!item,
  });
  const mutation = useMutation({
    mutationFn: ({
      action,
      status,
    }: {
      action: "claim" | "transition" | "comments";
      status?: Status;
    }) =>
      api<Item>("/items/" + id + "/" + action, {
        method: "POST",
        body: JSON.stringify({
          version: item!.version,
          ...(status ? { status } : {}),
          ...(action === "comments" ? { body: comment } : {}),
        }),
      }),
    onSuccess: (result, variables) => {
      client.setQueryData(["item", id], result);
      void client.invalidateQueries();
      if (variables.action === "comments") setComment("");
      toast(
        variables.action === "comments"
          ? "Comment added"
          : variables.action === "claim"
            ? "You now own this work item"
            : "Workflow updated",
      );
    },
  });
  useEffect(() => {
    mutation.reset();
  }, [id]);
  if (itemQuery.isPending) return <Loading rows={6} />;
  if (itemQuery.isError)
    return (
      <ErrorBox
        error={itemQuery.error}
        retry={() => void itemQuery.refetch()}
      />
    );
  if (!item) return null;
  const editable =
    role !== "VIEWER" &&
    item.status !== "CLOSED" &&
    (isLead(role) || item.assigneeId === user.id);
  const actions = transitions(item, role, user.id);
  const conflict =
    mutation.error instanceof ApiError && mutation.error.status === 409;
  function refresh() {
    mutation.reset();
    setEditing(false);
    void client.invalidateQueries({ queryKey: ["item", id] });
    void client.invalidateQueries({ queryKey: ["activity", id] });
    void client.invalidateQueries({ queryKey: ["comments", id] });
  }
  return (
    <PageEnter>
      <Link className="back-link" to="/items">
        <ChevronLeft size={16} />
        Back to work items
      </Link>
      <div className="detail-heading">
        <div>
          <div className="detail-id">
            <span>{shortId(item.id)}</span>
            <span>·</span>
            {label(item.type)}
            <span>·</span>
            <motion.span className="version-tag" key={item.version} initial={{opacity:.5}} animate={{opacity:1}}>Version {item.version}</motion.span>
          </div>
          <h1>{item.title}</h1>
          <p>
            <Users size={14} />
            {item.teamName}
            <span>
              Created{" "}
              {new Date(item.createdAt).toLocaleDateString("en", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </p>
        </div>
        {editable && (
          <button className="button secondary" onClick={() => setEditing(true)}>
            <Pencil size={15} />
            Edit item
          </button>
        )}
      </div>
      <ol className="workflow-rail" aria-label="Workflow progress">{statuses.map((status,index)=>{const current=statuses.indexOf(item.status);return <li key={status} aria-current={item.status===status?"step":undefined} className={index<current?"passed":index===current?"current":"upcoming"}><span>{index<current?<CheckCheck size={13}/>:index+1}</span><strong>{label(status)}</strong></li>})}</ol>
      {mutation.isError && <ErrorBox error={mutation.error} retry={refresh} />}
      <div className="detail-grid">
        <div className="detail-main">
          <section className="panel description-panel">
            <div className="panel-header">
              <h3>Context & description</h3>
              <Flag size={16} />
            </div>
            <div className="description">
              {item.description || "No additional context has been added yet."}
            </div>
          </section>
          <section className="panel comments-panel">
            <div className="panel-header">
              <div className="panel-title">
                <MessageSquare size={17} />
                <h3>Team conversation</h3>
              </div>
              <span className="subtle-pill">Shared context</span>
            </div>
            {comments.isPending ? (
              <Loading rows={2} />
            ) : comments.isError ? (
              <ErrorBox
                error={comments.error}
                retry={() => void comments.refetch()}
              />
            ) : comments.data?.pages.flatMap((p) => p.items).length ? (
              <div className="comment-list"><AnimatePresence initial={false}>
                {comments.data.pages.flatMap(p=>p.items).map(c=><motion.div key={c.id} className="comment" initial={{opacity:0,y:9}} animate={{opacity:1,y:0}} transition={{duration:.22}}>
                  <Avatar name={c.actorName}/><div><p><strong>{c.actorName}</strong><time>{relativeTime(c.createdAt)}</time></p><div>{c.body}</div></div>
                </motion.div>)}
              </AnimatePresence></div>
            ) : (
              <div className="conversation-empty">
                <MessageSquare size={22} />
                <p>Keep the context close to the work.</p>
                <small>Share an update or leave a note for your team.</small>
              </div>
            )}
            {comments.hasNextPage && (
              <button
                className="text-button load-more"
                onClick={() => void comments.fetchNextPage()}
                disabled={comments.isFetchingNextPage}
              >
                Load older comments
              </button>
            )}
            {role !== "VIEWER" && item.status !== "CLOSED" && (
              <form
                className="comment-form" aria-busy={mutation.isPending && mutation.variables?.action==="comments"}
                onSubmit={(e) => {
                  e.preventDefault();
                  mutation.mutate({ action: "comments" });
                }}
              >
                <Avatar name={user.name} />
                <div>
                  <textarea
                    aria-label="Add a comment" disabled={mutation.isPending && mutation.variables?.action==="comments"}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share an update with the team…"
                    maxLength={4000}
                    required
                  />
                  <div>
                    <span className="comment-hint">Visible to your team<span className={comment.length>3800?"near-limit":""} aria-label={`${4000-comment.length} characters remaining`}>{comment.length.toLocaleString()} / 4,000</span></span>
                    <button
                      className="button primary small-button"
                      disabled={
                        !comment.trim() || mutation.isPending || conflict
                      }
                    >
                      {mutation.isPending ? <Spinner /> : <Send size={14} />}
                      Post comment
                    </button>
                  </div>
                </div>
              </form>
            )}
          </section>
          <section className="panel timeline-panel">
            <div className="panel-header">
              <div className="panel-title">
                <ActivityIcon size={17} />
                <h3>Activity history</h3>
              </div>
              <span className="subtle-pill">
                <ShieldCheck size={12} />
                Append-only
              </span>
            </div>
            {activity.isPending ? (
              <Loading />
            ) : activity.isError ? (
              <ErrorBox
                error={activity.error}
                retry={() => void activity.refetch()}
              />
            ) : (
              <div className="timeline">
                {activity.data?.pages
                  .flatMap((p) => p.items)
                  .map((e) => (
                    <motion.div
                      key={e.id}
                      className="timeline-event"
                      initial={{ opacity: 0, y:8 }}
                      animate={{ opacity: 1, y:0 }}
                      transition={{duration:.22}}
                    >
                      <EventGlyph type={e.eventType}/>
                      <div>
                        <p>
                          <strong>{e.actorName}</strong>{" "}
                          {eventLabel(e.eventType)}
                        </p>
                        {!!e.details.from && !!e.details.to && (
                          <div className="timeline-change">
                            {label(String(e.details.from))}
                            <ArrowRight size={12} />
                            {label(String(e.details.to))}
                          </div>
                        )}
                        {e.eventType === "UPDATED" && (
                          <small>
                            Details, ownership, or priority updated. Version
                            recorded.
                          </small>
                        )}
                        <time>{new Date(e.createdAt).toLocaleString()}</time>
                        <details className="event-details">
                          <summary>View recorded changes</summary>
                          <pre>{JSON.stringify(e.details, null, 2)}</pre>
                        </details>
                      </div>
                    </motion.div>
                  ))}
              </div>
            )}
            {activity.hasNextPage && (
              <button
                className="text-button load-more"
                onClick={() => void activity.fetchNextPage()}
                disabled={activity.isFetchingNextPage}
              >
                Load older activity
              </button>
            )}
          </section>
        </div>
        <aside className="detail-aside">
          <motion.section className="panel properties" initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} transition={{duration:.28}}>
            <div className="panel-header">
              <h3>Work item properties</h3>
              <MoreHorizontal size={17} />
            </div>
            <dl>
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusBadge status={item.status} />
                </dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd>
                  <PriorityMark priority={item.priority} />
                </dd>
              </div>
              <div>
                <dt>Assignee</dt>
                <dd>
                  {item.assigneeName ? (
                    <span className="assignee-cell">
                      <Avatar name={item.assigneeName} />
                      {item.assigneeName}
                    </span>
                  ) : (
                    <span className="unassigned">
                      <UserRound size={14} />
                      Unassigned
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Team</dt>
                <dd><span className="property-team-dot"/>{item.teamName}</dd>
              </div>
              <div>
                <dt>Due date</dt>
                <dd className={overdue(item) ? "overdue-date" : ""}>
                  <Calendar size={14} />
                  {dueLabel(item.dueDate)}
                </dd>
              </div>
              <div>
                <dt>Your role</dt>
                <dd>{label(role)}</dd>
              </div>
            </dl>
          </motion.section>
          <section className="panel next-step">
            <span className="eyebrow">THE NEXT MOVE</span>
            <h3>
              {item.status === "CLOSED"
                ? "All wrapped up."
                : item.status === "AWAITING_APPROVAL"
                  ? "A moment for review."
                  : !item.assigneeId
                    ? "Give this work an owner."
                    : "Keep the momentum."}
            </h3>
            <p>
              {item.status === "CLOSED"
                ? "This record is preserved for your team."
                : item.status === "AWAITING_APPROVAL"
                  ? "A team lead can approve the resolution or request more work."
                  : !item.assigneeId
                    ? "Claim this item to take responsibility and start moving it forward."
                    : "Each step keeps your team aligned and leaves a clear trail."}
            </p>
            {role !== "VIEWER" &&
              !item.assigneeId &&
              item.status === "OPEN" && (
                <button
                  className="button primary full"
                  disabled={mutation.isPending || conflict}
                  onClick={() => mutation.mutate({ action: "claim" })}
                >
                  <UserRound size={15} />
                  Claim this item
                </button>
              )}
            {actions.map((status) => (
              <button
                key={status}
                className={
                  "button full " +
                  (status === "IN_PROGRESS" &&
                  item.status === "AWAITING_APPROVAL"
                    ? "secondary"
                    : "primary")
                }
                disabled={mutation.isPending || conflict}
                onClick={() =>
                  mutation.mutate({ action: "transition", status })
                }
              >
                {mutation.isPending ? (
                  <Spinner />
                ) : status === "RESOLVED" ? (
                  <ShieldCheck size={15} />
                ) : (
                  <ArrowRight size={15} />
                )}
                {
                  {
                    IN_PROGRESS:
                      item.status === "AWAITING_APPROVAL"
                        ? "Request more work"
                        : "Start work",
                    AWAITING_APPROVAL: "Submit for approval",
                    RESOLVED: "Approve resolution",
                    CLOSED: "Close item",
                    OPEN: "Open",
                  }[status]
                }
              </button>
            ))}
            {role === "VIEWER" && (
              <span className="read-only">
                <ShieldCheck size={14} />
                You have read-only access
              </span>
            )}
          </section>
          <div className="audit-note">
            <ShieldCheck size={18} />
            <p>
              Every important change is recorded with the actor, time, and
              version.
            </p>
          </div>
        </aside>
      </div>
      <ItemForm
        open={editing}
        onOpenChange={setEditing}
        item={item}
        onSaved={(result) => {
          client.setQueryData(["item", id], result);
          setEditing(false);
          toast("Changes saved");
        }}
      />
    </PageEnter>
  );
}
