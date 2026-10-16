# NewtonOps delivery report

## A. What was built

A connected Java/Spring and React operations workspace in the user's existing public GitHub repository. The core P0 slice is implemented: authentication, teams/roles, resource authorization, work creation/read/update/closure, filtering/keyset pagination, workflow/approval, atomic claims, expected versions, create idempotency, transactional history, comments, real dashboard metrics, tests and one-command Compose startup. The UI includes responsive navigation, validated dialogs, loading/empty/error states, subtle motion, reduced-motion support and explicit conflict refresh.

## B. Architecture

React 19/strict TypeScript/Vite uses TanStack Query for server state, Router for navigation, React Hook Form/Zod for forms and Radix/Motion for interaction. Nginx serves the build and proxies a Spring Boot 3.5/Java 21 modular monolith. Spring Security authenticates expiring opaque bearer sessions whose hashes live in PostgreSQL. `TeamAccess` centralizes team permissions. Explicit JDBC replaces the suggested JPA layer so the SQL predicates and transactions are inspectable. Flyway creates normalized tables, constraints, indexes and the audit immutability trigger. Mutation and audit insertion share one transaction.

## C. Completion and scope

The complete synchronous product is implemented. CRUD deletion is deliberately modeled as workflow closure; no delete/reopen endpoint exists. Admin has team-local Lead capabilities. Approvers may approve their own assigned work; independent two-person approval was not assumed. No worker or outbox is implemented because the product sends no external notifications. Signup, provisioning/admin screens, attachments, SSO, notifications, dark/light switching, hosting and video remain excluded. These choices are documented rather than represented as complete features.

## D. Evidence

Fresh remote checkout tested: **32792ed93da99c24cedaaf7030c476516010578d**.

| Executed command/check | Observed result |
| --- | --- |
| `./scripts/test.sh` from fresh clone, with Colima socket environment | 22 backend tests, 8 frontend tests, formatting and production build passed |
| `./backend/mvnw -f backend/pom.xml verify spotless:check` | Passed on PostgreSQL 16 Testcontainers; 0 test failures/errors/skips |
| `docker compose -p newtonops-review up --build -d --wait --wait-timeout 180` | All three services healthy, new empty DB volume initialized |
| `python3 scripts/smoke.py` from fresh clone through Nginx | Passed login, replay, authorization, claim conflict, workflow, comment, approval, closure, history, metrics and logout |
| 5,000-item bulk seed, executed twice | Second run inserted zero items/events |
| Cursor traversal with limit 100 | Exactly 5,000 unique bulk IDs across 50 pages |
| Live browser workflow | Member created/claimed/started/commented/submitted; Lead approved; final RESOLVED version 5 |
| GitHub Actions at dc93ba9 | Backend, frontend and Compose smoke all passed |
| Frontend runtime dependency audit | Zero reported at check time; not a comprehensive security claim |

Initial PostgreSQL 15 tests also passed. UI unit tests mock HTTP; the live smoke and PostgreSQL tests supply integration coverage. No standalone Playwright suite, exhaustive device/accessibility test, load benchmark or failover drill is claimed. Vite reports a successful-build bundle-size advisory (~194 kB gzip JavaScript). Full evidence and host setup notes are in [VERIFICATION.md](VERIFICATION.md).

## E. GitHub status

- Existing origin: https://github.com/Gautam-aman/Newtonite-Software-Engineering-Challenge.git
- Existing default branch: **main**; public repository; original commit retained.
- All implementation milestones were pushed normally; no force push/history rewrite.
- Runtime code revision: **dc93ba945d9453f3c536bb39de218191dcd235d5**.
- Fresh-clone verified revision including guides: **32792ed93da99c24cedaaf7030c476516010578d**.
- The final response supplies the final evidence commit hash and remote-head comparison. A commit cannot contain its own hash.

| Commit | Milestone |
| --- | --- |
| a3433b9 | Requirements, assumptions and engineering decisions |
| 521348c | Full-stack project/container foundation |
| 44e999e | Database, demo initialization, authentication and team access |
| 8d063b4 | Work APIs, workflow, concurrency, idempotency, history and PostgreSQL tests |
| 0ccbdab | Connected dashboard, explorer, details, forms and UX |
| cb66439 | UI tests, formatting, CI and bulk demonstration seed |
| dc93ba9 | Container readiness, public HTTP smoke, complete audit inspection and final contract tests |
| 32792ed | Complete README, decisions, API, demo and interview guides |

## F. Run it

```bash
git clone https://github.com/Gautam-aman/Newtonite-Software-Engineering-Challenge.git
cd Newtonite-Software-Engineering-Challenge
docker compose up --build
```

Open http://localhost:8088. Choose Member or Lead on the login page. Development password: **NewtonOps!2026**. The README contains all ten demo accounts, local development alternatives, test commands and bulk seed instructions. This host uses Colima and an isolated Docker client configuration to bypass a stale missing credential-helper setting; the repository needs no proprietary credentials.

## G. Demonstration

Follow [DEMO_GUIDE.md](../DEMO_GUIDE.md): show real dashboard queues; create fresh work as Member; claim, start, comment and submit; sign in as Lead and approve; show history; demonstrate an old-version edit rejection in two windows or run the actual concurrency test. The sequence is repeatable without deleting history.

## H. Interview preparation

The strongest defensible decisions are database compare-and-set claims, explicit versions, durable transactional idempotency, membership-scoped permissions, shared mutation/audit transactions and bounded keyset queries. [INTERVIEW_PREP.md](../INTERVIEW_PREP.md) gives code-matched explanations, failure cases, 10× scale discussion, likely live modifications and an exactly 100-word submission answer. Read and understand the code before declaring individual ownership in the employer form.

## I. Limits

No public security/availability/throughput guarantee. No rate limiting, session/idempotency cleanup scheduler, password recovery, MFA, HTTPS termination or production account management. Memory-only tokens require login on reload. Database owners can disable the audit trigger. Keyset pages are not a collection-wide snapshot and have no random-access page numbers. Small screens scroll the dense work table horizontally. P2 outbox and deployment are deliberately absent. The university PDF is advisory; no employer original brief or submission-form URL was provided.

## J. Readiness

**Ready for repository review and a local demonstration.** Core correctness, production build, isolated-database tests, Compose, fresh-clone startup and CI are verified. The candidate still needs to review/understand the implementation and personally submit the repository link and required identity details through the official form. No form was submitted, video uploaded or external site deployed automatically. The advisory target is 19 October 2026, 9:30 AM IST, ahead of its 10:00 AM IST deadline.
