# ADR-002 — Prisma v7 migration baseline

**Status:** Proposed pin, requires installation verification.

## Decision

Pin Prisma ORM **7.10.0** for M0, using a `prisma7.config.ts`
configuration and PostgreSQL 17 for the reference database.

The uploaded school backend uses Prisma v7.10.0. The v7 documentation
uses a `prisma-client` generator and datasource URL in its config file.

## Restrictions

- Do not silently upgrade to Prisma v8 CLI syntax.
- Do not put the 19 HR business models into M0.
- Migration rehearsal occurs only against disposable `peopleops_test`.
- Do not place fixture migrations in the production migration directory.
- Verify Prisma CLI behavior and update this ADR using **executed evidence**.

The pinned version is a design choice, not a claim of successful
installation or compatibility testing in this environment.
