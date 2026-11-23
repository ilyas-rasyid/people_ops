# Reference mapping: provided school FE and BE ZIPs

The uploaded archives were inspected for **structure patterns**, not copied into the project.

## FE reference — `fe(10).zip`

Observed:

- `src/features/common/.../pages/`, `components/`, `hooks/`, `services/`,
  `schemas/`, `types/` as feature-owned modules.
- `src/shared/components/` and `src/shared/api/` for cross-feature concerns.
- `src/app/providers/` for application composition.
- `scripts/audit-file-length.mjs` and `scripts/audit-import-boundaries.mjs`.
- `prettier.config.mjs`: 2 spaces, double quotes, trailing commas.

PeopleOps adopts feature ownership, app-level composition, and automated source audits.
It deliberately omits the education platform's account/unit/school tenancy model.

## BE reference — `be_sekolah(2).zip`

Observed:

- Feature modules under `src/features/`.
- `handler/`, `service/`, `repository/`, `payload/`, and `shared/` layers.
- Prisma configuration and separated migration history.
- Repository structure auditing and dedicated unit/integration tests.
- Elysia entry point and Bun runtime conventions.

PeopleOps adopts focused backend layers when actual domain modules are implemented.
M0 only needs a small health handler and database-readiness adapter.

## Improvements over references

- Stronger handwritten file-length target: **350 lines**, not 500.
- Intentional multiline TSX and Prettier `printWidth: 100`.
- One canonical workspace lockfile and explicit cross-workspace import boundaries.
- No precreated empty domain directories and no generic mega-services.
- Strict single-company behavior, server sessions, and approved PeopleOps business rules.

These two ZIP archives were _read only_. Their code and assets are not redistributed
inside the PeopleOps project.
