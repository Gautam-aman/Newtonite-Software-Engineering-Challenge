package com.newtonops.team;

import com.newtonops.auth.Actor;
import java.util.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/teams")
public class TeamController {
  private final TeamAccess access;

  public TeamController(TeamAccess access) {
    this.access = access;
  }

  @GetMapping
  List<Map<String, Object>> teams(@AuthenticationPrincipal Actor actor) {
    return access.teams(actor);
  }

  @GetMapping("/{id}/members")
  List<Map<String, Object>> members(@AuthenticationPrincipal Actor actor, @PathVariable UUID id) {
    return access.members(actor, id);
  }
}
