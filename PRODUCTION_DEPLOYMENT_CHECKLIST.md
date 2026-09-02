# Admin production checklist

- Configure a unique `CONTROL_JWT_SECRET` and admin credentials.
- Run shared PostgreSQL migrations from `kd-app` only.
- `npm ci`
- `npm run db:generate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Provision an admin with `npm run db:seed:admin:first`; it upserts by email and never deletes other admins.
- Verify login/rate-limit/logout and all protected control APIs.
