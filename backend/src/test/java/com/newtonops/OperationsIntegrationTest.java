package com.newtonops;

import static com.newtonops.workitem.Contracts.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.newtonops.auth.*;
import com.newtonops.common.*;
import com.newtonops.workitem.*;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;

@SpringBootTest
@AutoConfigureMockMvc
class OperationsIntegrationTest {
  static PostgreSQLContainer<?> postgres;

  @DynamicPropertySource
  static void database(DynamicPropertyRegistry registry) {
    String url = System.getenv("TEST_DATABASE_URL");
    if (url == null) {
      postgres = new PostgreSQLContainer<>("postgres:16-alpine");
      postgres.start();
      registry.add("spring.datasource.url", postgres::getJdbcUrl);
      registry.add("spring.datasource.username", postgres::getUsername);
      registry.add("spring.datasource.password", postgres::getPassword);
    } else {
      registry.add("spring.datasource.url", () -> url);
      registry.add(
          "spring.datasource.username",
          () -> System.getenv().getOrDefault("TEST_DATABASE_USER", "newtonops"));
      registry.add(
          "spring.datasource.password",
          () -> System.getenv().getOrDefault("TEST_DATABASE_PASSWORD", "newtonops_dev"));
    }
    registry.add("newtonops.seed", () -> "true");
  }

  @Autowired ItemService service;
  @Autowired AuthService auth;
  @Autowired JdbcTemplate db;
  @Autowired MockMvc mvc;
  Actor member = new Actor(DemoSeed.id("member"), "member@newtonops.local", "Aman");
  Actor other = new Actor(DemoSeed.id("member2"), "member2@newtonops.local", "Priya");
  Actor lead = new Actor(DemoSeed.id("lead"), "lead@newtonops.local", "Maya");
  Actor viewer = new Actor(DemoSeed.id("viewer"), "viewer@newtonops.local", "Alex");
  Actor outsider = new Actor(DemoSeed.id("outsider"), "outsider@newtonops.local", "Riya");
  UUID team = DemoSeed.id("Platform Operations");

  Create body(String title) {
    return new Create(
        title, "Investigate and document", Type.INCIDENT, Priority.HIGH, team, LocalDate.now());
  }

  Item item() {
    return service.create(member, body("Test " + UUID.randomUUID()), UUID.randomUUID().toString());
  }

  Edit edit(Item i, String title, long version) {
    return new Edit(
        version, title, i.description(), i.type(), i.priority(), i.assigneeId(), i.dueDate());
  }

  long events(UUID id) {
    return db.queryForObject(
        "SELECT count(*) FROM activity_events WHERE item_id=?", Long.class, id);
  }

