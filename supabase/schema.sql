-- =============================================================
-- Dominia - Database Schema
-- Run this in Supabase SQL Editor (supabase.com/dashboard)
-- =============================================================

-- =====================
-- ENUMS
-- =====================

create type ssl_status as enum ('valid', 'expiring_soon', 'expired', 'error', 'unknown');
create type domain_status as enum ('active', 'expiring_soon', 'expired', 'error', 'unknown');
create type alert_type as enum ('ssl_expiry', 'domain_expiry', 'ssl_error', 'domain_error');

-- =====================
-- DOMAINS TABLE
-- =====================

create table domains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain_name text not null,
  created_at timestamptz not null default now(),
  ssl_expiry_date timestamptz,
  domain_expiry_date timestamptz,
  ssl_status ssl_status not null default 'unknown',
  domain_status domain_status not null default 'unknown',
  ssl_issuer text,
  domain_registrar text,
  last_checked timestamptz,
  public_token uuid unique,

  -- A user cannot monitor the same domain twice
  unique(user_id, domain_name)
);

-- Index for fast lookups by user
create index idx_domains_user_id on domains(user_id);

-- Index for public status page token lookup
create index idx_domains_public_token on domains(public_token)
  where public_token is not null;

-- Index for the cron job that checks expiring certificates
create index idx_domains_ssl_expiry on domains(ssl_expiry_date)
  where ssl_expiry_date is not null;

-- Index for the cron job that checks expiring domains
create index idx_domains_domain_expiry on domains(domain_expiry_date)
  where domain_expiry_date is not null;

-- =====================
-- ALERTS TABLE
-- =====================

create table alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain_id uuid not null references domains(id) on delete cascade,
  alert_type alert_type not null,
  sent_at timestamptz not null default now(),
  days_before_expiry integer not null,

  -- Prevent sending the same alert twice for the same expiry window
  unique(domain_id, alert_type, days_before_expiry)
);

create index idx_alerts_user_id on alerts(user_id);
create index idx_alerts_domain_id on alerts(domain_id);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

-- Enable RLS on both tables
alter table domains enable row level security;
alter table alerts enable row level security;

-- ----- DOMAINS policies -----

-- Users can read only their own domains
create policy "Users can view own domains"
  on domains for select
  using (auth.uid() = user_id);

-- Users can insert domains for themselves only
create policy "Users can insert own domains"
  on domains for insert
  with check (auth.uid() = user_id);

-- Users can update only their own domains
create policy "Users can update own domains"
  on domains for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can delete only their own domains
create policy "Users can delete own domains"
  on domains for delete
  using (auth.uid() = user_id);

-- ----- ALERTS policies -----

-- Users can read only their own alerts
create policy "Users can view own alerts"
  on alerts for select
  using (auth.uid() = user_id);

-- Users can insert alerts for themselves only
create policy "Users can insert own alerts"
  on alerts for insert
  with check (auth.uid() = user_id);

-- Users can delete only their own alerts
create policy "Users can delete own alerts"
  on alerts for delete
  using (auth.uid() = user_id);

-- =====================
-- DOMAIN CHECKS HISTORY
-- =====================

create table domain_checks_history (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references domains(id) on delete cascade,
  ssl_status ssl_status not null,
  domain_status domain_status not null,
  ssl_expiry_date timestamptz,
  domain_expiry_date timestamptz,
  checked_at timestamptz not null default now()
);

create index idx_checks_history_domain on domain_checks_history(domain_id, checked_at desc);

alter table domain_checks_history enable row level security;

create policy "Users can view own domain checks"
  on domain_checks_history for select
  using (
    domain_id in (select id from domains where user_id = auth.uid())
  );

-- Writes only via service_role (recheck API / cron job)

-- =====================
-- ALERTS_SENT TABLE
-- =====================

create table alerts_sent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain_id uuid not null references domains(id) on delete cascade,
  alert_type alert_type not null,
  threshold_days integer not null,
  sent_date date not null default current_date,
  sent_at timestamptz not null default now(),

  -- Don't send the same alert twice on the same day for the same domain/type/threshold
  unique(domain_id, alert_type, threshold_days, sent_date)
);

create index idx_alerts_sent_domain_date on alerts_sent(domain_id, sent_date);

alter table alerts_sent enable row level security;

create policy "Users can view own sent alerts"
  on alerts_sent for select
  using (auth.uid() = user_id);

-- Writes only via service_role (cron job). No insert/update/delete policies.

-- =====================
-- SUBSCRIPTIONS
-- =====================

create type subscription_status as enum (
  'active', 'trialing', 'past_due', 'canceled',
  'unpaid', 'incomplete', 'incomplete_expired', 'paused'
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  stripe_price_id text not null,
  plan_id text not null,
  status subscription_status not null default 'incomplete',
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id)
);

create index idx_subscriptions_user_id on subscriptions(user_id);
create index idx_subscriptions_stripe_customer_id on subscriptions(stripe_customer_id);
create index idx_subscriptions_stripe_subscription_id on subscriptions(stripe_subscription_id);

alter table subscriptions enable row level security;

create policy "Users can view own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

-- Writes only via service_role (webhook). No insert/update/delete policies.

-- =====================
-- DOMAIN LIMIT TRIGGER
-- =====================

create or replace function check_domain_limit()
returns trigger as $$
declare
  domain_count integer;
  domain_limit integer;
  user_plan text;
begin
  select plan_id into user_plan
  from subscriptions
  where user_id = NEW.user_id
    and status in ('active', 'trialing');

  domain_limit := case user_plan
    when 'starter' then 5
    when 'pro' then 20
    when 'agency' then 999999
    else 0
  end;

  select count(*) into domain_count
  from domains
  where user_id = NEW.user_id;

  if domain_count >= domain_limit then
    raise exception 'Domain limit reached for plan %', coalesce(user_plan, 'none');
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

create trigger enforce_domain_limit
  before insert on domains
  for each row execute function check_domain_limit();

-- =====================
-- USER SETTINGS
-- =====================

create table user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  webhook_url text,
  webhook_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id)
);

create index idx_user_settings_user_id on user_settings(user_id);

alter table user_settings enable row level security;

create policy "Users can view own settings"
  on user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =====================
-- SERVICE ROLE ACCESS
-- =====================
-- The service_role key bypasses RLS, so your backend cron jobs
-- (SSL checks, alert sending) will work without extra policies.
