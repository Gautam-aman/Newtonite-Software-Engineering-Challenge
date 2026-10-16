package com.newtonops.workitem;

import jakarta.validation.constraints.*;
import java.time.*;
import java.util.*;

public final class Contracts {
  private Contracts() {}

  public enum Type {
    INCIDENT,
    CUSTOMER_ISSUE,
    PAYMENT,
    COMPLIANCE,
    TASK
  }

  public enum Priority {
    CRITICAL,
    HIGH,
    MEDIUM,
    LOW
  }

  public enum Status {
    OPEN,
    IN_PROGRESS,
    AWAITING_APPROVAL,
    RESOLVED,
    CLOSED
  }

  public record Item(
      UUID id,
      String title,
      String description,
      Type type,
      Priority priority,
      Status status,
      UUID teamId,
      String teamName,
      UUID assigneeId,
      String assigneeName,
      UUID createdBy,
      LocalDate dueDate,
      long version,
      Instant createdAt,
      Instant updatedAt) {}

  public record Create(
      @NotBlank @Size(max = 180) String title,
      @NotNull @Size(max = 10000) String description,
      @NotNull Type type,
      @NotNull Priority priority,
      @NotNull UUID teamId,
      LocalDate dueDate) {}

  public record Edit(
      @NotNull @PositiveOrZero Long version,
      @NotBlank @Size(max = 180) String title,
      @NotNull @Size(max = 10000) String description,
      @NotNull Type type,
      @NotNull Priority priority,
      UUID assigneeId,
      LocalDate dueDate) {}

  public record Version(@NotNull @PositiveOrZero Long version) {}

  public record Transition(@NotNull @PositiveOrZero Long version, @NotNull Status status) {}

  public record Comment(
      @NotNull @PositiveOrZero Long version, @NotBlank @Size(max = 4000) String body) {}

  public record Page<T>(List<T> items, String nextCursor) {}

  public record Event(
      long id,
      UUID actorId,
      String actorName,
      String eventType,
      Map<String, Object> details,
      Instant createdAt) {}

  public record CommentView(
      long id, UUID actorId, String actorName, String body, Instant createdAt) {}

  public record Filters(
      UUID teamId,
      Status status,
      Priority priority,
      UUID assigneeId,
      String q,
      LocalDate createdFrom,
      LocalDate createdTo,
      LocalDate dueFrom,
      LocalDate dueTo,
      String view,
      String cursor,
      int limit) {}
}
