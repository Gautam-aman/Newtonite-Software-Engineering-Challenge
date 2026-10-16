# Engineering decisions

## 1. A modular monolith with explicit SQL
**Context:** A reviewer must understand correctness in a short demo.
**Options considered:** Microservices; JPA everywhere; one Spring Boot service with JDBC.
**Decision:** Package by responsibility in one Java 21 service; use Spring JDBC throughout.
**Reasoning:** SQL exposes row predicates, locking and stable ordering directly.
**Trade-offs:** More explicit mapping; fewer ORM conveniences.
**Consequences:** One deployment and transaction boundary; no distributed consistency claims.

## 2. PostgreSQL owns invariants
**Context:** Concurrency cannot depend on a single JVM.
**Options considered:** In-memory locks; application checks; database constraints and transactions.
**Decision:** Flyway migrations, foreign keys, domain checks and database transactions.
**Reasoning:** Multiple processes share the same integrity rules.
**Trade-offs:** PostgreSQL-specific SQL and real database tests.
**Consequences:** No H2 approximation or Hibernate schema updates.


## 3. Atomic claims are a database compare-and-set
**Context:** Two clients may claim the same unassigned work simultaneously.
**Options considered:** JVM synchronization; SELECT followed by unconditional UPDATE; conditional UPDATE.
**Decision:** `UPDATE ... WHERE id=? AND version=? AND assignee_id IS NULL AND status='OPEN'`.
**Reasoning:** PostgreSQL rechecks the predicate after concurrent row locking. Exactly one update can affect a row.
**Trade-offs:** A losing client gets 409 and must reload; no automatic retry that might hide ownership changes.
**Consequences:** The version increases once, and the winning transaction inserts exactly one CLAIMED event. The concurrency test asserts all four facts.

## 4. Version checks and short row locks
**Context:** Edits, comments and transitions can collide with each other.
**Options considered:** Last write wins; JPA versioning; explicit expected versions.
**Decision:** Required nonnegative versions on every mutation. Edit/transition/comment lock the row, authorize, compare versions, then update with a version predicate. Claims use a single conditional update.
**Reasoning:** The lock stabilizes fields used for owner and workflow decisions; the version rejects a stale client after waiting for the lock.
**Trade-offs:** Contention on one hot item serializes its writers. Transactions contain only database work.
**Consequences:** 409 responses leave newer content and history intact. Comments also advance the item version. The UI preserves the failed action and offers an explicit refresh; it does not optimistically claim success.

## 5. Durable, transactional idempotency
**Context:** A create response may be lost after the database committed.
**Options considered:** Disable the submit button only; in-memory cache; a PostgreSQL reservation/result record.
**Decision:** Require `Idempotency-Key`, scope by user and create operation, hash the typed request and store the original complete response as JSONB in the same transaction.
**Reasoning:** A transaction-scoped advisory lock on the scoped key serializes simultaneous retries; the composite primary key remains the identity boundary. Hash collisions only cause extra serialization.
**Trade-offs:** PostgreSQL-specific locking; no retention cleanup in this demo. Replays return the original snapshot, even if the item has since changed.
**Consequences:** Same key/body creates once; a changed body returns 409. Failed transactions release the lock and leave no reservation. The UI retains its key for unchanged retries and rotates it after payload edits. Successful responses have the same 201 status and Location for initial and replay requests.

## 6. Team authorization is centralized and resource scoped
**Context:** The same person may be a Lead in one team and Member in another.
**Options considered:** Global user roles; frontend-only controls; membership checks per resource.
**Decision:** `TeamAccess` loads the current membership for each protected action. Collection queries include a membership predicate. Assignees have a composite membership foreign key.
**Reasoning:** Altering a URL or browser state cannot grant access to another team.
**Trade-offs:** A small indexed membership query per action. Memberships are seeded; no concurrent membership-management feature is exposed.
**Consequences:** No cross-team superuser. Lead/Admin capabilities apply only to their own teams. A forbidden existing resource returns 403; an unknown ID returns 404. IDs are not treated as secrets.

| Action | Viewer | Member | Lead / Admin |
| --- | --- | --- | --- |
| Read own-team items, comments, history | Yes | Yes | Yes |
| Create, claim OPEN unassigned items, comment | No | Yes | Yes |
| Edit title, description, type, due date | No | Assigned to self | Any team item |
| Reassign or change priority | No | No | Yes |
| Start work, submit, close resolved work | No | Assigned to self | Any team item |
| Approve / reject awaiting work | No | No | Yes |
| Mutate CLOSED work | No | No | No |

