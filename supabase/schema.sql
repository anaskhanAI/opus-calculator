-- Opus Pricing Calculator — Database Schema v1.0
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Execute the full script in one go.

-- ─── EXTENSIONS ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── PROFILES TABLE ──────────────────────────────────────────────────────────
-- Extends auth.users. Created automatically on sign-up via trigger below.
create table if not exists public.profiles (
  id        uuid references auth.users(id) on delete cascade primary key,
  email     text not null,
  full_name text,
  role      text not null default 'seller' check (role in ('seller', 'admin')),
  created_at timestamptz default now()
);

-- ─── QUOTE REFERENCE SEQUENCE ────────────────────────────────────────────────
-- Produces human-readable refs: QT-2026-0001, QT-2026-0002, ...
create sequence if not exists quote_ref_seq start 1;

-- ─── QUOTES TABLE ────────────────────────────────────────────────────────────
create table if not exists public.quotes (
  id             uuid default uuid_generate_v4() primary key,
  quote_ref      text not null unique,
  seller_id      uuid references public.profiles(id) not null,
  seller_name    text not null,    -- denormalised: audit record survives user deletion
  seller_email   text not null,    -- denormalised: audit record survives user deletion
  project_name   text not null,
  client_name    text not null,
  calculator_mode text not null check (calculator_mode in ('detailed', 'simple')),
  model_version  text not null default 'v1.2',
  inputs         jsonb not null,   -- immutable snapshot of all inputs
  outputs        jsonb not null,   -- immutable snapshot of all outputs
  total_price    numeric,
  total_weeks    numeric,
  total_hours    numeric,
  notes          text,
  status         text not null default 'submitted' check (status in ('draft', 'submitted')),
  created_at     timestamptz default now()
);

-- ─── TRIGGER: AUTO-GENERATE QUOTE REF ────────────────────────────────────────
create or replace function generate_quote_ref()
returns trigger as $$
begin
  new.quote_ref := 'QT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('quote_ref_seq')::text, 4, '0');
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_quote_ref on public.quotes;
create trigger set_quote_ref
  before insert on public.quotes
  for each row execute function generate_quote_ref();

-- ─── TRIGGER: AUTO-CREATE PROFILE ON SIGN-UP ─────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.quotes enable row level security;

-- Drop existing policies before recreating (safe to re-run)
drop policy if exists "Users can view own profile"    on public.profiles;
drop policy if exists "Admins can view all profiles"  on public.profiles;
drop policy if exists "Users can update own profile"  on public.profiles;
drop policy if exists "Sellers can view own quotes"   on public.quotes;
drop policy if exists "Sellers can insert own quotes" on public.quotes;

-- Profiles: each user reads their own row
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Profiles: each user can update their own name
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Quotes: sellers only see their own quotes
create policy "Sellers can view own quotes"
  on public.quotes for select
  using (seller_id = auth.uid());

-- Quotes: sellers can only insert quotes assigned to themselves
create policy "Sellers can insert own quotes"
  on public.quotes for insert
  with check (seller_id = auth.uid());

-- Admin access is handled server-side via the SUPABASE_SERVICE_ROLE_KEY,
-- which bypasses RLS entirely. No admin RLS policy is needed or wanted.

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
create index if not exists quotes_seller_id_idx   on public.quotes(seller_id);
create index if not exists quotes_created_at_idx  on public.quotes(created_at desc);
create index if not exists quotes_status_idx      on public.quotes(status);

-- ─── PRICING GUIDE CONFIG ─────────────────────────────────────────────────────
-- Single-row table that stores the current pricing guide HTML content.
-- Admins upload a new HTML file from within the app and all users see it instantly.
-- The API route at POST /api/pricing-guide patches the HTML for light-mode and upserts here.
create table if not exists public.pricing_guide_config (
  id           int primary key default 1,
  html_content text not null default '',
  updated_at   timestamptz default now(),
  updated_by   text
);

alter table public.pricing_guide_config enable row level security;

-- Any authenticated user can read (the API route also uses service role, but this
-- allows future direct reads if needed)
drop policy if exists "Authenticated can read pricing guide config" on public.pricing_guide_config;
create policy "Authenticated can read pricing guide config"
  on public.pricing_guide_config for select
  using (auth.role() = 'authenticated');

-- Seed the single config row (safe to re-run)
insert into public.pricing_guide_config (id, html_content, updated_by)
values (1, '', 'system')
on conflict (id) do nothing;

-- ─── PRICING CONFIG ───────────────────────────────────────────────────────────
-- Single-row table that stores all calculator pricing constants as JSONB.
-- Follows the same pattern as pricing_guide_config (id=1, upsert-on-save).
-- If the row is missing, pricing-engine.ts falls back to DEFAULT_PRICING_CONFIG.
create table if not exists public.pricing_config (
  id         int primary key default 1,
  config     jsonb not null default '{}',
  updated_at timestamptz default now(),
  updated_by text
);

alter table public.pricing_config enable row level security;

-- Any authenticated user can read (calculator fetches this client-side via anon key)
drop policy if exists "Authenticated can read pricing config" on public.pricing_config;
create policy "Authenticated can read pricing config"
  on public.pricing_config for select
  using (auth.role() = 'authenticated');

-- Writes are done server-side via the service role key — no insert/update policy needed.

-- Seed the single config row (safe to re-run; does not overwrite existing config)
insert into public.pricing_config (id, config, updated_by)
values (1, '{}', 'system')
on conflict (id) do nothing;

-- ─── GM CONFIG ────────────────────────────────────────────────────────────────
-- Single-row table storing GM calculator defaults (target margin, approval bands,
-- default role definitions with daily cost and standard rate).
create table if not exists public.gm_config (
  id         int primary key default 1,
  config     jsonb not null default '{}',
  updated_at timestamptz default now(),
  updated_by text
);

alter table public.gm_config enable row level security;

drop policy if exists "Authenticated can read gm config" on public.gm_config;
create policy "Authenticated can read gm config"
  on public.gm_config for select
  using (auth.role() = 'authenticated');

insert into public.gm_config (id, config, updated_by)
values (1, '{}', 'system')
on conflict (id) do nothing;

-- ─── GM SCENARIOS ─────────────────────────────────────────────────────────────
-- Saved GM discount analysis snapshots. May be linked to a pricing quote.
create table if not exists public.gm_scenarios (
  id           uuid default uuid_generate_v4() primary key,
  quote_id     uuid references public.quotes(id) on delete set null,
  quote_ref    text,
  client_name  text,
  project_name text,
  inputs       jsonb not null,
  outputs      jsonb not null,
  notes        text,
  created_at   timestamptz default now(),
  created_by   text
);

alter table public.gm_scenarios enable row level security;

drop policy if exists "Admins can read gm scenarios" on public.gm_scenarios;
create policy "Admins can read gm scenarios"
  on public.gm_scenarios for select
  using (auth.role() = 'authenticated');

create index if not exists gm_scenarios_quote_id_idx  on public.gm_scenarios(quote_id);
create index if not exists gm_scenarios_created_at_idx on public.gm_scenarios(created_at desc);

-- ─── GRANT ADMIN ACCESS ───────────────────────────────────────────────────────
-- After running this script, elevate a user to admin by running:
--
--   update public.profiles set role = 'admin' where email = 'director@yourcompany.com';
