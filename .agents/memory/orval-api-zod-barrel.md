---
name: Orval api-zod barrel collision fix
description: How to prevent TS2308 collision between Zod schemas and TypeScript types in api-zod barrel when query parameters are present.
---

## The Problem

When any endpoint has query parameters, Orval generates:
- `ListRecordsParams` Zod schema in `lib/api-zod/src/generated/api.ts`
- `ListRecordsParams` TypeScript interface in `lib/api-zod/src/generated/types/listRecordsParams.ts`

The barrel `lib/api-zod/src/index.ts` re-exports both, causing:
```
error TS2308: Module "./generated/api" has already exported a member named 'ListRecordsParams'.
```

## The Fix

1. Remove `schemas: { path: "generated/types", type: "typescript" }` from the `zod` output in `lib/api-spec/orval.config.ts` — this stops generating the `generated/types/` folder.

2. Patch the codegen script in `lib/api-spec/package.json` to overwrite the stale barrel after Orval runs (Orval regenerates it with the old `export * from './generated/types'` because `clean: true` only cleans `generated/`, not the barrel):

```json
"codegen": "orval --config ./orval.config.ts && node -e \"require('fs').writeFileSync('../../lib/api-zod/src/index.ts', \\\"export * from './generated/api';\\\\n\\\")\" && pnpm -w run typecheck:libs"
```

**Why:** The server only needs Zod schemas (values), not the TypeScript interfaces (types). TypeScript types can be derived from Zod schemas with `z.infer<>` anyway. The `schemas` option generates a redundant parallel set of TS interfaces that always collide with the Zod schema names for query parameters.

**How to apply:** Any time this workspace runs codegen. The fix is already baked into the codegen script and orval.config.ts. Don't add back the `schemas` key or `export * from "./generated/types"`.
