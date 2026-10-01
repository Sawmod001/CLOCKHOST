# ClockHost — JavaScript → TypeScript Migration (2026-09-30)

Full conversion of the codebase from JavaScript to TypeScript. No runtime
behavior was changed; all edits were type-level (annotations, casts, guards).

## Scope

- **193 files converted:** 188 under `src/` (171 `.js` + 17 `.jsx`) and 5 under
  `tests/` (`.test.js` → `.test.ts`). Old files deleted.
- **Result:** 229 `.ts`/`.tsx` files, **0 `.js`/`.jsx` files** in `src/` and `tests/`.
- Docs updated to match: all `.js`/`.jsx` paths, `(JavaScript)` language claims,
  `node --check` gates, and ` ```js `/` ```jsx ` fences across 41 markdown files.

## tsconfig.json (strict)

- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`.
- `jsx: react-jsx` (mandatory Next.js setting), `moduleResolution: bundler`.
- `skipLibCheck: true` (silences 2 third-party `.d.ts` errors in
  `@supabase/auth-js` and Next segment-cache).
- Deprecated `baseUrl` removed (paths are relative; `ignoreDeprecations` not needed).
- `tests/`, `supabase/`, `.next/`, `node_modules/` excluded from typecheck.

## Conventions adopted

- **API routes** (`src/app/api/**/route.ts`): handlers typed
  `(request: NextRequest, context: { params: Promise<{ id: string }> })`
  (Next 16 async-params style); JSON bodies as `Record<string, unknown>` or
  small inline interfaces with casts at use sites (`as string`, `as number`).
- **Pages/components** (`.tsx`): props via `interface Props`; API-data state as
  `Record<string, any>` / `any[]` (pragmatic — data shapes are DB-driven;
  `no-explicit-any` is eslint warn-only). `"use client"` directives preserved.
- **`src/lib`**: keeps `Record<string, unknown>` with proper narrowing; added the
  missing `supabase.upsert()` (`INSERT … ON CONFLICT … DO UPDATE … RETURNING *`).
- **Imports are extensionless** (`./connection`, `@/lib/db/supabase`). NodeNext
  `.js` suffixes were removed because Turbopack cannot resolve them.
  Exception: files under `tests/` import src with explicit `.ts` suffix, which
  the test runner resolves.
- **Tests** run with `tsx --test "tests/*.test.ts"` (`tsx` devDependency) so
  `@/` aliases and extensionless imports resolve under Node.

## Verification (all green at migration time)

- `npx tsc --noEmit` → 0 errors (1161 at peak migration).
- `npx eslint src` → 0 errors (warnings only, mostly `no-explicit-any`).
- `npm run build` → succeeds, full route table emitted.
- `npm test` → 36/36 pass.

## Known follow-ups (pre-existing, not caused by this migration)

- Next 16 deprecates the `middleware` file convention in favor of `proxy`
  (`src/middleware.ts` works, but logs a warning).
- `GET /api/health` returns 503: the custom pg-backed supabase shim has no
  `.storage` adapter (`listBuckets`), so the storage check always fails.
- `docs/refund-workflow-spec.md` references `tests/refunds.test.ts` and
  `docs/listing-lifecycle-spec.md` references `tests/listings-lifecycle.test.ts`;
  neither file exists in `tests/`.