Assumptions: no independent two-person approval requirement; a Lead may approve their own assigned work. Reject means return to IN_PROGRESS. No reopen/delete path; closure preserves the record. Admin is equivalent to Lead in this deliberately scoped product. There are no administrative user/team provisioning endpoints.

## 7. History shares the mutation transaction
**Context:** A state change without its history undermines accountability.
**Options considered:** Best-effort logging after commit; asynchronous history; synchronous transactional insertion.
**Decision:** Every successful item mutation writes an activity event before commit. Edits include complete before/after snapshots; transitions record from/to/version; claim records owner/version; comments retain the message.
**Reasoning:** Database failure cannot commit an item without its corresponding history.
**Trade-offs:** Extra synchronous storage and write cost. Database owner privileges could disable triggers; this is not a cryptographically tamper-proof compliance log.
**Consequences:** UPDATE/DELETE on activity is blocked by a database trigger. An injected audit insertion failure test proves both item and idempotency state roll back. No generic audit mutation API exists.

## 8. Stable keyset pagination and targeted indexes
**Context:** Thousands of items should not be loaded into browser memory or skipped by deep OFFSET scans.
**Options considered:** Client filtering; OFFSET; keyset ordering.
**Decision:** Items order by `(created_at DESC, id DESC)` with an opaque base64 cursor containing both values; page sizes are 1–100. Creation timestamps are immutable. History/comments paginate by descending sequence ID.
**Reasoning:** The ID breaks timestamp ties; edits do not reshuffle item ordering.
**Trade-offs:** Sequential next/previous navigation rather than random page jumps; a cursor is not a snapshot of an ever-changing collection. Newer inserts appear after refreshing page one.
**Consequences:** Team/created, team/status/created, team/priority/created and assignee/created B-trees support major queues. A partial team/due-date index supports overdue work. A trigram GIN index supports title+description substring search; tiny searches and combined filters may still need scans/sorts. PostgreSQL chooses plans; no benchmarked throughput guarantee is claimed. Activity and comments have `(item_id,id DESC)` indexes.

## 9. Opaque expiring bearer sessions
**Context:** Seeded accounts need simple revocable authentication without external infrastructure.
**Options considered:** HTTP Basic per request; JWT; opaque sessions; cookie-based sessions.
**Decision:** BCrypt passwords, 32-byte random bearer tokens, SHA-256 token hashes in PostgreSQL, eight-hour expiry and logout revocation. Tokens stay in React memory.
**Reasoning:** No signing secret, bearer token persistence or cookie-CSRF surface. Current memberships are checked on every resource request.
**Trade-offs:** Reload requires login; each API call looks up its token. No rate limiting, password recovery, refresh tokens, SSO, session cleanup job or MFA is implemented.
**Consequences:** Demo credentials are explicitly public development data. Disable seed data for any non-demo setup, provision real users separately, require HTTPS, and add abuse controls before exposing the service publicly.

## 10. Deliberate scope boundaries
**Context:** Correctness and explainability are more valuable than a broad feature checklist.
**Options considered:** Outbox/email, websockets, full administration, hard deletion, deployment.
**Decision:** Deliver the complete synchronous work lifecycle, real dashboard, pagination, tests and local startup. Defer these additions.
**Reasoning:** There is no external side effect requiring a worker in the implemented product.
**Trade-offs:** No notifications, attachments, realtime push, undo/reopen, provisioning UI or worker recovery demo.
**Consequences:** The application never promises delivery of background work. An outbox would be the next feature only when notifications become a product requirement: insert within the mutation transaction; claim with SKIP LOCKED; lease/retry with bounded backoff and idempotent consumer records.

## 11. A focused frontend experience upgrade
**Context:** The initial functional UI needed stronger hierarchy and clearer interaction feedback.
**Decision:** Add tokenized dark/light themes and shared motion primitives using the existing stack. Preserve all backend and API semantics; display real server state. Lazy-load pages and the form editor to bound entry cost.
**Trade-offs:** Route chunks require loading and recovery states. Motion respects the OS by default, with an explicit persisted workspace override. DOM-focused regression tests complement actual browser inspection; they do not measure animation frame rate.
**Consequences:** Phone cards replace the wide table below 600px. Drawers and editors trap and restore focus; route focus never resets on a search refetch. See docs/UI_REDESIGN.md for validation and evidence.
