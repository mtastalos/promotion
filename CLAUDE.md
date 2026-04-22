# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with auto-restart (ts-node-dev)
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled server
npm run migrate      # Apply pending SQL migrations (requires DATABASE_URL in env)
npm run typecheck    # Type-check without emitting
```

No test runner is configured yet.

## Architecture

Express/TypeScript backend for multi-platform social media automation. Strict layered pattern:

**Request flow**: Route handler → `authenticate` middleware (JWT) → `validate()` middleware (Zod) → Service → Repository → PostgreSQL

**Layers**:
- `src/routes/` — Thin handlers; mount under `/auth`, `/profiles`, `/posts`, `/media`, `/analytics`, `/queue`
- `src/services/` — Business logic; orchestrate across repositories
- `src/repositories/` — All SQL lives here; extend `BaseRepository` for `query`, `queryOne`, `queryMany`, `count` helpers
- `src/workers/` — Background jobs started in `server.ts`; `postScheduler.worker.ts` polls `post_queue` every 10s

**Key patterns**:
- All env vars validated at startup via Zod in `src/config/env.ts`; always import `env` from there, never `process.env` directly
- Errors attach `statusCode` property — `Object.assign(new Error('Not found'), { statusCode: 404 })` — caught by `error.middleware.ts`
- Social account tokens encrypted at rest with AES-256-GCM via `src/utils/encryption.ts`; format is `iv:authTag:ciphertext`
- Queue jobs claimed atomically with `SELECT ... FOR UPDATE SKIP LOCKED` to prevent double-processing across worker instances
- Database transactions via `withTransaction<T>(fn)` from `src/config/db.ts`

## Database

Hosted on Supabase (connection via `DATABASE_URL`). Migrations live in `src/db/migrations/` as numbered `.sql` files; the runner in `migrate.ts` auto-applies any unapplied files in sort order and tracks them in `schema_migrations`.

Core ownership chain: `users` → `profiles` → (`social_accounts`, `posts`, `ai_configurations`) → (`platform_post_instances`, `post_media`) → `post_queue` / `post_analytics`

## Platform Integrations

`src/services/platform/` contains stubs for Facebook, Instagram, and TikTok that implement `IPlatformClient`. These need real API calls; the interface contract is in `platform.interface.ts`. The `postScheduler.worker` calls them and handles retries with exponential backoff.

## Environment

Copy `.env.example` to `.env`. Required vars: `DATABASE_URL`, `JWT_SECRET` (32+ chars), `JWT_REFRESH_SECRET` (32+ chars), `ENCRYPTION_KEY` (exactly 64 hex chars). Startup fails fast with a Zod error if any are missing or malformed.
