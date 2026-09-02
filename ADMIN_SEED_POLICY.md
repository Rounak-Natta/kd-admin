# Admin seed policy

`npm run db:seed:admin:first` is an idempotent provisioning command. It upserts one admin by email and never deletes other control admins or business data.

In production, `CONTROL_ADMIN_EMAIL` and `CONTROL_ADMIN_PASSWORD` are mandatory and the password must be at least 12 characters.
