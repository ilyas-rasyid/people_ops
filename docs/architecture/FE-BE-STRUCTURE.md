# PeopleOps — FE / BE Structure Contract

This structure is adapted from the supplied `contoh_fe(1).zip` and `contoh_be(1).zip` reference projects. Their business rules and multi-scope security logic **are not copied** into this single-company HRIS.

## Workspace roots

- `fe/` — React, Vite, client-facing UI and feature folders.
- `be/` — Elysia, business services, persistence, and Prisma.
- `packages/contracts/` — safe, portable API contracts only.
- `infra/`, `scripts/`, `tests/`, `docs/` — separate supporting responsibilities.

Do not recreate `apps/web` or `apps/api`.

## Frontend feature pattern

```text
fe/src/features/employees/
├── pages/        # Route composition, page-level experience
├── components/   # Reusable employee-specific presentation
├── hooks/        # TanStack Query + UI state / mutations
└── services/     # HTTP requests and response handling
```

Every feature uses only the folders it actually needs. Shared primitives belong under `fe/src/shared`, never copied into each feature. `fe/src/app/router` owns route registration and access gates; React page files do not implement business authorization.

## Backend feature pattern

```text
be/src/features/leave/
├── handler/      # Route registration, request entry points
├── payload/      # Zod input schemas and eventual DTOs
├── policy/       # Pure business rules, where applicable
├── service/      # Domain operations and transaction orchestration
└── repository/   # Database queries and projections
```

An individual service file represents one cohesive operation group. New code must prefer these boundaries and must not add direct database imports in `handler/`.

## Formatting and source quality

- Prettier: 2 spaces, semicolons, double quotes, trailing commas, print width **100**.
- Keep every handwritten source and stylesheet under **350 lines**.
- `audit:readability` also rejects handwritten source lines longer than **120 characters**.
- Do not compress functions, loops, large conditional logic or JSX into one unreadable line.
- Do not split a function into meaningless one-line wrappers simply to beat line-count checks.
- Import paths and dependencies must respect FE/BE boundaries.
- Never create placeholder business functionality to make a screen look finished.

## Refactor mapping

| Before | After |
|---|---|
| `apps/web` | `fe` |
| `apps/api` | `be` |
| `app/App.tsx` with all routes | `app/App.tsx`, `app/router/ApplicationRoutes.tsx`, `SessionGuards.tsx` |
| Employee directory page with fetching/table/mobile UI | `pages/`, `hooks/`, `services/`, `components/` |
| Employee form page with queries and all fields | `pages/`, `hooks/`, `components/` |
| Attendance management page with correction dialog | `pages/`, `hooks/`, `components/` |
| Login page with form, promo, demo access, network logic | `pages/`, `components/`, `hooks/`, `services/` |
| Backend employee/leave/attendance/settings routes containing database mutations | Route-only `handler/` plus grouped `service/` and `payload/` |
| Employee / leave read queries in services | Dedicated `repository/` for read queries |
| Large global stylesheets | Ordered, smaller stylesheets in `fe/src/styles/` |

## Runtime notes

- Frontend dev server defaults to `localhost:5174`.
- Backend defaults to port `3001`; Vite `/api/v1` proxy points there.
- Postgres runs on localhost port `5434` in the development Compose stack.
- Prisma-generated client is intentionally absent from the source archive and must be generated with `bun run db:generate` after dependency install.
- Changes were checked with TypeScript syntax parsing and static audits. Full Bun/Prisma/PostgreSQL integration remains to be run locally.
