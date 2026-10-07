# Starting a new product from this repo

Clone **this** starter, not OpsTrack.

1. Copy the repo. Rename `package.json` `name`, Docker service names in `docker-compose.yml`, and `COMPANY_*` in `lib/branding.ts`.
2. Use a new database and new `SESSION_SECRET` / `OTP_PEPPER`.
3. Add domain models in `prisma/schema.prisma`. For every tenant-owned model, add the Prisma name to `STRICT_SCOPED` (or `NULLABLE_SCOPED`) in `lib/db/scoped-models.ts`. Do **not** weaken `lib/db/extension.ts`.
4. Add keys in `lib/auth/permissions.ts`, seed them (seed upserts `ALL_PERMISSIONS`), and wire admin nav in `app/admin/(dashboard)/layout.tsx`.
5. Request handlers must bind tenant context via `requireTenantActor` / `enterContext`. Pages use `requireTenantPage` / `lib/db/page-context.ts`. Cross-tenant scripts use `lib/db/raw-client.ts` only.
6. Role assignment stays copy-at-assignment: applying a template copies permissions onto the user and does not propagate later template edits.

Keep platform SaaS (tenants, trials, subscriptions) unless the product is single-tenant.
