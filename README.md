# ClinicBook SaaS

Multi-tenant appointment booking platform for **clinics**, **gyms**, and **tutors**, with Stripe-style billing, role-based access, and an admin dashboard.

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- In-memory demo store (swap for Postgres + Prisma in production)
- Stripe SDK with automatic **mock client** when `STRIPE_SECRET_KEY=sk_test_mock`

## Quick start

```bash
cd clinicbook-saas
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo tenants

| Slug | Business |
|------|----------|
| `riverside-clinic` | Riverside Family Clinic |
| `ironpeak-gym` | Iron Peak Athletics |
| `brightpath-tutoring` | BrightPath Tutoring |

Visit `/t/riverside-clinic` or use subdomain mock via middleware (`riverside.localhost` rewrite).

## Features

1. **Multi-tenant orgs** — slug/path and subdomain header resolution (`src/lib/tenants/`, `src/middleware.ts`)
2. **Providers & availability** — weekly windows + generated slots (`src/lib/availability/`)
3. **Booking flow** — book, reschedule, cancel with conflict detection (`src/lib/appointments/`)
4. **Customers** — list + create (`src/lib/customers/`, `/api/customers`)
5. **Stripe billing** — checkout sessions, webhook handler, plan upgrades (`src/lib/billing/`, `src/lib/stripe/`)
6. **Plans** — Free / Pro / Enterprise with seat limits (`src/data/plans.ts`)
7. **Admin dashboard** — MRR, tenants, bookings (`/admin`)
8. **Email stubs** — console outbox (`src/lib/email/notifications.ts`)
9. **Roles** — owner, staff, client; demo login at `/demo`

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run typecheck` — TypeScript without emit

## API routes

| Route | Purpose |
|-------|---------|
| `POST /api/appointments` | Create booking |
| `POST /api/appointments/reschedule` | Reschedule |
| `POST /api/appointments/cancel` | Cancel |
| `POST /api/customers` | Add customer |
| `POST /api/billing/checkout` | Stripe checkout session |
| `POST /api/webhooks/stripe` | Subscription events |
| `GET /api/tenants` | List tenants |

## Project layout

```
src/
  app/           # App Router pages & API
  components/    # UI, booking, billing, dashboard
  data/          # Sample tenants & plans
  hooks/         # Client hooks
  lib/           # Tenants, billing, stripe, auth, email
  types/         # Shared TypeScript models
```

## Production notes

Replace `src/lib/store.ts` with a real database, enforce auth on API routes, and use live Stripe keys. Wire `POST /api/webhooks/stripe` to your Stripe dashboard endpoint with the signing secret.