# Verification record

Recorded on 16 October 2026. This document distinguishes executed checks from future work.

## Frontend redesign verification — 16 October 2026

This section supersedes the initial interface counts and bundle-size limitation below. Backend sources, migrations and `frontend/src/api.ts` have no changes from pre-redesign revision `1e9a9db`.

| Executed check | Observed result |
| --- | --- |
| `./scripts/test.sh` with the Colima environment below | 22 PostgreSQL backend tests, formatter, then-current 14 frontend tests and production build passed |
| Final expanded `npm test --prefix frontend` | 15 passed across 3 files, including route/search focus, preferences, drawer/editor focus and lazy editor dismissal |
| `npm run build --prefix frontend` | Strict TypeScript and production build passed; entry ~495 kB /158 kB gzip; editor and routes deferred; no chunk-size advisory |
| `docker compose up -d --build --no-deps frontend` | Rebuilt frontend; database, backend and frontend healthy at loopback port 8088 |
| `python3 scripts/smoke.py` through rebuilt Nginx | Passed authentication, idempotent replay, team boundary, claim conflict, complete workflow, comment, approval, closure, history, metrics and logout |
| Actual browser workflow | Created “Verify animated operations handoff”; Member claimed, started, commented, submitted; Lead approved; RESOLVED version 5 and approval audit visible |
| Actual responsive inspection | Login, dashboard, explorer, detail and create form at 1440, 1024, 768 and 390 CSS pixels; settled document widths matched viewport widths |
| Theme/motion inspection | Dark/light dashboard captured; OS Reduce Motion honored; explicit full-motion override demonstrated; in-flight transform observed |
| Fresh production browser console | No error entries during workflow inspection |
| GitHub Actions at `631e791` | [Run 38887449700](https://github.com/Gautam-aman/Newtonite-Software-Engineering-Challenge/actions/runs/38887449700) passed backend, frontend and Compose smoke |

The final editor focus refinement has its own 15-test validation. The final response identifies the final pushed revision and CI result. Source commits and evidence commits cannot embed their own hashes.

Screenshots: [dark dashboard](screenshots/dashboard.png), [light dashboard](screenshots/dashboard-light.png), [phone explorer](screenshots/items-mobile.png), [resolved workflow](screenshots/resolved-item.png). The phone capture includes the development inspection toolbar. This fixture uses a real iframe CSS viewport and visible width diagnostics; it is excluded from the production Vite entry. No generated mockups are used.

The responsive review fixed phone hero decoration overlap and temporary desktop margin interpolation at the mobile breakpoint. Keyboard regression checks fixed drawer focus restoration and editor focus across lazy loading. Automated UI tests mock HTTP; the live browser, HTTP smoke and PostgreSQL suite supply corresponding integration evidence. This is not a formal accessibility or cross-browser certification.

## Initial implementation verification (historical)

## Executed before the documentation milestone

| Check | Result |
| --- | --- |
| Java 21 compile/package with Maven Wrapper 3.9.11 | Passed |
| PostgreSQL 15 integration suite (local isolated database) | 20 passed; no failures/errors/skips at initial backend milestone |
| PostgreSQL 16 Testcontainers suite | Final expanded suite: 22 passed; 0 failures, errors or skips |
| `./scripts/test.sh` with Colima socket environment | Passed: then-current 21 backend tests, 8 frontend tests, formatter and production build |
| `./backend/mvnw verify spotless:check` after HTTP-contract expansion | 22 passed; formatter/package passed |
| `npm test --prefix frontend` | 8 passed; 0 failed |
| `npm run build --prefix frontend` | Strict TypeScript and Vite production build passed |
| `npm audit --prefix frontend --omit=dev` | 0 vulnerabilities reported at the check; not a complete security audit |
| Flyway initial schema on empty PostgreSQL 15 and 16 | Passed |
| Compose build and readiness | Database, backend and frontend healthy; loopback port 8088 |
| `python3 scripts/smoke.py` through Nginx at port 8088 | Passed complete authenticated public HTTP lifecycle |
| `SMOKE_BASE_URL=http://localhost:8080/api python3 scripts/smoke.py` | Passed directly against local backend |
| Bulk seed run twice | 5,000 initial item/event inserts; zero second-run inserts |
| API traversal of bulk seed with limit 100 | 5,000 unique IDs over 50 pages; no duplicate IDs |
| Browser smoke against live backend | Member creation, claim, start, comment, submit; Lead login and approval; resolved version 5 and audit verified |
| Screenshot | `docs/screenshots/resolved-item.png` and `docs/screenshots/dashboard.png`, captured from the actual browser |
| Initial GitHub Actions workflow | Backend and frontend jobs passed for cb66439 |
| `git diff --check` | Passed |

The suite contains real parallel PostgreSQL transactions, not mocked claim/idempotency behavior. The browser smoke was driven through the computer-use browser controls; no standalone Playwright test suite is claimed. Automated UI tests use mocked HTTP contracts; public HTTP smoke and database tests provide the corresponding live coverage.

The local host initially lacked Docker. Docker CLI/Compose and a named **Colima `newtonops`** VM were installed and used. An existing stale `docker-credential-desktop` setting prevented public pulls from this host's default Docker client configuration. Verification used a separate temporary `DOCKER_CONFIG` containing no credentials plus the Colima socket; the existing credential configuration was preserved. This is a host-specific setup detail, not a repository requirement.

Compose was exercised with:

```bash
DOCKER_CONFIG=/tmp/newtonops-docker-config \
DOCKER_HOST=unix://$HOME/.colima/newtonops/docker.sock \
docker compose up --build -d --wait --wait-timeout 180
```

Testcontainers was exercised with:

```bash
DOCKER_HOST=unix://$HOME/.colima/newtonops/docker.sock \
TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock \
./backend/mvnw -f backend/pom.xml verify spotless:check
```

## Original implementation fresh-checkout verification

**Passed against remote revision `32792ed93da99c24cedaaf7030c476516010578d`.**

- Cloned the existing public GitHub repository into a new directory, separate from the working checkout.
- Ran the documented `./scripts/test.sh` from that clone: **22 backend tests passed**, zero failures/errors/skips; **8 frontend tests passed**; formatting and production build passed. This included `npm ci` from the committed lockfile and a fresh PostgreSQL 16 Testcontainer.
- Started the cloned source as Compose project `newtonops-review` with a newly created PostgreSQL volume: `docker compose -p newtonops-review up --build -d --wait --wait-timeout 180` (with the host-specific Docker environment above).
- All three services became healthy. Initial Flyway migration and demo initialization succeeded on the empty database.
- Ran `python3 scripts/smoke.py` from the clone through Nginx on port 8088: **passed**.
- The clone remained clean (`git status --short` produced no output).
- GitHub Actions run [38874335900](https://github.com/Gautam-aman/Newtonite-Software-Engineering-Challenge/actions/runs/38874335900) passed backend, frontend and Compose smoke for code revision `dc93ba9`. The documentation revision adds no runtime code.
- Reviewed tracked paths for `.env`, build output, node_modules, logs and TypeScript build caches: none committed. A targeted scan found no common GitHub/OpenAI token or private-key patterns; this is not an exhaustive secret audit.

The fresh demo was stopped without deleting its volume, and the primary checkout's preview was restarted; final browser sign-in and dashboard loading were verified on http://localhost:8088. That statement applied to the initial delivery. The subsequent frontend redesign and its separate validation are recorded above.

## Honest limits

No public deployment, form submission, demo video, outbox worker, load benchmark, failover exercise or formal accessibility audit was performed. The redesign now has four-width browser inspection and explicit reduced-motion preference tests; an exhaustive browser/device matrix was not run. The entry bundle was split and no longer emits the prior chunk-size advisory. No global dependency-vulnerability-free or production-security claim is made.
