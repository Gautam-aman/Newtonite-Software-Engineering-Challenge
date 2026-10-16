# API reference

All paths are prefixed with `/api`. JSON request/response bodies use camelCase except the small dashboard aggregate/recent-event SQL projections, whose keys are shown below. All endpoints except login require `Authorization: Bearer <token>`. Token values are not logged or persisted in browser storage.

| Method | Route | Contract |
| --- | --- | --- |
| POST | /auth/login | `{email,password}` → `{token,user:{id,name,email}}` |
| GET | /auth/me | Current `{id,name,email}` |
| POST | /auth/logout | Revoke current token |
| GET | /teams | Authorized `{id,name,role}[]` |
| GET | /teams/{id}/members | Team-scoped `{id,name,role}[]` |
| GET | /items | Filtered `{items,nextCursor}` |
| POST | /items | Create, requires Idempotency-Key; 201 + Location |
| GET | /items/{id} | Authorized work item |
| PATCH | /items/{id} | Full editable field set plus expected version |
| POST | /items/{id}/claim | `{version}` → updated item |
| POST | /items/{id}/transition | `{version,status}` → updated item |
| POST | /items/{id}/comments | `{version,body}` → updated item |
| GET | /items/{id}/comments | `{items,nextCursor}`, optional numeric cursor and limit |
| GET | /items/{id}/activity | `{items,nextCursor}`, optional numeric cursor and limit |
| GET | /dashboard/summary | Optional teamId; `{metrics,distribution,recent}` |

## List queries

Optional `teamId`, `status`, `priority`, `assigneeId`, `q` (up to 200 characters), `createdFrom`, `createdTo`, `dueFrom`, `dueTo`, `cursor` and `limit` (1–100, default 20). Date values are ISO calendar dates. Due and creation date bounds are inclusive calendar dates in the database session's timezone; Compose PostgreSQL defaults to UTC. UI due dates are calendar values, not timestamps.

`view=mine|urgent|approvals|overdue` adds a server-side queue predicate. Approvals includes only teams where the caller is Lead/Admin. Requests for an explicit unauthorized team return 403. Without a team filter, only authorized teams are returned. Search treats `%` and `_` literally and uses case-insensitive substring matching. The ID tie-breaker makes same-timestamp pagination deterministic.

## Create

```json
{"title":"Review settlement","description":"Check totals and document the result.","type":"PAYMENT","priority":"HIGH","teamId":"<team UUID>","dueDate":"2026-10-19"}
```

Use `Idempotency-Key: <unique request identifier>`, with 1–128 letters/digits/dots/colons/underscores/hyphens. Keep the same key for an uncertain retry of the identical request. New payloads require a new key. Replays return the original JSON response snapshot. Keys have no expiration in this demo.

Items contain `id,title,description,type,priority,status,teamId,teamName,assigneeId,assigneeName,createdBy,dueDate,version,createdAt,updatedAt`. UUIDs are strings; timestamps are ISO instants; absent assignee/due date is null. Creation always starts OPEN and unassigned at version 0.

## Edit

PATCH is an explicit complete editable-field contract, rather than a partial merge:

```json
{"version":1,"title":"Review settlement","description":"Updated context","type":"PAYMENT","priority":"HIGH","assigneeId":"<member UUID>","dueDate":null}
```

Team and creation metadata cannot be changed. Only Lead/Admin can reassign or reprioritize. Members can edit their assigned work's other fields. Non-OPEN work cannot be unassigned. CLOSED items cannot be edited or commented on. No DELETE endpoint exists; close resolved work to preserve accountability.

## Workflow

OPEN → IN_PROGRESS → AWAITING_APPROVAL → RESOLVED → CLOSED.
Only Lead/Admin pass the approval step or reject awaiting work to IN_PROGRESS. Assigned Members and Lead/Admin perform other valid transitions. Starting work requires an assignee. No reopen path exists.

## Error response

```json
{"code":"VERSION_CONFLICT","message":"This item changed. Refresh it and review the latest version before retrying.","fields":{}}
```

Codes include VALIDATION, BAD_REQUEST, INVALID_CREDENTIALS, UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, VERSION_CONFLICT, CLAIM_CONFLICT, IDEMPOTENCY_MISMATCH, INVALID_TRANSITION, ITEM_CLOSED, ASSIGNEE_REQUIRED, INVALID_ASSIGNEE, INVALID_CURSOR and UNAVAILABLE. Validation errors include a field-message map. Conflicts do not apply the requested mutation. Fetch the latest item and ask the user to review before trying a newly versioned write. Internal errors omit stack traces and SQL details.

## Dashboard shape

`metrics` contains `active,mine,urgent,approvals,overdue,completed`. `distribution` is `{status,count}[]`. `recent` contains `{id,event_type,created_at,actor_name,title,item_id}[]`, limited to eight events. All values are computed from authorized database rows; no client-generated operational metrics are used.
