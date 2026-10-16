package com.newtonops.team;
import com.newtonops.auth.Actor;
import com.newtonops.common.ApiException;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
@Service
public class TeamAccess {
    private final JdbcTemplate db;
    public TeamAccess(JdbcTemplate db) { this.db=db; }
    public enum Role { VIEWER, MEMBER, LEAD, ADMIN; public boolean lead() { return this==LEAD || this==ADMIN; } }
    public Role role(Actor actor, UUID team) {
        return db.query("SELECT role FROM memberships WHERE user_id=? AND team_id=?",(rs,n)->Role.valueOf(rs.getString(1)),actor.id(),team).stream().findFirst().orElseThrow(ApiException::forbidden);
    }
    public Role write(Actor actor,UUID team) { var role=role(actor,team); if(role==Role.VIEWER) throw ApiException.forbidden(); return role; }
    public void member(UUID user,UUID team) {
        if(Boolean.FALSE.equals(db.queryForObject("SELECT EXISTS(SELECT 1 FROM memberships WHERE user_id=? AND team_id=?)",Boolean.class,user,team))) throw new ApiException(400,"INVALID_ASSIGNEE","Assignee must belong to this team.");
    }
    public List<Map<String,Object>> teams(Actor actor) { return db.queryForList("SELECT t.id,t.name,m.role FROM teams t JOIN memberships m ON m.team_id=t.id WHERE m.user_id=? ORDER BY t.name",actor.id()); }
    public List<Map<String,Object>> members(Actor actor,UUID team) {
        role(actor,team);
        return db.queryForList("SELECT u.id,u.name,m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.team_id=? ORDER BY u.name",team);
    }
}
