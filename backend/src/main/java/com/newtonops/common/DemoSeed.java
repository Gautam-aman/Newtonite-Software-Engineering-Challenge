package com.newtonops.common;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name = "newtonops.seed", havingValue = "true")
public class DemoSeed implements ApplicationRunner {
  private final JdbcTemplate db;
  private final PasswordEncoder encoder;

  public DemoSeed(JdbcTemplate db, PasswordEncoder encoder) {
    this.db = db;
    this.encoder = encoder;
  }

  public static UUID id(String name) {
    return UUID.nameUUIDFromBytes(name.getBytes(StandardCharsets.UTF_8));
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    // Serialize repeatable demo initialization across application replicas.
    db.execute("SELECT pg_advisory_xact_lock(43892201)");
    if (db.queryForObject("SELECT count(*) FROM users", Long.class) > 0) return;
    String hash = encoder.encode("NewtonOps!2026");
    String[] teams = {"Platform Operations", "Customer Experience", "Risk & Compliance"};
    for (String team : teams) db.update("INSERT INTO teams VALUES (?,?)", id(team), team);
    String[][] users = {
      {"member", "Aman Gautam", "MEMBER"},
      {"lead", "Maya Chen", "LEAD"},
      {"viewer", "Alex Morgan", "VIEWER"},
      {"admin", "Jordan Lee", "ADMIN"},
      {"member2", "Priya Shah", "MEMBER"},
      {"sara", "Sara Williams", "MEMBER"},
      {"noah", "Noah Patel", "LEAD"},
      {"ava", "Ava Brooks", "VIEWER"},
      {"liam", "Liam Davis", "MEMBER"},
      {"outsider", "Riya Sen", "LEAD"}
    };
    for (int i = 0; i < users.length; i++) {
      var u = users[i];
      db.update(
          "INSERT INTO users VALUES (?,?,?,?)", id(u[0]), u[0] + "@newtonops.local", u[1], hash);
      String team = i == 9 ? teams[2] : i > 4 ? teams[1] : teams[0];
      db.update("INSERT INTO memberships VALUES (?,?,?)", id(u[0]), id(team), u[2]);
    }
    db.update("INSERT INTO memberships VALUES (?,?,?)", id("lead"), id(teams[1]), "MEMBER");
    db.update("INSERT INTO memberships VALUES (?,?,?)", id("admin"), id(teams[2]), "ADMIN");
    String[] titles = {
      "Investigate elevated API latency",
      "Reconcile duplicate settlement batch",
      "Restore delayed webhook delivery",
      "Review account verification exceptions",
      "Resolve checkout timeout reports",
      "Rotate service access credentials",
      "Validate end-of-day payment totals",
      "Triage customer escalation queue",
      "Audit vendor access permissions",
      "Recover failed invoice exports",
      "Review regional error budget",
      "Update incident response playbook"
    };
    String[] types = {"INCIDENT", "PAYMENT", "TASK", "COMPLIANCE", "CUSTOMER_ISSUE"};
    String[] priorities = {"CRITICAL", "HIGH", "MEDIUM", "LOW"};
    String[] statuses = {"OPEN", "IN_PROGRESS", "AWAITING_APPROVAL", "RESOLVED", "CLOSED", "OPEN"};
    for (int i = 0; i < 60; i++) {
      UUID item = id("demo-item-" + i);
      int t = i / 20;
      String status = statuses[i % 6];
      UUID owner =
          status.equals("OPEN") ? null : id(t == 0 ? "member" : t == 1 ? "sara" : "outsider");
      db.update(
          "INSERT INTO work_items(id,title,description,type,priority,status,team_id,assignee_id,created_by,due_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,current_date + (? * interval '1 day'),now()-(? * interval '1 hour'),now()-(? * interval '1 hour'))",
          item,
          titles[i % titles.length] + (i >= 12 ? " · " + (i / 12 + 1) : ""),
          "Coordinate investigation with the team, document the root cause, and verify recovery before requesting approval.\n\nAcceptance criteria: confirm the impact, record the resolution, and obtain team lead review.",
          types[i % 5],
          priorities[i % 4],
          status,
          id(teams[t]),
          owner,
          id("admin"),
          i % 9 - 3,
          72 - i,
          12 - i % 12);
      db.update(
          "INSERT INTO activity_events(item_id,actor_id,event_type,details) VALUES (?,?,'CREATED',jsonb_build_object('source','demo seed','status',?::text))",
          item,
          id("admin"),
          status);
    }
  }
}
