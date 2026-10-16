package com.newtonops.workitem;

import static com.newtonops.workitem.Contracts.*;

import com.newtonops.auth.Actor;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/items")
public class ItemController {
  private final ItemService service;

  public ItemController(ItemService service) {
    this.service = service;
  }

  @GetMapping
  Page<Item> list(
      @AuthenticationPrincipal Actor a,
      @RequestParam(required = false) UUID teamId,
      @RequestParam(required = false) Status status,
      @RequestParam(required = false) Priority priority,
      @RequestParam(required = false) UUID assigneeId,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) LocalDate createdFrom,
      @RequestParam(required = false) LocalDate createdTo,
      @RequestParam(required = false) LocalDate dueFrom,
      @RequestParam(required = false) LocalDate dueTo,
      @RequestParam(required = false) String view,
      @RequestParam(required = false) String cursor,
      @RequestParam(defaultValue = "20") int limit) {
    return service.list(
        a,
        new Filters(
            teamId,
            status,
            priority,
            assigneeId,
            q,
            createdFrom,
            createdTo,
            dueFrom,
            dueTo,
            view,
            cursor,
            limit));
  }

  @GetMapping("/{id}")
  Item get(@AuthenticationPrincipal Actor a, @PathVariable UUID id) {
    return service.get(a, id);
  }

  @PostMapping
  ResponseEntity<Item> create(
      @AuthenticationPrincipal Actor a,
      @Valid @RequestBody Create body,
      @RequestHeader("Idempotency-Key") String key) {
    var item = service.create(a, body, key);
    return ResponseEntity.created(java.net.URI.create("/api/items/" + item.id())).body(item);
  }

  @PatchMapping("/{id}")
  Item edit(
      @AuthenticationPrincipal Actor a, @PathVariable UUID id, @Valid @RequestBody Edit body) {
    return service.edit(a, id, body);
  }

  @PostMapping("/{id}/claim")
  Item claim(
      @AuthenticationPrincipal Actor a, @PathVariable UUID id, @Valid @RequestBody Version body) {
    return service.claim(a, id, body.version());
  }

  @PostMapping("/{id}/transition")
  Item transition(
      @AuthenticationPrincipal Actor a,
      @PathVariable UUID id,
      @Valid @RequestBody Transition body) {
    return service.transition(a, id, body);
  }

  @PostMapping("/{id}/comments")
  Item comment(
      @AuthenticationPrincipal Actor a, @PathVariable UUID id, @Valid @RequestBody Comment body) {
    return service.comment(a, id, body);
  }

  @GetMapping("/{id}/activity")
  Page<Event> activity(
      @AuthenticationPrincipal Actor a,
      @PathVariable UUID id,
      @RequestParam(required = false) Long cursor,
      @RequestParam(defaultValue = "20") int limit) {
    return service.activity(a, id, cursor, limit);
  }

  @GetMapping("/{id}/comments")
  Page<CommentView> comments(
      @AuthenticationPrincipal Actor a,
      @PathVariable UUID id,
      @RequestParam(required = false) Long cursor,
      @RequestParam(defaultValue = "20") int limit) {
    return service.comments(a, id, cursor, limit);
  }
}
