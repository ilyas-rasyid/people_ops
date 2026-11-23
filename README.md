# PeopleOps HRIS

A single-company HR information system with role-aware access, employee records,
server-recorded attendance, annual/unpaid leave, managerial approvals, and audit history.

**Stack:** React 19 · Vite · TypeScript · Bun · Elysia · PostgreSQL · Prisma 7.
**Design:** Balanced Compact enterprise UI, blue/slate, no fake KPI charts or placeholder workflows.

> **Verification notice:** This source was authored in a container without Bun, Docker, or
> access to the npm registry. The TypeScript/TSX syntax, import boundaries, and source
> length audits passed, but install/build/runtime/database migrations were **NOT RUN**.
> Do not call this a tested production release until the checks below pass locally.

## Getting started (Ubuntu / Linux)

Requirements: Bun compatible with the pinned packages, Docker Engine + Compose, Git.

1. Extract the archive and open a terminal inside `peopleops/`.
2. Copy `.env.example` to `.env`.
3. Replace `replace-with-unique-local-only-password` consistently in
   `POSTGRES_PASSWORD`, `DATABASE_URL`, and `TEST_DATABASE_URL`.
4. Set `SESSION_SECRET` to a random string of 32+ characters before any real deployment.
5. Run the following commands in order:

```bash
bun install
bun run infra:up
bun run db:migrate
bun run db:generate
bun run db:constraints
bun run db:seed
bun run format
bun run dev
```

Visit the Vite URL printed by the terminal (usually `http://localhost:5173`;
port 5174 is possible if 5173 is already occupied).

The first `db:migrate` creates the initial migration from the 19-entity Prisma schema.
**Review and commit the created migration and `bun.lock`.** Do not discard the migration
history after your first successful setup.

### Synthetic local demo credentials

| Role                | Email                  | Password             |
| ------------------- | ---------------------- | -------------------- |
| HR Admin            | `hr@example.com`       | `PeopleOpsDemo!2026` |
| HR Admin (fallback) | `hr2@example.com`      | `PeopleOpsDemo!2026` |
| Manager             | `manager@example.com`  | `PeopleOpsDemo!2026` |
| Employee            | `employee@example.com` | `PeopleOpsDemo!2026` |

These credentials are for **local synthetic demo data only**. Do not use them
with real employees or expose this database publicly. The demo seed is disabled
when `APP_ENV=production`.

## Project organization

- `apps/web/src/app`: routing, authentication provider, page shell.
- `apps/web/src/features`: pages/components by business feature.
- `apps/web/src/shared`: API client, reusable controls, data types.
- `apps/web/src/styles`: separately maintained layout, component and page CSS.
- `apps/api/src/features`: backend handlers, services, domain policies and schemas.
- `apps/api/src/commons`: validation, error handling and route dispatch.
- `apps/api/src/database`: Prisma Client, synthetic seed, annual provisioning.
- `apps/api/prisma`: 19-entity schema and PostgreSQL-specific guardrails.
- `packages/contracts`: portable API response contracts.
- `infra/compose`: local PostgreSQL.
- `infra/deploy`: reference container deployment configuration.

### Formatting and structure

All handwritten TS, TSX, JS and support files are modular. The audit enforces a
**350-line ceiling**. Prettier defines line breaks, 2-space indentation, and
consistent quote style. Business rules live on the backend; React files
compose data queries and user interfaces rather than calculating official leave balances.

## Verification

After `bun install` and database bootstrap:

```bash
bun run db:validate
bun run check
bun run test
bun run test:structure
bun run test:integration
bun run build
bun run ci
```

`bun run ci` is the local equivalent of the foundation CI suite; complete browser
E2E, load testing, migration rollback drills, and independent security auditing
must be performed before a production claim.

## Data model and annual entitlements

Prisma schema contains the 19 entities frozen in the Master PRD. Annual leave
uses append-only ledger events and ACTIVE/CONSUMED/RELEASED reservations.
The initial seed grants current and next-year entitlements to fictional employees.
For long-running deployments, run `bun run db:provision` using an operations
scheduler around annual rollover; the job is idempotent and must be monitored.

**PostgreSQL extensions:** `bun run db:constraints` applies reviewed constraints
for local development. In a real deployment, copy these safeguards into a
versioned Prisma migration before release; do not use the dev-only command
against production.

## Important limitations

- Runtime and functional correctness have **not yet been verified** in this environment.
- Security measures are implementation candidates, not an independently audited system.
- Full concurrency/E2E suites and backup/restore verification are still release gates.
- Manual attendance corrections require careful browser/company-timezone testing.
- One-time credentials returned to HR must be delivered through a verified channel.
- Rate limiting is in-memory and assumes a single backend instance; production use
  should include reverse-proxy protections.
- Demo account protections and reset automation must be added before publishing a
  writable shared internet demo.
- Deployment requires a domain/TLS, proper secrets, and operator-controlled backups.

For business rules and acceptance gates consult the Frozen Master PRD and M0
handoff documentation under `docs/handoff/`.
