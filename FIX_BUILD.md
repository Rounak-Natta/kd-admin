# kd-admin build fix

Removed the orphaned `src/lib/api-auth.ts`, which referenced authentication modules not present in this admin repository and was not imported anywhere.

Legacy dashboard pages that referenced missing feature components now redirect to the implemented `/control` panel.

No Prisma schema or database data is changed by this patch.
