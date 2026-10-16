import {
useInfiniteQuery,
useMutation,
useQuery,
useQueryClient,
} from "@tanstack/react-query";
import {
Activity as ActivityIcon,
ArrowRight,
Calendar,
CheckCheck,
ChevronLeft,
Flag,
MessageSquare,
MoreHorizontal,
Pencil,
Send,
ShieldCheck,
UserRound,
Users,
} from "lucide-react";
import { AnimatePresence,motion } from "motion/react";
import { useEffect,useState } from "react";
import { Link,useParams } from "react-router-dom";
import {
api,
ApiError,
isLead,
label,
params,
statuses,
transitions,
type Activity,
type Comment,
type Item,
type Page,
type Status,
} from "../api";
import { AuditChanges,EventGlyph } from "../events";
import { ItemForm } from "../forms";
import { useSession } from "../session";
import {
Avatar,
dueLabel,
ErrorBox,
Loading,
overdue,
PageEnter,
PriorityMark,
shortId,
Spinner,
StatusBadge,
useToast,
} from "../ui";

import { eventLabel,relativeTime } from "../event-text";
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
            <motion.span
              className="version-tag"
              key={item.version}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
            >
              Version {item.version}
            </motion.span>
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
      <ol className="workflow-rail" aria-label="Workflow progress">
        {statuses.map((status, index) => {
          const current = statuses.indexOf(item.status);
          return (
            <li
              key={status}
              aria-current={item.status === status ? "step" : undefined}
              className={
                index < current
                  ? "passed"
                  : index === current
                    ? "current"
                    : "upcoming"
              }
            >
              <span>
                {index < current ? <CheckCheck size={13} /> : index + 1}
              </span>
              <strong>{label(status)}</strong>
            </li>
          );
        })}
      </ol>
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
              <div className="comment-list">
                <AnimatePresence initial={false}>
                  {comments.data.pages
                    .flatMap((p) => p.items)
                    .map((c) => (
                      <motion.div
                        key={c.id}
                        className="comment"
                        initial={{ opacity: 0, y: 9 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22 }}
                      >
                        <Avatar name={c.actorName} />
                        <div>
                          <p>
                            <strong>{c.actorName}</strong>
                            <time>{relativeTime(c.createdAt)}</time>
                          </p>
                          <div>{c.body}</div>
                        </div>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
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
                className="comment-form"
                aria-busy={
                  mutation.isPending &&
                  mutation.variables?.action === "comments"
                }
                onSubmit={(e) => {
                  e.preventDefault();
                  mutation.mutate({ action: "comments" });
                }}
              >
                <Avatar name={user.name} />
                <div>
                  <textarea
                    aria-label="Add a comment"
                    disabled={
                      mutation.isPending &&
                      mutation.variables?.action === "comments"
                    }
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share an update with the team…"
                    maxLength={4000}
                    required
                  />
                  <div>
                    <span className="comment-hint">
                      Visible to your team
                      <span
                        className={comment.length > 3800 ? "near-limit" : ""}
                        aria-label={`${4000 - comment.length} characters remaining`}
                      >
                        {comment.length.toLocaleString()} / 4,000
                      </span>
                    </span>
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
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22 }}
                    >
                      <EventGlyph type={e.eventType} />
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
                        <AuditChanges details={e.details} />
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
          <motion.section
            className="panel properties"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28 }}
          >
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
                <dd>
                  <span className="property-team-dot" />
                  {item.teamName}
                </dd>
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
