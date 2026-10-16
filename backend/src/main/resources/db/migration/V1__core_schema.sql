CREATE TABLE users (
 id uuid PRIMARY KEY, email varchar(254) NOT NULL UNIQUE, name varchar(100) NOT NULL,
 password_hash varchar(100) NOT NULL
);
CREATE TABLE teams (id uuid PRIMARY KEY, name varchar(100) NOT NULL UNIQUE);
CREATE TABLE memberships (
 user_id uuid NOT NULL REFERENCES users, team_id uuid NOT NULL REFERENCES teams,
 role varchar(12) NOT NULL CHECK (role IN ('VIEWER','MEMBER','LEAD','ADMIN')),
 PRIMARY KEY (user_id, team_id)
);
CREATE INDEX memberships_team ON memberships(team_id,user_id);
CREATE TABLE sessions (
 token_hash char(64) PRIMARY KEY, user_id uuid NOT NULL REFERENCES users,
 expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE work_items (
 id uuid PRIMARY KEY, title varchar(180) NOT NULL CHECK(length(trim(title)) > 0),
 description varchar(10000) NOT NULL DEFAULT '',
 type varchar(24) NOT NULL CHECK(type IN ('INCIDENT','CUSTOMER_ISSUE','PAYMENT','COMPLIANCE','TASK')),
 priority varchar(12) NOT NULL CHECK(priority IN ('CRITICAL','HIGH','MEDIUM','LOW')),
 status varchar(24) NOT NULL CHECK(status IN ('OPEN','IN_PROGRESS','AWAITING_APPROVAL','RESOLVED','CLOSED')),
 team_id uuid NOT NULL REFERENCES teams, assignee_id uuid, created_by uuid NOT NULL REFERENCES users,
 due_date date, version bigint NOT NULL DEFAULT 0 CHECK(version >= 0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (assignee_id,team_id) REFERENCES memberships(user_id,team_id)
);
CREATE INDEX items_team_created ON work_items(team_id,created_at DESC,id DESC);
CREATE INDEX items_team_status_created ON work_items(team_id,status,created_at DESC,id DESC);
CREATE INDEX items_team_priority_created ON work_items(team_id,priority,created_at DESC,id DESC);
CREATE INDEX items_assignee_created ON work_items(assignee_id,created_at DESC,id DESC);
CREATE INDEX items_team_due ON work_items(team_id,due_date) WHERE status NOT IN ('CLOSED','RESOLVED');
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX items_search ON work_items USING gin ((title || ' ' || description) gin_trgm_ops);
CREATE TABLE activity_events (
 id bigserial PRIMARY KEY, item_id uuid NOT NULL REFERENCES work_items,
 actor_id uuid NOT NULL REFERENCES users, event_type varchar(30) NOT NULL,
 details jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_item_cursor ON activity_events(item_id,id DESC);
CREATE TABLE comments (
 id bigserial PRIMARY KEY, item_id uuid NOT NULL REFERENCES work_items,
 actor_id uuid NOT NULL REFERENCES users, body varchar(4000) NOT NULL CHECK(length(trim(body)) > 0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_item_cursor ON comments(item_id,id DESC);
CREATE TABLE idempotency_keys (
 user_id uuid NOT NULL REFERENCES users, operation varchar(40) NOT NULL,
 key varchar(128) NOT NULL, request_hash char(64) NOT NULL,
 response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,operation,key)
);
CREATE FUNCTION prevent_history_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Activity history is append-only'; END; $$;
CREATE TRIGGER activity_immutable BEFORE UPDATE OR DELETE ON activity_events
FOR EACH ROW EXECUTE FUNCTION prevent_history_change();
