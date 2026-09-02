# Kitchen Diaries Control Panel — Production Setup

## Purpose

This is the platform-admin application for Kitchen Diaries. It is intentionally separate from the customer POS application.

Both projects use the same PostgreSQL database so the control plane can manage restaurants, subscriptions, activation codes and devices created by the POS.

## Required environment

Copy `.env.example` to `.env` and set:

- `DATABASE_URL` — same value as the POS project.
- `DIRECT_URL` — same value as the POS project.
- `CONTROL_JWT_SECRET` — a separate 32+ character secret.
- `CONTROL_ADMIN_EMAIL`
- `CONTROL_ADMIN_PASSWORD`
- `CONTROL_ADMIN_NAME`

## Local setup

Install packages:

```powershell
npm install
```

Generate Prisma client:

```powershell
npm run db:generate
```

If the POS project has already run the clean database setup, do **not** reset the database here. Run:

```powershell
npm run db:seed:admin
npm run dev
```

The control panel prefers `http://localhost:3001/control/login`. If 3001 is already occupied locally, the runner automatically selects the next free port between 3002 and 3010 and prints the selected URL.

To require a specific port instead of allowing local fallback:

```powershell
$env:PORT=3005
npm run dev
```

When `PORT` is explicitly set, the runner will fail rather than silently choosing another port if that exact port is unavailable.

## Production

The POS repository is the **single migration owner** for the shared PostgreSQL database. Apply `prisma migrate deploy` from the POS project first. Do not run historical Control Panel migrations independently against production.

Then deploy this Control Panel:

```powershell
npm ci
npm run db:generate
npm run db:seed:admin
npm run build
npm run start
```

Use a separate hostname from the POS, for example `control.example.com`, and keep `CONTROL_JWT_SECRET` different from the POS `JWT_SECRET`.

## License pricing

- Basic: ₹3,500 / 6 months; ₹4,999 / 12 months
- Pro: ₹5,999 / 6 months; ₹7,999 / 12 months
- Custom: custom duration and price

The control panel validates plan/duration combinations before creating a license and stores the configured price with the activation code and resulting subscription.

## Admin credentials for a fresh setup

Set unique credentials in `.env` before running the production seed:

- `CONTROL_ADMIN_EMAIL`
- `CONTROL_ADMIN_PASSWORD` (12+ characters; use a unique high-entropy password)
- `CONTROL_ADMIN_NAME`

The production seed refuses missing admin credentials and refuses the known development password `Admin@123456`.

## Checks

```powershell
npm run lint
npm run typecheck
npm run build
```
