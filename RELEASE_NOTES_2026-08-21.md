# Kitchen Diaries Control Panel — Production Hardening Release

## Fixed / added

- License generation now requires restaurant name, customer/owner name, customer email and customer phone.
- Optional sales/onboarding notes are stored with the activation license.
- Activation-code API validates plan, duration, device limit, customer identity, custom price and optional expiry server-side.
- The license table shows issued restaurant, customer and contact details.
- Restaurant administration now shows owner/customer contact, subscription state, device usage and richer account details.
- License pricing is aligned to the supplied KD specification: Basic ₹3,500/₹4,999 and Pro ₹5,999/₹7,999 for 6/12 months.
- Added production security headers, HSTS and no-store API caching policy.
- Production admin seeding refuses missing credentials or the known development password.
- Activation metadata is stored before a tenant exists and is consumed by the POS during first-time activation.

## Database migration ownership

The POS repository is the single migration owner for the shared PostgreSQL database. Deploy `20260821093000_activation_customer_metadata` from the POS project, then generate Prisma Client in this Control Panel. This avoids divergent historical migration chains between the two repositories.

## Release checks

```bash
npm ci
npm run db:generate
npm run verify
```

## Follow-up fixes

- Local `npm run dev` / `npm start` now avoid crashing on an already-used default port by selecting the next free local port unless `PORT` is explicitly pinned.
- Corrected stale pricing text in setup documentation.
