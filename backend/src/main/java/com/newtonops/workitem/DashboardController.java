package com.newtonops.workitem;

import com.newtonops.auth.Actor;
import com.newtonops.team.TeamAccess;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
  private final JdbcTemplate db;
  private final TeamAccess access;

  public DashboardController(JdbcTemplate db, TeamAccess access) {
    this.db = db;
    this.access = access;
  }

  @GetMapping("/summary")
  Map<String, Object> summary(
      @AuthenticationPrincipal Actor a, @RequestParam(required = false) UUID teamId) {
    if (teamId != null) access.role(a, teamId);
    String scope =
        " FROM work_items w JOIN memberships m ON m.team_id=w.team_id AND m.user_id=? WHERE (?::uuid IS NULL OR w.team_id=?::uuid)";
    var metrics =
        db.queryForMap(
            "SELECT count(*) FILTER(WHERE w.status NOT IN ('RESOLVED','CLOSED')) active, count(*) FILTER(WHERE w.assignee_id=? AND w.status NOT IN ('RESOLVED','CLOSED')) mine, count(*) FILTER(WHERE w.assignee_id IS NULL AND w.priority IN ('CRITICAL','HIGH') AND w.status='OPEN') urgent, count(*) FILTER(WHERE w.status='AWAITING_APPROVAL' AND m.role IN ('LEAD','ADMIN')) approvals, count(*) FILTER(WHERE w.due_date<current_date AND w.status NOT IN ('RESOLVED','CLOSED')) overdue, count(*) FILTER(WHERE w.status IN ('RESOLVED','CLOSED')) completed"
                + scope,
            a.id(),
            a.id(),
            teamId,
            teamId);
    var distribution =
        db.queryForList(
            "SELECT w.status,count(*) count" + scope + " GROUP BY w.status",
            a.id(),
            teamId,
            teamId);
    var recent =
        db.queryForList(
            "SELECT e.id,e.event_type,e.created_at,u.name actor_name,w.title,w.id item_id FROM activity_events e JOIN work_items w ON w.id=e.item_id JOIN memberships m ON m.team_id=w.team_id AND m.user_id=? JOIN users u ON u.id=e.actor_id WHERE (?::uuid IS NULL OR w.team_id=?::uuid) ORDER BY e.id DESC LIMIT 8",
            a.id(),
            teamId,
            teamId);
    return Map.of("metrics", metrics, "distribution", distribution, "recent", recent);
  }
}
