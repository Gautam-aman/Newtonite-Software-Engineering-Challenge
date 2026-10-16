# Verification record

Recorded on 16 October 2026. This document distinguishes executed checks from future work.

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
| Screenshot | `docs/screenshots/resolved-item.png`, captured from the actual browser |
| Initial GitHub Actions workflow | Backend and frontend jobs passed for cb66439 |
| `git diff --check` | Passed |

The suite contains real parallel PostgreSQL transactions, not mocked claim/idempotency behavior. The browser smoke was driven through the computer-use browser controls; no standalone Playwright test suite is claimed. Automated UI tests use mocked HTTP contracts; public HTTP smoke and database tests provide the corresponding live coverage.

The local host initially lacked Docker. Docker CLI/Compose and a named **Colima `newtonops`** VM were installed and used. An existing stale `docker-credential-desktop` setting prevented public pulls from this host's default Docker client configuration. Verification used a separate temporary `DOCKER_CONFIG` containing no credentials plus the Colima socket; the existing credential configuration was preserved. This is a host-specific setup detail, not a repository requirement.

Compose was exercised with:

```bash
DOCKER_CONFIG=/tmp/newtonops-docker-config \
DOCKER_HOST=unix:///Users/rigelsmacbook/.colima/newtonops/docker.sock \
docker compose up --build -d --wait --wait-timeout 180
```

Testcontainers was exercised with:

```bash
DOCKER_HOST=unix:///Users/rigelsmacbook/.colima/newtonops/docker.sock \
TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock \
./backend/mvnw -f backend/pom.xml verify spotless:check
```

## Final fresh-checkout verification

Pending the documentation commit: clone the existing remote into a separate directory, run the documented checks, start a separate Compose project with its own empty database volume, and run the same HTTP smoke. The final evidence-only update will replace this paragraph with the observed result and tested revision.

## Honest limits

No public deployment, form submission, demo video, outbox worker, load benchmark, failover exercise or formal accessibility audit was performed. Reduced-motion behavior is implemented and was detected by Motion in the local browser. The narrow browser layout was visually inspected; an exhaustive viewport/browser matrix was not run. Vite emits a bundle-size advisory (~622 kB minified JavaScript, ~194 kB gzip); the build succeeds. No global dependency-vulnerability-free or production-security claim is made.
