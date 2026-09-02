# Kitchen Diaries Offline-First Fixes

This revision is based on the uploaded `kd-app-main(4).zip` and the reported runtime/test results.

## Fixed in source
- Expanded the local entity Dexie transaction to include orderItems, kotItems and sync tables used by nested operations.
- Expanded pull-sync transaction scope to include all local business tables accessed during the transaction.
- Made pulled ADD_PAYMENT application idempotent for locally queued operations instead of adding the same payment twice.
- Changed retryable outbox failures to retry indefinitely with capped backoff; terminal failures remain FAILED.
- Added a v7 Dexie schema version for the retryable flag.
- Added an 8-second timeout to sync push/pull/ack requests so a dead backend does not occupy the UI indefinitely.
- Reduced background sync cadence to 120 seconds.
- Offline access guard now evaluates the local lease even when navigator.onLine is true.
- Server-rendered dashboard pages that do not require server data no longer call PostgreSQL merely to render.
- Orders page no longer performs a server-side query/prefetch before rendering.
- Service-worker navigation fallback now uses a dedicated /offline page instead of returning /orders/new or another unrelated application route.
- Added Prisma generation as pretypecheck/pretest:unit/prebuild so stale generated clients do not produce hundreds of false type errors.

## Important verification
Run:
  npm ci
  npm run typecheck
  npm run test:unit
  npm run build

The uploaded test output showed 473 TypeScript errors caused primarily by a stale/incompatible generated Prisma client, including missing Role, Decimal, InputJsonValue and other generated members. This project contains the matching Prisma schema and package versions; the verification scripts now force `prisma generate` before typecheck, unit tests and build.

A full three-day offline implementation for every dashboard feature is not proven by this patch. Pages whose business data is still only server-backed need their feature-level reads/writes migrated to IndexedDB/outbox before claiming complete 3-day offline coverage.
