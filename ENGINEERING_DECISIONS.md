# Engineering decisions

## 1. A modular monolith with explicit SQL
**Context:** A reviewer must understand correctness in a short demo.
**Options considered:** Microservices; JPA everywhere; one Spring Boot service with JDBC.
**Decision:** Package by responsibility in one Java 21 service; use Spring JDBC throughout.
**Reasoning:** SQL exposes row predicates, locking and stable ordering directly.
**Trade-offs:** More explicit mapping; fewer ORM conveniences.
**Consequences:** One deployment and transaction boundary; no distributed consistency claims.

## 2. PostgreSQL owns invariants
**Context:** Concurrency cannot depend on a single JVM.
**Options considered:** In-memory locks; application checks; database constraints and transactions.
**Decision:** Flyway migrations, foreign keys, domain checks and database transactions.
**Reasoning:** Multiple processes share the same integrity rules.
**Trade-offs:** PostgreSQL-specific SQL and real database tests.
**Consequences:** No H2 approximation or Hibernate schema updates.

Further decisions will be recorded with implementation and verified behavior.
