package com.newtonops.workitem;

import static com.newtonops.workitem.Contracts.*;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.newtonops.auth.*;
import com.newtonops.common.ApiException;
import com.newtonops.team.TeamAccess;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ItemService {
  private final JdbcTemplate db;
  private final ItemRepository repo;
  private final TeamAccess access;
  private final ObjectMapper json;

  public ItemService(JdbcTemplate db, ItemRepository repo, TeamAccess access, ObjectMapper json) {
    this.db = db;
    this.repo = repo;
    this.access = access;
    this.json = json;
  }

  public Item get(Actor a, UUID id) {
    var item = repo.get(id, false);
    access.role(a, item.teamId());
    return item;
  }

  public Page<Item> list(Actor a, Filters f) {
    if (f.teamId() != null) access.role(a, f.teamId());
    return repo.list(a, f);
  }

  public String encode(Object value) {
    try {
      return json.writeValueAsString(value);
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  private <T> T decode(String value, Class<T> type) {
    try {
      return json.readValue(value, type);
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  private Map<String, Object> details(String value) {
    try {
      return json.readValue(value, new TypeReference<>() {});
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  private void event(Actor a, UUID id, String type, Object details) {
    db.update(
        "INSERT INTO activity_events(item_id,actor_id,event_type,details) VALUES (?,?,?,?::jsonb)",
        id,
        a.id(),
        type,
        encode(details));
  }

  @Transactional
  public Item create(Actor a, Create body, String key) {
    access.write(a, body.teamId());
    if (key == null || !key.matches("[A-Za-z0-9._:-]{1,128}"))
      throw new ApiException(
          400,
          "INVALID_IDEMPOTENCY_KEY",
          "Provide an Idempotency-Key of 1–128 letters, digits, dots, colons, underscores or hyphens.");
    String hash = AuthService.hash(encode(body));
    // Transaction-scoped PostgreSQL lock serializes the same principal/operation/key.
    // Hash collisions only serialize unrelated requests; the exact primary key still owns identity.
    db.queryForList(
        "SELECT pg_advisory_xact_lock(hashtextextended(?,0))", a.id() + ":create-item:" + key);
    var prior =
        db.queryForList(
            "SELECT request_hash,response::text FROM idempotency_keys WHERE user_id=? AND operation='create-item' AND key=?",
            a.id(),
            key);
    if (!prior.isEmpty()) {
      if (!hash.equals(prior.getFirst().get("request_hash")))
        throw new ApiException(
            409,
            "IDEMPOTENCY_MISMATCH",
            "This request key was already used with different content.");
      return decode((String) prior.getFirst().get("response"), Item.class);
    }
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO work_items(id,title,description,type,priority,status,team_id,created_by,due_date) VALUES (?,?,?,?,?,'OPEN',?,?,?)",
        id,
        body.title().trim(),
        body.description(),
        body.type().name(),
        body.priority().name(),
        body.teamId(),
        a.id(),
        body.dueDate());
    Item item = repo.get(id, false);
    event(a, id, "CREATED", Map.of("after", item));
    db.update(
        "INSERT INTO idempotency_keys(user_id,operation,key,request_hash,response) VALUES (?,'create-item',?,?,?::jsonb)",
        a.id(),
        key,
        hash,
        encode(item));
    return item;
  }

  private Item writable(Actor a, UUID id, long version) {
    var item = repo.get(id, true);
    var role = access.write(a, item.teamId());
    if (!role.lead() && !a.id().equals(item.assigneeId())) throw ApiException.forbidden();
    if (item.version() != version) throw ApiException.conflict();
    return item;
  }

  private void bump(UUID id, long version) {
    if (db.update(
            "UPDATE work_items SET version=version+1,updated_at=clock_timestamp() WHERE id=? AND version=?",
            id,
            version)
        != 1) throw ApiException.conflict();
  }

  @Transactional
  public Item edit(Actor a, UUID id, Edit body) {
    var before = writable(a, id, body.version());
    var role = access.role(a, before.teamId());
    if (!role.lead()
        && (before.priority() != body.priority()
            || !Objects.equals(before.assigneeId(), body.assigneeId())))
      throw ApiException.forbidden();
    if (before.status() == Status.CLOSED)
      throw new ApiException(409, "ITEM_CLOSED", "Closed work is read-only.");
    if (body.assigneeId() != null) access.member(body.assigneeId(), before.teamId());
    if (body.assigneeId() == null && before.status() != Status.OPEN)
      throw new ApiException(400, "ASSIGNEE_REQUIRED", "Active work must have an assignee.");
    int updated =
        db.update(
            "UPDATE work_items SET title=?,description=?,type=?,priority=?,assignee_id=?,due_date=?,version=version+1,updated_at=clock_timestamp() WHERE id=? AND version=?",
            body.title().trim(),
            body.description(),
            body.type().name(),
            body.priority().name(),
            body.assigneeId(),
            body.dueDate(),
            id,
            body.version());
    if (updated != 1) throw ApiException.conflict();
    var after = repo.get(id, false);
    event(a, id, "UPDATED", Map.of("before", before, "after", after));
    return after;
  }

  @Transactional
  public Item claim(Actor a, UUID id, long version) {
    var before = repo.get(id, false);
    access.write(a, before.teamId());
    int updated =
        db.update(
            "UPDATE work_items SET assignee_id=?,version=version+1,updated_at=clock_timestamp() WHERE id=? AND version=? AND assignee_id IS NULL AND status='OPEN'",
            a.id(),
            id,
            version);
    if (updated != 1)
      throw new ApiException(
          409,
          "CLAIM_CONFLICT",
          "This item changed or was already claimed. Refresh to see its current owner.");
    var after = repo.get(id, false);
    event(a, id, "CLAIMED", Map.of("assigneeId", a.id(), "version", after.version()));
    return after;
  }

  @Transactional
  public Item transition(Actor a, UUID id, Transition body) {
    var before = writable(a, id, body.version());
    var role = access.role(a, before.teamId());
    boolean approval = before.status() == Status.AWAITING_APPROVAL;
    if (approval && !role.lead()) throw ApiException.forbidden();
    boolean valid =
        switch (before.status()) {
          case OPEN -> body.status() == Status.IN_PROGRESS;
          case IN_PROGRESS -> body.status() == Status.AWAITING_APPROVAL;
          case AWAITING_APPROVAL ->
              body.status() == Status.RESOLVED || body.status() == Status.IN_PROGRESS;
          case RESOLVED -> body.status() == Status.CLOSED;
          case CLOSED -> false;
        };
    if (!valid)
      throw new ApiException(409, "INVALID_TRANSITION", "That workflow transition is not allowed.");
    if (before.assigneeId() == null)
      throw new ApiException(
          409, "ASSIGNEE_REQUIRED", "Claim or assign this item before starting work.");
    if (db.update(
            "UPDATE work_items SET status=?,version=version+1,updated_at=clock_timestamp() WHERE id=? AND version=?",
            body.status().name(),
            id,
            body.version())
        != 1) throw ApiException.conflict();
    event(
        a,
        id,
        approval ? (body.status() == Status.RESOLVED ? "APPROVED" : "REJECTED") : "STATUS_CHANGED",
        Map.of("from", before.status(), "to", body.status(), "version", before.version() + 1));
    return repo.get(id, false);
  }

  @Transactional
  public Item comment(Actor a, UUID id, Comment body) {
    var before = repo.get(id, true);
    access.write(a, before.teamId());
    if (before.version() != body.version()) throw ApiException.conflict();
    if (before.status() == Status.CLOSED)
      throw new ApiException(409, "ITEM_CLOSED", "Closed work is read-only.");
    bump(id, body.version());
    db.update(
        "INSERT INTO comments(item_id,actor_id,body) VALUES (?,?,?)",
        id,
        a.id(),
        body.body().trim());
    event(a, id, "COMMENTED", Map.of("body", body.body().trim()));
    return repo.get(id, false);
  }

  public Page<Event> activity(Actor a, UUID id, Long cursor, int limit) {
    get(a, id);
    validateLimit(limit);
    var rows =
        db.query(
            "SELECT e.*,u.name actor_name FROM activity_events e JOIN users u ON u.id=e.actor_id WHERE e.item_id=? AND e.id<? ORDER BY e.id DESC LIMIT ?",
            (r, n) ->
                new Event(
                    r.getLong("id"),
                    r.getObject("actor_id", UUID.class),
                    r.getString("actor_name"),
                    r.getString("event_type"),
                    details(r.getString("details")),
                    r.getTimestamp("created_at").toInstant()),
            id,
            cursor == null ? Long.MAX_VALUE : cursor,
            limit + 1);
    boolean more = rows.size() > limit;
    var page = List.copyOf(rows.subList(0, Math.min(limit, rows.size())));
    return new Page<>(page, more ? String.valueOf(page.getLast().id()) : null);
  }

  public Page<CommentView> comments(Actor a, UUID id, Long cursor, int limit) {
    get(a, id);
    validateLimit(limit);
    var rows =
        db.query(
            "SELECT c.*,u.name actor_name FROM comments c JOIN users u ON u.id=c.actor_id WHERE c.item_id=? AND c.id<? ORDER BY c.id DESC LIMIT ?",
            (r, n) ->
                new CommentView(
                    r.getLong("id"),
                    r.getObject("actor_id", UUID.class),
                    r.getString("actor_name"),
                    r.getString("body"),
                    r.getTimestamp("created_at").toInstant()),
            id,
            cursor == null ? Long.MAX_VALUE : cursor,
            limit + 1);
    boolean more = rows.size() > limit;
    var page = List.copyOf(rows.subList(0, Math.min(limit, rows.size())));
    return new Page<>(page, more ? String.valueOf(page.getLast().id()) : null);
  }

  private void validateLimit(int limit) {
    if (limit < 1 || limit > 100) throw new IllegalArgumentException();
  }
}
