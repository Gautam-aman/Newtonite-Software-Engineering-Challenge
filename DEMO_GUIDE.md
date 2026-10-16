# NewtonOps: a 3–5 minute demonstration

Start the stack with `docker compose up --build`, then open http://localhost:8088.
Use a fresh item so the demonstration can be repeated without resetting the database.
All demo accounts use **NewtonOps!2026**. Never use these credentials on a shared service.

## 0:00–0:40 — Operational clarity
Sign in as `member@newtonops.local`. Point to real active-work, assigned, urgent and approval counts. Open **Urgent & unassigned**, then demonstrate status and priority filters. Requests contain filters and a bounded page size; the browser never downloads the whole database. Choose Platform Operations in the team switcher to enable the assignee filter.

## 0:40–1:50 — A clear owner and controlled progress
Click **New item**, create “Review settlement recovery”, and add a short investigation description. Note the unassigned OPEN state, version 0, and CREATED activity.
Click **Claim this item**. The owner appears and version becomes 1. Click **Start work**, add a comment, then **Submit for approval**. Each successful mutation advances the version and adds history. Members have no approval button.

## 1:50–2:40 — Approval is a server rule
Sign out. Choose **Lead** and sign in as `lead@newtonops.local`. The browser stays on the item route after login; otherwise find the item in **Work items → Approvals**.
Click **Approve resolution**. Show the APPROVED timeline event and resolved state. A Lead is only a Member in Customer Experience; use the team switcher to explain that roles belong to memberships rather than accounts.

## 2:40–3:30 — Stale data and collision safety
For a visible stale-form demo, open the same item in two browser windows and sign in as the Lead in both. Open **Edit item** in each window before saving either. Save a title change in window A; attempt a different title in window B. Window B displays “This item changed” and a refresh action. Refresh and confirm A's title remains.
For concurrent claiming, explain the conditional SQL and run `./mvnw -Dtest=OperationsIntegrationTest#simultaneousClaimsHaveExactlyOneWinnerAndOneEvent test` inside `backend` with Docker available. It asserts one winner, one conflict, one assignee, version 1 and one claim event. Do not present sequential browser clicks as a concurrency test.

## 3:30–4:30 — Defend the guarantees
Open the audit timeline and engineering decisions. Explain the single transaction for mutation and history, stored idempotency result and same-key advisory lock. Mention the real PostgreSQL audit-failure test, which proves rollback.
Optional: sign in as Viewer to show read-only access; `outsider@newtonops.local` belongs only to Risk & Compliance, so a Platform item URL returns 403.

## Submission handoff
The candidate supplies their own enrolment number, programme, contact details and confirmation of authorship. No application form has been submitted automatically. The advisory deadline is **19 October 2026, 10:00 AM IST**; target **9:30 AM IST**. No employer form URL was supplied. A video and hosted deployment are optional and were not created.
