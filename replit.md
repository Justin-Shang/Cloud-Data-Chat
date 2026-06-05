# 数据库对话助手 (Data Chat Assistant)

A web app for uploading Excel files into a database and querying data through a conversational chat interface.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/data-chat run dev` — run the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- File parsing: `xlsx` (Excel), `multer` (multipart uploads)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — DB tables: datasets, records, chat_messages
- `artifacts/api-server/src/routes/` — datasets.ts, records.ts, chat.ts
- `artifacts/data-chat/src/` — React frontend

## Architecture decisions

- File uploads use raw fetch with FormData (not Orval-generated hook) because multipart/form-data doesn't fit Orval's typed body schema generation for Node.js Zod
- `lib/api-zod/src/index.ts` only exports `generated/api` (not types) to avoid `ListRecordsParams` name collision between Zod schemas and TypeScript interfaces
- The codegen script patches the api-zod barrel after Orval runs to prevent the stale `export * from './generated/types'` line
- Keyword search uses PostgreSQL `ILIKE` on the JSONB field cast to text — simple and works for any column structure
- Records table uses integer FK (no Drizzle `.references()`) to avoid TypeScript circular reference issues

## Product

- Dashboard with stats (total datasets, records, columns) and recent uploads
- Datasets page: upload Excel (.xlsx/.xls), list datasets, delete with confirmation
- Dataset viewer: paginated table with dynamic columns and keyword filter
- Chat Assistant: conversational search — type a message/keyword, get matching records inline

## Gotchas

- After any OpenAPI spec change, run codegen AND the barrel fix runs automatically: `pnpm --filter @workspace/api-spec run codegen`
- DB push required after schema changes: `pnpm --filter @workspace/db run push`
- Do NOT re-add `export * from "./generated/types"` to `lib/api-zod/src/index.ts` — it causes TS2308 collision

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
