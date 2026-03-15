# Opus Pricing Calculator

Internal web application that replicates the Opus Delivery Pricing Calculator (Excel v1.2) as an isolated, auditable web tool for the pre-sales team.

## What It Does

- Sellers fill in the calculator (Detailed or Simple mode), see live pricing output, and generate a downloadable PDF quote
- Every quote is saved permanently to the database with a full snapshot of all inputs and outputs
- The Director of Solutions Delivery (admin) can view, filter, and export all quotes across all sellers

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Auth | Supabase Auth (magic link / email OTP) |
| Database | Supabase PostgreSQL + Row Level Security |
| PDF | jsPDF (client-side, no server) |
| Hosting | Vercel |

---

## Setup Instructions

### 1. Clone and install

```bash
git clone <your-repo-url>
cd opus-calculator
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **Settings > API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

### 3. Set up environment variables

Copy the example file:

```bash
cp .env.local.example .env.local
```

Fill in your values in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Important:** Never commit `.env.local`. The `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the browser.

### 4. Set up the database

1. In your Supabase dashboard, go to **SQL Editor > New Query**
2. Paste the full contents of `supabase/schema.sql`
3. Click **Run**

This creates:
- `profiles` table (extends Supabase auth users)
- `quotes` table (the permanent audit record)
- RLS policies (sellers see only their own quotes)
- Triggers for auto-generating quote refs (`QT-2026-0001`) and auto-creating profiles on sign-up

### 5. Set up Supabase Auth

1. In Supabase dashboard, go to **Authentication > URL Configuration**
2. Add your app URL to **Site URL**: `http://localhost:3000`
3. Add to **Redirect URLs**: `http://localhost:3000/auth/callback`
4. Go to **Authentication > Email** and ensure **Enable Email** is on
5. Magic link emails will use the built-in Supabase email (or configure a custom SMTP)

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`.

---

## Granting Admin Access

By default, all new users are `seller` role. To make a user an admin:

1. Go to Supabase dashboard > **SQL Editor**
2. Run:

```sql
update public.profiles set role = 'admin' where email = 'director@yourcompany.com';
```

Admin users get access to `/admin` — the full audit dashboard with all quotes, filters, and CSV export.

---

## Deploying to Vercel

1. Push the repo to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. In Vercel project settings, add all four environment variables from `.env.local`
4. Change `NEXT_PUBLIC_APP_URL` to your production URL (e.g. `https://opus-calculator.vercel.app`)
5. In Supabase Auth URL Configuration, add your production URL to both **Site URL** and **Redirect URLs**

---

## Project Structure

```
app/
  layout.tsx              Root layout
  page.tsx                Redirects to /login or /calculator
  login/page.tsx          Magic link login
  calculator/page.tsx     Main calculator (seller view)
  quotes/page.tsx         Seller's own quote history
  quotes/[id]/page.tsx    Single quote detail
  admin/page.tsx          Admin audit dashboard
  api/quotes/             POST (save), GET (list)
  api/quotes/[id]/        GET single quote
  api/quotes/export/      GET CSV export (admin only)
  auth/callback/          OTP exchange route

components/
  calculator/             Calculator UI components
  admin/                  Admin dashboard components
  quotes/                 Quote display components
  ui/                     Reusable primitives (Input, Select, etc.)

lib/
  pricing-engine.ts       ALL pricing logic — pure functions, Excel-exact
  pdf-generator.ts        Client-side PDF generation (jsPDF)
  types.ts                Shared TypeScript types
  supabase/               Supabase clients (browser, server, service role)

supabase/
  schema.sql              Full DB schema with RLS — run once in Supabase

middleware.ts             Route protection + admin role guard
```

---

## Pricing Model

The pricing engine (`lib/pricing-engine.ts`) replicates **v1.2** of the Excel calculator exactly. Every formula traces back to a specific cell:

| Component | Excel Cell | Formula Summary |
|---|---|---|
| Core weeks | H6/H25 | VLOOKUP on use case counts |
| Core hours (Detailed) | I6 | `weeks × 3 FTE × 5 days × 8 hrs` |
| Core hours (Simple) | I25 | `weeks × 3 FTE × 40 hrs` |
| Integration weeks (Detailed) | H7 | Weighted sum of 3×3 grid / 5 |
| Integration weeks (Simple) | H26 | Logarithmic scaling formula |
| Deployment | G8/H8 | IFS lookup table |
| Training | G9/H9 | Fixed: $20,000 / 1 week if Yes |
| Complexity | G10/H10 | Factor × (Core + Integration price) |

Model version is stored on every quote (`model_version: 'v1.2'`). When the pricing model changes, increment this version so historical quotes remain interpretable.

---

## Key Rules

- **Quotes are immutable.** Once saved, `inputs` and `outputs` are never modified. There is no edit or delete endpoint.
- **Service role key is server-side only.** It appears only in `app/api/` routes — never in client components.
- **RLS is always on.** Even if an API route has a bug, the database will reject cross-seller queries.
