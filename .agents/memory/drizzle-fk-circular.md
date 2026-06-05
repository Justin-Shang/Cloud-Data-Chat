---
name: Drizzle FK circular reference in composite lib
description: .references() callback in Drizzle pgTable causes TS7022 implicit any in composite lib builds when the referenced table is in a separate file.
---

## The Problem

Using `.references(() => otherTable.id, { onDelete: "cascade" })` in a Drizzle `pgTable` definition inside a composite lib can cause:

```
error TS7022: 'recordsTable' implicitly has type 'any' because it does not have a type annotation and is referenced directly or indirectly in its own initializer.
```

This happens because TypeScript can't resolve the inferred type across the circular closure during `tsc --build`.

## The Fix

Use a plain `integer("column_name").notNull()` without `.references()`. The FK constraint is enforced at the DB level via `drizzle-kit push`, but not needed in the TypeScript type system.

```ts
// GOOD - plain integer, no FK in TypeScript
datasetId: integer("dataset_id").notNull(),

// BAD - causes TS7022 in composite lib builds
datasetId: integer("dataset_id").notNull().references(() => datasetsTable.id, { onDelete: "cascade" }),
```

**Why:** The `.references()` callback creates a dependency on `datasetsTable` at type inference time, which can form a cycle that tsc can't resolve during incremental composite builds.

**How to apply:** In `lib/db/src/schema/*.ts`, always use plain integer columns for FKs. The actual FK constraint is applied via `drizzle-kit push` based on the column name convention.
