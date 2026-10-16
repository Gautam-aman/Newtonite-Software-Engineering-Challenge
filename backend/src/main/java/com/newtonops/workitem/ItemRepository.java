package com.newtonops.workitem;

import static com.newtonops.workitem.Contracts.*;

import com.newtonops.auth.Actor;
import com.newtonops.common.ApiException;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.*;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.stereotype.Repository;

@Repository
public class ItemRepository {
  public static final String SELECT =
      "SELECT w.*,t.name team_name,u.name assignee_name FROM work_items w JOIN teams t ON t.id=w.team_id LEFT JOIN users u ON u.id=w.assignee_id ";
  private final JdbcTemplate db;
  private final NamedParameterJdbcTemplate named;

  public ItemRepository(JdbcTemplate db) {
    this.db = db;
    this.named = new NamedParameterJdbcTemplate(db);
  }

  public static Item map(ResultSet r, int n) throws SQLException {
    return new Item(
        r.getObject("id", UUID.class),
        r.getString("title"),
        r.getString("description"),
        Type.valueOf(r.getString("type")),
        Priority.valueOf(r.getString("priority")),
        Status.valueOf(r.getString("status")),
        r.getObject("team_id", UUID.class),
        r.getString("team_name"),
        r.getObject("assignee_id", UUID.class),
        r.getString("assignee_name"),
        r.getObject("created_by", UUID.class),
        r.getObject("due_date", LocalDate.class),
        r.getLong("version"),
        r.getTimestamp("created_at").toInstant(),
        r.getTimestamp("updated_at").toInstant());
  }

  public Item get(UUID id, boolean lock) {
    return db
        .query(SELECT + "WHERE w.id=?" + (lock ? " FOR UPDATE OF w" : ""), ItemRepository::map, id)
        .stream()
        .findFirst()
        .orElseThrow(() -> new ApiException(404, "NOT_FOUND", "Work item was not found."));
  }

  public Page<Item> list(Actor actor, Filters f) {
    if (f.limit() < 1 || f.limit() > 100)
      throw new ApiException(400, "BAD_PAGE_SIZE", "Page size must be between 1 and 100.");
    StringBuilder sql =
        new StringBuilder(
            SELECT
                + "WHERE EXISTS (SELECT 1 FROM memberships m WHERE m.team_id=w.team_id AND m.user_id=:actor) ");
    var p = new MapSqlParameterSource("actor", actor.id());
    add(sql, p, "teamId", f.teamId(), "w.team_id=:teamId");
    add(sql, p, "status", f.status(), "w.status=:status");
    add(sql, p, "priority", f.priority(), "w.priority=:priority");
    add(sql, p, "assigneeId", f.assigneeId(), "w.assignee_id=:assigneeId");
    if (f.q() != null && !f.q().isBlank()) {
      if (f.q().length() > 200) throw new IllegalArgumentException();
      add(
          sql,
          p,
          "q",
          "%" + f.q().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%",
          "(w.title || ' ' || w.description) ILIKE :q");
    }
    add(sql, p, "createdFrom", f.createdFrom(), "w.created_at>=:createdFrom");
    if (f.createdTo() != null)
      add(sql, p, "createdTo", f.createdTo().plusDays(1), "w.created_at<:createdTo");
    add(sql, p, "dueFrom", f.dueFrom(), "w.due_date>=:dueFrom");
    add(sql, p, "dueTo", f.dueTo(), "w.due_date<=:dueTo");
    if (f.view() != null)
      switch (f.view()) {
        case "mine" ->
            sql.append("AND w.assignee_id=:actor AND w.status NOT IN ('RESOLVED','CLOSED') ");
        case "urgent" ->
            sql.append(
                "AND w.assignee_id IS NULL AND w.priority IN ('CRITICAL','HIGH') AND w.status='OPEN' ");
        case "approvals" ->
            sql.append(
                "AND w.status='AWAITING_APPROVAL' AND EXISTS (SELECT 1 FROM memberships l WHERE l.team_id=w.team_id AND l.user_id=:actor AND l.role IN ('LEAD','ADMIN')) ");
        case "overdue" ->
            sql.append("AND w.due_date<current_date AND w.status NOT IN ('RESOLVED','CLOSED') ");
        default -> throw new IllegalArgumentException();
      }
    if (f.cursor() != null && !f.cursor().isBlank()) {
      try {
        String[] parts =
            new String(Base64.getUrlDecoder().decode(f.cursor()), StandardCharsets.UTF_8)
                .split("\\|", -1);
        if (parts.length != 2) throw new IllegalArgumentException();
        p.addValue("cursorTime", Timestamp.from(Instant.parse(parts[0])))
            .addValue("cursorId", UUID.fromString(parts[1]));
        sql.append("AND (w.created_at,w.id)<(:cursorTime,:cursorId) ");
      } catch (RuntimeException e) {
        throw new ApiException(400, "INVALID_CURSOR", "The page cursor is invalid.");
      }
    }
    sql.append("ORDER BY w.created_at DESC,w.id DESC LIMIT :limit");
    p.addValue("limit", f.limit() + 1);
    var rows = named.query(sql.toString(), p, ItemRepository::map);
    boolean more = rows.size() > f.limit();
    var items = List.copyOf(rows.subList(0, Math.min(rows.size(), f.limit())));
    String cursor = null;
    if (more) {
      var last = items.getLast();
      cursor =
          Base64.getUrlEncoder()
              .withoutPadding()
              .encodeToString(
                  (last.createdAt() + "|" + last.id()).getBytes(StandardCharsets.UTF_8));
    }
    return new Page<>(items, cursor);
  }

  private static void add(
      StringBuilder sql, MapSqlParameterSource p, String name, Object value, String clause) {
    if (value != null) {
      sql.append("AND ").append(clause).append(' ');
      p.addValue(name, value instanceof Enum<?> e ? e.name() : value);
    }
  }
}
