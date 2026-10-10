<<<<<<< HEAD
# hr-pal
=======
# Next js Saas Template
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a

Multi-tenant Next.js starter extracted from OpsTrack: auth, tenant isolation, platform SaaS, and Paystack as payment infrastructure. Domain features (fleet, stations, client fuel) are not included.

## Stack

- Next.js App Router, Prisma 7, PostgreSQL
- Platform host + tenant subdomains (`proxy.ts`)
- Copy-at-assignment role templates
- Fail-closed tenant Prisma extension (`lib/db/extension.ts`)

## Setup

```bash
cp .env.example .env
# Set DATABASE_URL, APP_DOMAIN, SESSION_SECRET, OTP_PEPPER,
# PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD, and SMTP_*
npm install
npx prisma generate
npm run db:seed
npm run dev
```

- Platform admin: `http://$APP_DOMAIN/auth/login`
- Tenant admin: `http://{slug}.$APP_DOMAIN/admin/auth/login` (or the path your `proxy.ts` maps)

<<<<<<< HEAD
Optional: `PAYSTACK_SECRET_KEY` for checkout and `/api/webhooks/paystack`. Paid plans apply when `charge.success` includes `metadata.tenantId` and `metadata.planKey`. Use `npm run db:migrate` for versioned Prisma migrations in new environments; `db:push` remains for local additive sync.
=======
Optional: `PAYSTACK_SECRET_KEY` for webhook signature verification at `/api/webhooks/paystack`. Tenant subscriptions are still recorded manually by platform admins.
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a

## Conventions

See [AGENTS.md](AGENTS.md) and [STARTER.md](STARTER.md).
