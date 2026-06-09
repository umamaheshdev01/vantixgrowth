# Vantix Dashboard — Project Context

Internal agency-operations dashboard for a video-production agency ("vantixgrowth").
Single-tenant, admin-driven. Tracks clients, employees, videos (production pipeline),
finances, and an activity audit trail.

> This file is a context primer so the codebase doesn't need to be re-read from scratch.
> Keep it updated when architecture/conventions change.

---

## Stack

- **Next.js 15** (App Router, RSC) + **React 19** + **TypeScript** (strict)
- **Prisma 7** with the **pg adapter** (`@prisma/adapter-pg`) → PostgreSQL on **Supabase**
- **Supabase Auth** for authentication (email/password). App user data lives in our own `users` table.
- **Tailwind CSS 3** + **shadcn/ui** (new-york style, neutral base) + Radix primitives + lucide icons
- **Zod 4** for request validation
- Deployed on **Vercel**
- Path alias: `@/*` → `src/*`

### Scripts
- `npm run dev` — Next dev server
- `npm run build` — `prisma generate && next build`
- `postinstall` — `prisma generate`
- (README mentions `npm run seed:admin` but the seed script was removed — see commit `7232a2f`. Admin users are now created via Supabase Auth + the settings/users API.)

### Env vars (names in `.env`, never commit values)
`DATABASE_URL` (pooler, used by app+Prisma), `DIRECT_URL` (direct, for migrations),
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## Directory map

```
src/
  app/
    (auth)/        login, forgot-password, reset-password  (+ shared layout)
    (dashboard)/   dashboard, clients, employees, videos, finance, settings
                   each list route has a [id] detail route; finance has /report
    api/           all backend route handlers (see below)
  components/
    ui/            shadcn primitives
    layout/        Sidebar, AdminGuard
    shared/        KPICard, PageShell, StatusBadge, TabBar, DetailPageHeader, EmptyState
    clients/ employees/ videos/ finance/   feature views (List/Detail/FormDrawer)
  context/AuthContext.tsx    client-side auth provider (Supabase session → /api/auth/me)
  hooks/           use-toast, useDashboardData
  lib/             see "Key lib files" below
  constants/ types/
generated/prisma/  Prisma client output (generated, gitignored conceptually) — output = ../generated/prisma
prisma/            schema.prisma + migrations/
```

---

## Data model (prisma/schema.prisma)

All PKs are UUID. All timestamps UTC. **Money is INTEGER rupees** (no decimals).
Tables use `@@map` to snake_case names.

- **User** (`users`) — auth+role. `role: admin|employee`, `status: active|inactive`.
  `password_hash` is the sentinel `'__SUPABASE_MANAGED__'` (passwords live in Supabase Auth, not here).
- **Client** (`clients`) — accounts, retainer, package tier, contract dates, status.
- **Employee** (`employees`) — 1:1 with User via `user_id`. Pay type/rate, employment type.
- **Video** (`videos`) — production tasks. FK to client + assigned editor (Employee).
  `status` is an 11-state pipeline enum. `assigned_at`/`revision_count` are backend-managed only.
- **VideoStatusHistory** (`video_status_history`) — append-only audit of every status transition.
- **FinanceEntry** (`finance_entries`) — income/expense ledger, optional client/employee FK.
- **ActivityLog** (`activity_log`) — append-only generic feed; `entity_id` is intentionally NOT a FK.
- **CompanySettings** (`company_settings`) — singleton row (`id=1`), agency-wide settings.

Most relations use `onDelete: Restrict` (no cascading deletes).

### VideoStatus pipeline (enum order)
`brief_received → footage_received → assigned → in_editing → internal_review →
sent_to_client → revisions_requested → in_revision → approved → delivered` (+ `cancelled`).

---

## Auth architecture (important — recently changed)

Two-layer: **Supabase Auth** holds credentials/sessions; our **`users` table** holds app
identity (role/status). They're linked by **email**.

- **Client side** (`src/context/AuthContext.tsx`):
  - `login()` → `supabase.auth.signInWithPassword` → then `GET /api/auth/me` to load the app profile.
  - If Supabase login works but no matching active `users` row → forced sign-out with a clear message.
  - Access token is mirrored into `src/lib/auth-token.ts` (in-memory) to avoid `getSession()`
    deadlocks inside `onAuthStateChange`. `src/lib/api.ts#apiFetch` reads it for the `Authorization` header.
- **Server side** (`src/lib/auth.ts`):
  - `resolveUser(req)` — validates Bearer token via Supabase, then looks up the `users` row by email.
  - `AuthInfraError` distinguishes infra failure (→ 503) from "token valid but no app user" (→ 401).
    This 401-vs-503 distinction is deliberate; preserve it.
  - `requireAuth(req)` / `requireAdmin(req)` — return the `AppUser` or a `NextResponse` error.
