# PeopleOps architecture and file boundaries

The PeopleOps structure follows the **patterns** in the provided FE and BE school
references. It does **not** copy their tenancy, school modules, tokens, or domain logic.

## Frontend

Future `fe/src/features/<feature>/` folders own pages, components, hooks,
services, schemas, types and constants as needed. Do not create empty directories.

## Backend

Future `be/src/features/<feature>/` folders separate:

- `handler`: transport routing, request/response handling.
- `service`: business operations and transactions.
- `repository`: database access.
- `payload`: request/response schemas.
- `policy`: authorization and domain eligibility rules.

## Shared contracts

`packages/contracts` must not import React, Prisma, Elysia, or PostgreSQL.
Public DTOs must never be the same object as ORM database models.

## M0 database

The health endpoint uses a small PostgreSQL pool to test connectivity.
Prisma is configured for future persistence and uses a disposable migration
fixture for M0 verification. No production business tables are created.

## Quality

Use Prettier, ESLint and strict TypeScript. Keep handwritten source <=350 lines.
Avoid cross-feature deep imports, giant components, and generic abstractions
that serve no current requirement.
