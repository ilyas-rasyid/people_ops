# M0 Foundation — implementation handoff

**Authority:** Frozen Master PRD MVP v1.0 and approved file-structure addendum.

## Scope

Implement **B-001–B-007 only**: monorepo, FE/BE bootstrap, code quality,
local PostgreSQL, Prisma migration workflow, contracts, and CI.

Never implement authentication, employees, attendance, leave, dashboards,
or full business database schema during M0.

## Checkpoints

| Stage | Deliverable                                          |
| ----- | ---------------------------------------------------- |
| CP-0  | Toolchain/version ADRs                               |
| CP-1  | Bun workspaces and root scripts                      |
| CP-2  | React/Vite and Elysia foundation                     |
| CP-3  | PostgreSQL and isolated Prisma migration rehearsal   |
| CP-4  | Shared contracts, strict checks and meaningful tests |
| CP-5  | GitHub Actions CI and verification report            |

## Local verification sequence

1. Install Bun and Docker.
2. Copy `.env.example` to `.env`, replace the local password consistently.
3. Run `bun install` and commit the generated `bun.lock`.
4. Run `bun run format`, inspect changes, then `bun run check`.
5. Run `bun run infra:up`.
6. Run `bun run test` and `bun run test:structure`.
7. Run `bun run test:integration`.
8. Run `bun run build`.
9. Run `bun run dev` and check browser/health endpoints.
10. Push a branch and inspect GitHub Actions results.
11. Document actual results for M0-AC01–M0-AC24.

## Definition of Done

- Every M0 acceptance criterion has real evidence.
- Build and tests actually executed and passed.
- No HR business features exist yet.
- No missing credentials/unsafe database commands.
- No handwritten file >350 lines.
- No fake dashboard/UI or mocked success.

**Stop after M0. M1 requires separate authorization.**