- **Route guards**: `(dashboard)/layout.tsx` redirects unauthenticated users to `/login`.
  `AdminGuard` further restricts admin-only pages (non-admins → `/videos`).

### User creation flow
Admins create users via `POST /api/settings/users`:
1. `supabaseAdmin.auth.admin.createUser(...)` with `force_password_change` metadata.
2. `prisma.user.create(...)` with `password_hash = '__SUPABASE_MANAGED__'`.
3. If step 2 fails, the auth user is rolled back (`deleteUser`).

> **History / gotcha:** Migration `20260608120000_auto_create_user_on_auth_signup` added a
> Postgres trigger `on_auth_user_created` on `auth.users` (+ function `public.handle_new_auth_user`)
> that auto-inserted a `public.users` row on every auth signup. **This trigger + function were
> dropped manually from the live DB on 2026-06-09** because user creation is handled explicitly in
> the API route. The migration file still exists in the repo — running `prisma migrate deploy`
> against a fresh DB would recreate the trigger. If that's not wanted, add a follow-up migration
> that drops it (or delete/neutralize the old migration).

---

## API conventions

All API routes live under `src/app/api/**/route.ts` and follow a consistent shape:

- **Auth first**: `const user = await requireAuth(req)` (or `requireAdmin`);
  `if (user instanceof NextResponse) return user`.
- **Validation**: Zod schema + `parseBody(schema, await req.json())` from `src/lib/validate.ts`
  → returns `{ data, error }`; return `error` (a 422 `NextResponse`) if present.
- **Responses**: helpers in `src/lib/response.ts` — `ok`, `created`, `paginated`,
  `badRequest`, `unauthorized`, `forbidden`, `notFound`, `unprocessable`, `validationError`,
  `serverError`, `serviceUnavailable`. Envelope: `{ success, data, error, meta?, details? }`.
- **Pagination/sort**: `parsePagination(url)` and `parseSort(url, allowed)` from `src/lib/paginate.ts`
  (page default 1, limit default 20 / max 100). Multi-value filters use `param[]` query keys.
- **Audit**: mutations write to `activityLog` where relevant (`entity_type`, `entity_id`, `user_id`, `action`).
- **Error handling**: handlers wrap logic in `try/catch` → `serverError()`.

### Route groups
- `api/auth/*` — login, logout, me, change-password, forgot-password, reset-password
- `api/clients/*`, `api/employees/*`, `api/videos/*`, `api/finance/*` — CRUD + nested actions
  (e.g. videos: `advance`, `change-status`, `revision-notes`, `history`; clients: `archive`,
  `notes`, `activity`, `finance`, `videos`)
- `api/dashboard/*` — kpis, pipeline, active-clients, recent-finance, upcoming-deadlines
- `api/settings/*` — company, profile, users (+ user activate/deactivate/reset-password)
- `api/export/*` — clients, finance, videos (CSV export)
- `api/upload` — file upload

---

## Key lib files

- `src/lib/prisma.ts` — singleton PrismaClient over a `pg.Pool` (max 5, SSL `rejectUnauthorized:false`
  for the Supabase pooler), cached on `globalThis`.
- `src/lib/supabase.ts` — `createSupabaseClient()` (anon, server), `createSupabaseAdmin()`
  (service role), and a browser `supabase` singleton (NEXT_PUBLIC keys).
- `src/lib/auth.ts` / `auth-token.ts` — see Auth section.
- `src/lib/response.ts` / `validate.ts` / `paginate.ts` — API helpers.
- `src/lib/api.ts` — client `apiFetch<T>` wrapper (adds Bearer token, parses envelope).
- Misc: `dateHelpers`, `formatCurrency`, `financeCategories`, `statusLabels`, `utils` (cn).

---

## Conventions / gotchas

- `next.config.ts` sets `serverExternalPackages: ['pg', '@prisma/adapter-pg', '@prisma/client']`
  — required for Prisma+pg to work in Next server runtime.
- Prisma client is generated to `generated/prisma` (NOT `node_modules`); import from
  `../../generated/prisma/client`. `generated/` is excluded from tsconfig.
- `package.json` `"type": "commonjs"` but Next/TS compile ESM — be mindful with config files.
- Money everywhere is integer rupees; format via `lib/formatCurrency`.
- Append-only tables (`video_status_history`, `activity_log`) are never updated after insert.
- The repo currently has a large amount of committed `.next/` build cache (in git status) — noise.
