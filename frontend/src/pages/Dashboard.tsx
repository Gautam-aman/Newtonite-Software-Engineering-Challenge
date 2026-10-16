import { useQuery } from "@tanstack/react-query";
import {
Activity as ActivityIcon,
ArrowRight,
ArrowUpRight,
Calendar,
CheckCheck,
ChevronRight,
CircleDashed,
Clock,
ListFilter,
Plus,
RefreshCw,
ShieldCheck,
Sparkles,
UserRound,
Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect,useState } from "react";
import { Link } from "react-router-dom";
import { api,label,params,statuses,type Item,type Summary } from "../api";
import { EventGlyph } from "../events";
import { AnimatedNumber,Stagger,StaggerItem } from "../motion";
import { useSession } from "../session";
import {
Empty,
ErrorBox,
Loading,
PageEnter,
PriorityMark,
shortId,
} from "../ui";

import { eventLabel,relativeTime } from "../event-text";
import { useItems } from "../queries";
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
        <Empty
          title={
            view === "approvals"
              ? "No reviews waiting"
              : view === "urgent"
                ? "Urgent work has an owner"
                : view === "mine"
                  ? "Your queue is clear"
                  : "No overdue work"
          }
        >
          {view === "approvals"
            ? "No work is awaiting your team lead review."
            : view === "mine"
              ? "Pick up an unassigned item when you’re ready."
              : "Your team is up to date. New work will appear here."}
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
  const [recentLimit, setRecentLimit] = useState(5);
  useEffect(() => setRecentLimit(5), [teamId]);
  const metrics = summary.data?.metrics;
  const now = new Date();
  const canCreate = teams.some(
    (t) => (!teamId || t.id === teamId) && t.role !== "VIEWER",
  );
  const cards = [
    {
      label: "Active work",
      tone: "accent",
      value: metrics?.active,
      detail: "Across your workspace",
      icon: ListFilter,
      view: "",
    },
    {
      label: "Assigned to me",
      tone: "info",
      value: metrics?.mine,
      detail: "Your next moves",
      icon: UserRound,
      view: "mine",
    },
    {
      label: "Urgent & unassigned",
      tone: "warning",
      value: metrics?.urgent,
      detail: "Ready for an owner",
      icon: Zap,
      view: "urgent",
    },
    {
      label: "Awaiting my approval",
      tone: "success",
      value: metrics?.approvals,
      detail: "Your review makes progress",
      icon: ShieldCheck,
      view: "approvals",
    },
    {
      label: "Overdue work",
      value: metrics?.overdue,
      detail: "Past their due date",
      icon: Clock,
      view: "overdue",
      tone: "danger",
    },
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
        <div className="overview-tools">
          <button
            className="button secondary small-button"
            onClick={() => void summary.refetch()}
            disabled={summary.isFetching}
            aria-label="Refresh overview"
          >
            <RefreshCw size={14} className={summary.isFetching ? "spin" : ""} />
            Refresh
          </button>
          <div className="date-label">
            <Calendar size={15} />
            {now.toLocaleDateString("en", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
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
                className="metric-card"
                data-tone={card.tone}
                to={"/items" + (card.view ? "?view=" + card.view : "")}
              >
                <div className="metric-top">
                  <span>{card.label}</span>
                  <card.icon size={17} />
                </div>
                <div className="metric-value">
                  {summary.isPending ? (
                    <span className="skeleton metric-skeleton" />
                  ) : card.value === undefined ? (
                    "—"
                  ) : (
                    <AnimatedNumber value={card.value} />
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
        <StaggerItem>
          <Queue
            title="Assigned to me"
            subtitle="Move your work forward"
            view="mine"
            icon={UserRound}
          />
        </StaggerItem>
        <StaggerItem>
          <Queue
            title="Urgent & unassigned"
            subtitle="High-impact work that needs an owner"
            view="urgent"
            icon={Zap}
          />
        </StaggerItem>
        <StaggerItem>
          <Queue
            title="Awaiting approval"
            subtitle="Review, resolve, and keep things moving"
            view="approvals"
            icon={ShieldCheck}
          />
        </StaggerItem>
        <StaggerItem>
          <Queue
            title="Overdue items"
            subtitle="A little attention goes a long way"
            view="overdue"
            icon={Clock}
          />
        </StaggerItem>
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
                <StaggerItem key={e.id}>
                  <Link
                    to={"/items/" + e.item_id}
                    key={e.id}
                    className="recent-event"
                  >
                    <EventGlyph type={e.event_type} />
                    <div>
                      <p>
                        <strong>{e.actor_name}</strong>{" "}
                        {eventLabel(e.event_type)}
                      </p>
                      <span>{e.title}</span>
                    </div>
                    <time>{relativeTime(e.created_at)}</time>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <Empty title="A fresh start">
              Team activity will appear here as work moves forward.
            </Empty>
          )}
          {summary.data && summary.data.recent.length > recentLimit && (
            <button
              className="text-button load-more"
              onClick={() => setRecentLimit(summary.data!.recent.length)}
            >
              Show all {summary.data.recent.length} recent events
              <ArrowRight size={13} />
            </button>
          )}
        </section>
        <section className="panel progress-panel">
          <span className="eyebrow">WORKSPACE PULSE</span>
          <h3>Progress, made visible.</h3>
          <p>A live snapshot of your team’s workflow.</p>
          {!summary.isPending && summary.data && (
            <div
              className="distribution-track"
              role="img"
              aria-label={summary.data.distribution
                .map((d) => `${label(d.status)}: ${d.count}`)
                .join(", ")}
            >
              {statuses.map((status) => {
                const count =
                  summary.data.distribution.find((d) => d.status === status)
                    ?.count ?? 0;
                const total = summary.data.distribution.reduce(
                  (sum, d) => sum + d.count,
                  0,
                );
                return count > 0 ? (
                  <motion.span
                    key={status}
                    className={status.toLowerCase()}
                    style={{
                      flexBasis: `${(count / Math.max(total, 1)) * 100}%`,
                    }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  />
                ) : null;
              })}
            </div>
          )}
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
