# Kitchen Diaries Production Audit & Remediation
Date: 2026-09-02

## Scope
Reviewed the uploaded `kitchen-diaries-main` POS/PWA and `kd-admin-main` control panel, focusing on production blockers, Prisma consistency, tenant isolation, authentication, offline-first behavior, synchronization, PWA caching, and deployment configuration.

## Critical findings found

1. **Prisma schema/migration drift — CRITICAL**
   - `BillRefund.restaurantId` existed in the Prisma schema but not in the initial migration.
   - `KOT` / `KOTItem` and `KOTStatus` were absent from the migration despite being in the schema.
   - Several hardening columns were only partially represented in the merged migration.
   - This directly explains the build/runtime mismatch around `BillRefund`.
   - Remediated in the supplied POS migration.

2. **Offline KOT could never synchronize — CRITICAL**
   - Offline KOT creation existed locally, but the server sync processor had no KOT handler.
   - Remediated with CREATE and REPRINT processing plus tenant/device checks.

3. **Offline document numbers were not actually server-reserved — CRITICAL**
   - Local order/bill/KOT code could fall back to `OFF-*` numbers.
   - There was a reservation model but no reservation API/flow.
   - Remediated by adding server-side range reservation and client prefetching.
   - Offline order/bill/KOT/receipt numbers now require a reserved range instead of silently inventing a number.

4. **Sync push device spoofing risk — HIGH**
   - An authenticated POS user could submit a sync operation naming another active device in the same restaurant.
   - Remediated by binding sync push requests to the `x-device-id` header and the authenticated tenant.

5. **Refund application/schema mismatch — HIGH**
   - Refund creation omitted required `restaurantId`.
   - Remediated in the billing adjustment action.

6. **Main POS login rate limiting — implemented**
   - IP and account rate limits use the shared database-backed bucket and hashed storage keys.

7. **Admin seed safety — PASS**
   - Admin seed uses an upsert and does not delete existing control-plane data.
   - Production requires explicit admin credentials and rejects the known demo password.

8. **Security headers/CSP — PARTIAL**
   - Security headers are present.
   - CSP still uses `unsafe-inline` for scripts. This is a hardening opportunity rather than an immediate functional blocker; move toward nonce/hash-based CSP before a strict security baseline.

9. **Environment examples — fixed**
   - Added POS `.env.example` and `.env.test.example`.
   - Removed stale README instructions that referenced a missing `.env.local.example`.

10. **Test coverage gap — HIGH**
    - Existing sync integration tests did not cover cross-tenant/device spoofing.
    - Full browser-level offline → reconnect → sync validation still needs to be executed on a real Chromium/PWA environment.

## Offline/PWA assessment

The architecture has a solid foundation:
- IndexedDB/Dexie persistence
- Durable outbox
- operation IDs/idempotency
- retry/backoff
- stale sync recovery
- Web Locks coordination
- pull cursor
- server ACK
- offline lease
- service-worker shell caching

The major missing pieces discovered were KOT server processing and real server-backed document reservations. Those are now included in this remediation.

### Important operational rule

A POS should first establish an online session and prefetch document-number ranges. If a range is exhausted while offline, the POS now fails the document creation with a clear reconnect/reservation message instead of generating an unsafe fallback number.

## Admin assessment

The Admin application correctly treats the POS repository as the owner of the shared database migration chain. Its control APIs require an active platform-admin session. Login is rate-limited and control cookies are HttpOnly/SameSite.

## Dependency vulnerabilities

The uploaded package manifests report:
- POS: 16 npm audit findings in the user's installation output.
- Admin: 3 high findings in the user's installation output.

These were intentionally not auto-fixed with `npm audit fix --force`, because forced dependency upgrades can introduce breaking changes. They should be reviewed after the functional/build baseline passes.

## Verification status

Static remediation and source-level consistency checks were performed on the uploaded projects.

A complete dependency-backed `npm run typecheck`, Vitest integration suite, Prisma migration against PostgreSQL, and Next production build could not be executed inside this packaging environment because dependency installation could not complete here.

Therefore the final acceptance commands on the user's machine are:

### POS

```powershell
npm ci
npm run db:generate
npx prisma validate
npm run db:reset
npm run typecheck
npm run lint
npm run test:all
npm run check:pwa
npm run build
```

### Admin

```powershell
npm ci
npm run db:generate
npm run typecheck
npm run lint
npm run build
npm run db:seed:admin:first
```

`db:reset` is destructive and must only be used against a disposable development/staging database.