  void denied(Runnable action, int status) {
    assertThatThrownBy(action::run)
        .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.status).isEqualTo(status));
  }

  <T> List<T> race(Callable<T> a, Callable<T> b) throws Exception {
    var barrier = new CyclicBarrier(2);
    try (var executor = Executors.newFixedThreadPool(2)) {
      var f1 =
          executor.submit(
              () -> {
                barrier.await(5, TimeUnit.SECONDS);
                return a.call();
              });
      var f2 =
          executor.submit(
              () -> {
                barrier.await(5, TimeUnit.SECONDS);
                return b.call();
              });
      return List.of(f1.get(15, TimeUnit.SECONDS), f2.get(15, TimeUnit.SECONDS));
    }
  }

  @Test
  void simultaneousClaimsHaveExactlyOneWinnerAndOneEvent() throws Exception {
    var item = item();
    var outcomes = race(() -> claimResult(member, item), () -> claimResult(other, item));
    assertThat(outcomes).containsExactlyInAnyOrder(200, 409);
    var after = service.get(member, item.id());
    assertThat(after.assigneeId()).isIn(member.id(), other.id());
    assertThat(after.version()).isEqualTo(1);
    assertThat(events(item.id())).isEqualTo(2);
    assertThat(
            db.queryForObject(
                "SELECT count(*) FROM activity_events WHERE item_id=? AND event_type='CLAIMED'",
                Long.class,
                item.id()))
        .isEqualTo(1);
  }

  int claimResult(Actor actor, Item i) {
    try {
      service.claim(actor, i.id(), i.version());
      return 200;
    } catch (ApiException e) {
      return e.status;
    }
  }

  @Test
  void staleEditLeavesLatestDataAndAuditUnchanged() {
    var i = service.claim(member, item().id(), 0);
    var updated = service.edit(member, i.id(), edit(i, "Latest title", 1));
    denied(() -> service.edit(member, i.id(), edit(i, "Stale title", 1)), 409);
    assertThat(service.get(member, i.id()).title()).isEqualTo("Latest title");
    assertThat(updated.version()).isEqualTo(2);
    assertThat(events(i.id())).isEqualTo(3);
  }

  @Test
  void concurrentEditsRejectOneStaleWriter() throws Exception {
    var i = service.claim(member, item().id(), 0);
    var results = race(() -> editResult(i, "A"), () -> editResult(i, "B"));
    assertThat(results).containsExactlyInAnyOrder(200, 409);
    assertThat(service.get(member, i.id()).version()).isEqualTo(2);
    assertThat(events(i.id())).isEqualTo(3);
  }

  int editResult(Item i, String title) {
    try {
      service.edit(member, i.id(), edit(i, title, i.version()));
      return 200;
    } catch (ApiException e) {
      return e.status;
    }
  }

  @Test
  void identicalRetryReturnsOriginalSnapshotEvenAfterItemChanges() {
    var key = UUID.randomUUID().toString();
    var body = body("Retry " + key);
    var first = service.create(member, body, key);
    service.claim(member, first.id(), 0);
    assertThat(service.create(member, body, key)).isEqualTo(first);
    assertThat(events(first.id())).isEqualTo(2);
  }

  @Test
  void simultaneousRetriesCreateExactlyOneItem() throws Exception {
    String key = UUID.randomUUID().toString();
    var body = body("Concurrent " + key);
    var results =
        race(() -> service.create(member, body, key), () -> service.create(member, body, key));
    assertThat(results.get(0)).isEqualTo(results.get(1));
    assertThat(events(results.getFirst().id())).isEqualTo(1);
    assertThat(
            db.queryForObject(
                "SELECT count(*) FROM work_items WHERE title=?", Long.class, body.title()))
        .isEqualTo(1);
  }

  @Test
  void keyReuseWithDifferentPayloadIsRejected() {
    var key = UUID.randomUUID().toString();
    service.create(member, body("One"), key);
    denied(() -> service.create(member, body("Two"), key), 409);
  }

  @Test
  void keysAreScopedByPrincipal() {
    var key = UUID.randomUUID().toString();
    assertThat(service.create(member, body("One"), key).id())
        .isNotEqualTo(service.create(other, body("One"), key).id());
  }

  @Test
  void directWorkflowJumpFailsWithoutHistory() {
    var i = service.claim(member, item().id(), 0);
    denied(() -> service.transition(member, i.id(), new Transition(1L, Status.CLOSED)), 409);
    assertThat(events(i.id())).isEqualTo(2);
  }

  Item awaiting() {
    var i = service.claim(member, item().id(), 0);
    service.transition(member, i.id(), new Transition(1L, Status.IN_PROGRESS));
    return service.transition(member, i.id(), new Transition(2L, Status.AWAITING_APPROVAL));
  }

  @Test
  void memberCannotApproveButLeadCan() {
    var i = awaiting();
    denied(() -> service.transition(member, i.id(), new Transition(3L, Status.RESOLVED)), 403);
    var approved = service.transition(lead, i.id(), new Transition(3L, Status.RESOLVED));
    assertThat(approved.status()).isEqualTo(Status.RESOLVED);
    assertThat(service.activity(member, i.id(), null, 20).items().getFirst().eventType())
        .isEqualTo("APPROVED");
    assertThat(events(i.id())).isEqualTo(5);
  }

  @Test
  void rejectionReturnsToProgressAndClosedIsReadOnly() {
    var i = awaiting();
    var rejected = service.transition(lead, i.id(), new Transition(3L, Status.IN_PROGRESS));
    assertThat(rejected.status()).isEqualTo(Status.IN_PROGRESS);
    service.transition(member, i.id(), new Transition(4L, Status.AWAITING_APPROVAL));
    service.transition(lead, i.id(), new Transition(5L, Status.RESOLVED));
    var closed = service.transition(member, i.id(), new Transition(6L, Status.CLOSED));
    denied(() -> service.edit(member, i.id(), edit(closed, "Changed", 7)), 409);
    denied(() -> service.comment(member, i.id(), new Comment(7L, "Too late")), 409);
  }

  @Test
  void outsidersCannotReadWriteOrReadHistory() {
    var i = item();
    denied(() -> service.get(outsider, i.id()), 403);
    denied(() -> service.claim(outsider, i.id(), 0), 403);
    denied(() -> service.edit(outsider, i.id(), edit(i, "Changed", 0)), 403);
    denied(() -> service.activity(outsider, i.id(), null, 20), 403);
    denied(() -> service.comments(outsider, i.id(), null, 20), 403);
    denied(() -> service.comment(outsider, i.id(), new Comment(0L, "Forbidden")), 403);
    denied(() -> service.transition(outsider, i.id(), new Transition(0L, Status.IN_PROGRESS)), 403);
  }

  @Test
  void viewerCanReadButCannotMutate() {
    var i = item();
    assertThat(service.get(viewer, i.id()).id()).isEqualTo(i.id());
    denied(() -> service.create(viewer, body("Forbidden"), "viewer-key"), 403);
    denied(() -> service.claim(viewer, i.id(), 0), 403);
    denied(() -> service.comment(viewer, i.id(), new Comment(0L, "Forbidden")), 403);
  }

  @Test
  void memberCannotReprioritizeOrReassignOtherWork() {
    var i = service.claim(member, item().id(), 0);
    denied(() -> service.edit(other, i.id(), edit(i, "Changed", 1)), 403);
    denied(
        () ->
            service.edit(
                member,
                i.id(),
                new Edit(
                    1L,
                    i.title(),
                    i.description(),
                    i.type(),
                    Priority.CRITICAL,
                    i.assigneeId(),
                    i.dueDate())),
        403);
    var updated =
        service.edit(
            lead,
            i.id(),
            new Edit(
                1L,
                i.title(),
                i.description(),
                i.type(),
                Priority.CRITICAL,
                other.id(),
                i.dueDate()));
    assertThat(updated.assigneeId()).isEqualTo(other.id());
  }

  @Test
  void assigneeMustBelongToTeamAndActiveItemCannotBeUnassigned() {
    var i = service.claim(member, item().id(), 0);
    denied(
        () ->
            service.edit(
                lead,
                i.id(),
                new Edit(
                    1L,
                    i.title(),
                    i.description(),
                    i.type(),
                    i.priority(),
                    outsider.id(),
                    i.dueDate())),
        400);
    service.transition(member, i.id(), new Transition(1L, Status.IN_PROGRESS));
    denied(
        () ->
            service.edit(
                lead,
                i.id(),
                new Edit(
                    2L, i.title(), i.description(), i.type(), i.priority(), null, i.dueDate())),
        400);
  }

  @Test
  void commentAndVersionAndAuditCommitTogether() {
    var i = item();
    var after = service.comment(member, i.id(), new Comment(0L, "Investigation started"));
    assertThat(after.version()).isEqualTo(1);
    assertThat(service.comments(member, i.id(), null, 20).items().getFirst().body())
        .isEqualTo("Investigation started");
    assertThat(events(i.id())).isEqualTo(2);
    denied(() -> service.comment(member, i.id(), new Comment(0L, "Stale")), 409);
    assertThat(events(i.id())).isEqualTo(2);
    assertThat(service.comments(member, i.id(), null, 20).items()).hasSize(1);
  }

  @Test
  void auditFailureRollsBackCreationAndIdempotencyReservation() {
    db.execute(
        "CREATE OR REPLACE FUNCTION test_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.details->'after'->>'title'='AUDIT_FAILURE' THEN RAISE EXCEPTION 'injected audit failure'; END IF; RETURN NEW; END $$");
    db.execute(
        "CREATE TRIGGER test_failure BEFORE INSERT ON activity_events FOR EACH ROW EXECUTE FUNCTION test_fail_audit()");
    String key = UUID.randomUUID().toString();
    try {
      assertThatThrownBy(() -> service.create(member, body("AUDIT_FAILURE"), key))
          .isInstanceOf(org.springframework.dao.DataAccessException.class);
      assertThat(
              db.queryForObject(
                  "SELECT count(*) FROM work_items WHERE title='AUDIT_FAILURE'", Long.class))
          .isZero();
      assertThat(
              db.queryForObject(
                  "SELECT count(*) FROM idempotency_keys WHERE key=?", Long.class, key))
          .isZero();
    } finally {
      db.execute("DROP TRIGGER test_failure ON activity_events");
      db.execute("DROP FUNCTION test_fail_audit()");
    }
    assertThat(service.create(member, body("Recovered"), key).title()).isEqualTo("Recovered");
  }

  @Test
  void auditIsAppendOnlyAtDatabaseBoundary() {
    var i = item();
    assertThatThrownBy(() -> db.update("DELETE FROM activity_events WHERE item_id=?", i.id()))
        .isInstanceOf(org.springframework.dao.DataAccessException.class);
    assertThat(events(i.id())).isEqualTo(1);
  }

  @Test
  void cursorPaginationFiltersAndBoundsAreEnforced() {
    String prefix = "Pagination " + UUID.randomUUID();
    for (int n = 0; n < 5; n++)
      service.create(member, body(prefix + " " + n), UUID.randomUUID().toString());
    var first =
        service.list(
            member,
            new Filters(
                team,
                Status.OPEN,
                Priority.HIGH,
                null,
                prefix,
                null,
                null,
                null,
                null,
                null,
                null,
                2));
    var second =
        service.list(
            member,
            new Filters(
                team,
                Status.OPEN,
                Priority.HIGH,
                null,
                prefix,
                null,
                null,
                null,
                null,
                null,
                first.nextCursor(),
                2));
    var third =
        service.list(
            member,
            new Filters(
                team,
                Status.OPEN,
                Priority.HIGH,
                null,
                prefix,
                null,
                null,
                null,
                null,
                null,
                second.nextCursor(),
                2));
    Set<UUID> ids = new HashSet<>();
    for (var page : List.of(first, second, third))
      for (var i : page.items()) assertThat(ids.add(i.id())).isTrue();
    assertThat(ids).hasSize(5);
    assertThat(third.nextCursor()).isNull();
    denied(
        () ->
            service.list(
                member,
                new Filters(team, null, null, null, null, null, null, null, null, null, null, 101)),
        400);
    denied(
        () ->
            service.list(
                member,
                new Filters(team, null, null, null, null, null, null, null, null, null, "bad", 20)),
        400);
  }

  @Test
  void datesAssigneeAndActivityPaginationWork() {
    var i = service.claim(member, item().id(), 0);
    service.comment(member, i.id(), new Comment(1L, "One"));
    service.comment(member, i.id(), new Comment(2L, "Two"));
    var first = service.activity(member, i.id(), null, 2);
    assertThat(first.items()).hasSize(2);
    assertThat(service.activity(member, i.id(), Long.valueOf(first.nextCursor()), 2).items())
        .hasSize(2);
    var page =
        service.list(
            member,
            new Filters(
                team,
                null,
                null,
                member.id(),
                i.title(),
                LocalDate.now().minusDays(1),
                LocalDate.now().plusDays(1),
                LocalDate.now(),
                LocalDate.now(),
                null,
                null,
                20));
    assertThat(page.items()).extracting(Item::id).contains(i.id());
  }

  @Test
  void realHttpLoginSecurityValidationAndDashboard() throws Exception {
    mvc.perform(get("/api/items"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    mvc.perform(
            post("/api/auth/login")
                .contentType("application/json")
                .content("{\"email\":\"member@newtonops.local\",\"password\":\"wrong\"}"))
        .andExpect(status().isUnauthorized());
    var token = (String) auth.login(member.email(), "NewtonOps!2026").get("token");
    mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value(member.email()));
    mvc.perform(get("/api/dashboard/summary").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.metrics.active").isNumber());
    mvc.perform(
            post("/api/items")
                .header("Authorization", "Bearer " + token)
                .header("Idempotency-Key", "http-test")
                .contentType("application/json")
                .content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fields.title").exists());
    var i = item();
    var outsiderToken = (String) auth.login(outsider.email(), "NewtonOps!2026").get("token");
    mvc.perform(get("/api/items/" + i.id()).header("Authorization", "Bearer " + outsiderToken))
        .andExpect(status().isForbidden());
    mvc.perform(post("/api/auth/logout").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());
    mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
        .andExpect(status().isUnauthorized());
  }
}
