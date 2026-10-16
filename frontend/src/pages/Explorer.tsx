import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  ListFilter,
  Plus,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, label, priorities, statuses, type Member } from "../api";
import { motionTokens } from "../motion";
import { useMotionPreference } from "../motion-preferences";
import { useSession } from "../session";
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
  StatusBadge,
} from "../ui";

import { useItems } from "../queries";
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
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      const active = document.activeElement;
      const typing = active?.matches(
        "input,textarea,select,[contenteditable=true]",
      );
      if (
        event.key === "/" &&
        !typing &&
        !document.querySelector('[role="dialog"]')
      ) {
        event.preventDefault();
        searchInput.current?.focus();
      }
      if (event.key === "Escape" && active === searchInput.current) setQ("");
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
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
  const items = useItems(values, true);
  const focusPage = useRef(false);
  useEffect(() => {
    if (focusPage.current && !items.isFetching) {
      focusPage.current = false;
      document.getElementById("results-heading")?.focus();
    }
  }, [items.isFetching, page]);
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
      <LayoutGroup id="work-views">
        <div className="view-tabs">
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
              {view === value && (
                <motion.span
                  className="tab-indicator"
                  layoutId="work-view"
                  transition={motionTokens.spring}
                />
              )}
            </button>
          ))}
        </div>
      </LayoutGroup>
      <section
        className="panel explorer"
        aria-busy={items.isFetching}
        data-updating={items.isPlaceholderData}
      >
        <div className="filter-bar">
          <div className="search-field">
            <Search size={17} />
            <input
              ref={searchInput}
              aria-label="Search work items"
              placeholder="Search work items…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {!q && (
              <kbd className="search-shortcut" aria-hidden="true">
                /
              </kbd>
            )}
            {q && (
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
        <AnimatePresence initial={false}>
          {advanced && (
            <motion.div
              className="advanced-filters"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: motionTokens.fast }}
            >
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
          )}
        </AnimatePresence>
        {Array.from(search.keys()).some((key) => key !== "view") && (
          <div className="filter-chips" aria-label="Active filters">
            {Array.from(search.entries())
              .filter(([key]) => key !== "view")
              .map(([key, value]) => (
                <button
                  key={key}
                  className="filter-chip"
                  onClick={() => {
                    filter(key, "");
                    if (key === "q") setQ("");
                  }}
                  aria-label={`Remove ${key} filter`}
                >
                  <span>
                    {(
                      {
                        q: "Search",
                        status: "Status",
                        priority: "Priority",
                        assigneeId: "Assignee",
                        createdFrom: "Created from",
                        createdTo: "Created to",
                        dueFrom: "Due from",
                        dueTo: "Due to",
                      } as Record<string, string>
                    )[key] ?? key}
                    :{" "}
                    {key === "assigneeId"
                      ? (memberQuery.data?.find((m) => m.id === value)?.name ??
                        "Selected")
                      : label(value)}
                  </span>
                  <X size={12} />
                </button>
              ))}
            <button
              className="text-button"
              onClick={() => {
                setQ("");
                setSearch(view ? { view } : {});
              }}
            >
              Clear filters
            </button>
          </div>
        )}
        <div className="list-meta">
          <span>
            <ListFilter size={14} />
            {views[view] ?? "All work items"}
          </span>
          <span role="status">
            {items.isFetching
              ? "Updating results…"
              : "Sorted by newest created"}
          </span>
        </div>
        {items.isPending ? (
          <Loading rows={8} />
        ) : items.isError ? (
          <ErrorBox error={items.error} retry={() => void items.refetch()} />
        ) : items.data.items.length ? (
          <>
            {" "}
            <div className="table-scroll" inert={items.isPlaceholderData}>
              <table>
                <caption className="sr-only">Work item results</caption>
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
                  {items.data.items.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      initial={reduced ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: motionTokens.control,
                        delay: reduced ? 0 : Math.min(index, 8) * 0.025,
                      }}
                    >
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
                          className={
                            overdue(item) ? "overdue-date" : "due-date"
                          }
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
            </div>
            <div
              className="mobile-work-list"
              role="list"
              aria-label="Work item cards"
              inert={items.isPlaceholderData}
            >
              {items.data.items.map((item) => (
                <article key={item.id} role="listitem">
                  <Link
                    className="mobile-work-card"
                    to={"/items/" + item.id}
                    aria-label={"View " + item.title}
                  >
                    <div className="mobile-work-top">
                      <span className="item-id">{shortId(item.id)}</span>
                      <PriorityMark priority={item.priority} />
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.teamName}</p>
                    <div className="mobile-work-bottom">
                      <StatusBadge status={item.status} />
                      <span
                        className={overdue(item) ? "overdue-date" : "due-date"}
                      >
                        {dueLabel(item.dueDate)}
                      </span>
                    </div>
                    <div className="mobile-work-owner">
                      {item.assigneeName ? (
                        <>
                          <Avatar name={item.assigneeName} />
                          {item.assigneeName}
                        </>
                      ) : (
                        <>
                          <UserRound size={13} />
                          Unassigned
                        </>
                      )}
                      <ChevronRight size={15} />
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </>
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
        <h2 className="sr-only" id="results-heading" tabIndex={-1}>
          Work items, page {page + 1}
        </h2>
        <nav className="pagination" aria-label="Work item pagination">
          <span aria-live="polite">
            {items.data?.items.length ?? 0} items on page {page + 1}
            <small> · Server-side pagination</small>
          </span>
          <div>
            <button
              className="button secondary small-button"
              disabled={page === 0 || items.isFetching}
              onClick={() => {
                focusPage.current = true;
                setCursors((c) => c.slice(0, -1));
              }}
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
