# ADR-001 — Bun workspace monorepo

**Status:** Accepted for M0.

## Decision

Use a Bun workspace with three code packages: `fe`, `be`,
and `packages/contracts`.

## Rationale

One company, one frontend, one modular backend and a shared API contract
are sufficient. Separate services and independent dependency managers
would add cost without improving this MVP.

## Consequences

- A **single root Bun lockfile**, generated during first live installation.
- The frontend cannot import server/database internals.
- The contracts package cannot depend on either app.
- CI verifies the same root quality commands used by developers.
