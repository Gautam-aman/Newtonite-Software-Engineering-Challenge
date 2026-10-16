# NewtonOps implementation checklist

Source reviewed: all eight pages of the university advisory dated 16 October 2026.
The original employer brief was not supplied. The advisory's stack, async worker,
video and form-creation instructions are recommendations/context, not commands to
create infrastructure or submit personal information. The user's mission defines
our scope; submission itself remains the candidate's action.

## Product assumptions
- Four team-local roles; no global superuser, registration, or team administration UI.
- Viewer reads; Member creates, claims, comments, edits own assigned work and moves it.
- Lead/Admin additionally edit any team item, reassign, reprioritize and approve/reject.
- Claim only unassigned OPEN work. Assignment must reference a current team member.
- OPEN -> IN_PROGRESS -> AWAITING_APPROVAL -> RESOLVED -> CLOSED.
- Lead rejection returns AWAITING_APPROVAL to IN_PROGRESS. No reopen or deletion:
  closing preserves accountability. CRUD means creation/read/update plus lifecycle closure.
- All item mutations require expected version, including comments. History is immutable.
- Idempotency keys are scoped by user and create operation, retained indefinitely for demo.
- A created item starts unassigned; team is immutable. Due dates use calendar dates.
- PostgreSQL is authoritative. Explicit JDBC transactions make conditional updates and
  audit insertion easy to inspect; JPA is deliberately omitted rather than mixed in without need.
- Opaque bearer sessions are stored hashed in PostgreSQL, expire after eight hours;
  browser keeps the token in memory. No paid/external authentication provider.

## Milestones
- [x] Read advisory; inspect/fetch existing main and origin; record assumptions.
- [x] Java 21 / Spring Boot, React strict TypeScript, Compose and Maven wrapper.
- [x] Flyway schema, demo users, authentication and team authorization.
- [x] Filtered/keyset work item API and consistent errors.
- [x] Transactional claim, versioning, idempotency, workflow, comments and audit.
- [x] Actual PostgreSQL concurrency/security integration tests.
- [x] Polished responsive frontend with real API data, accessible forms and motion.
- [x] UI tests and browser smoke test; production build.
- [x] README, decisions, demo and interview preparation.
- [ ] Final fresh-clone verification and remote-head confirmation.

Each coherent milestone is validated, committed and pushed to existing main.
Docker was absent initially; Docker/Compose and a named Colima VM were installed for
local validation. Both local PostgreSQL 15 and PostgreSQL 16 Testcontainers passed.
Full Compose and fresh-clone evidence is recorded in docs/VERIFICATION.md.
Outbox, notifications, theme switching and live deployment are deferred until core passes.
