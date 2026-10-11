-- Trade Journal Dashboard - schema
-- Run this once in the Supabase SQL editor for a fresh project.
-- Every table is scoped to the signed-in user through Row Level Security.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- accounts
-- ---------------------------------------------------------------------------
create table if not exists public.accounts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  name             text not null,
  type             text not null default 'demo'
                     check (type in ('funded', 'live', 'demo')),
  currency         text not null default 'USD',
  starting_balance numeric(14, 2) not null default 0,
  start_date       date,
  profit_target    numeric(14, 2),
  max_daily_loss   numeric(14, 2),
  max_total_loss   numeric(14, 2),
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists accounts_user_idx on public.accounts (user_id);

drop trigger if exists accounts_touch on public.accounts;
create trigger accounts_touch before update on public.accounts
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- trades
-- ---------------------------------------------------------------------------
create table if not exists public.trades (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  account_id    uuid references public.accounts (id) on delete set null,
  pair          text not null,
  direction     text not null check (direction in ('Buy', 'Sell')),
  entry_time    timestamptz not null,
  exit_time     timestamptz,
  entry_price   numeric(18, 6),
  exit_price    numeric(18, 6),
  stop_loss     numeric(18, 6),
  take_profit   numeric(18, 6),
  lot_size      numeric(12, 4),
  profit_loss   numeric(14, 2) not null default 0,
  result        text not null default 'Manual'
                  check (result in ('TP', 'SL', 'BE', 'Manual')),
  planned_rr    numeric(8, 4),
  risk_percent  numeric(8, 4),
  risk_amount   numeric(14, 2),
  r_multiple    numeric(10, 4),
  reason_entry  text,
  emotion       text,
  emotion_note  text,
  mistakes      text,
  lessons       text,
  followed_plan boolean,
  status        text not null default 'Done'
                  check (status in ('Open', 'Done')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists trades_user_time_idx on public.trades (user_id, entry_time desc);
create index if not exists trades_account_idx   on public.trades (account_id);

drop trigger if exists trades_touch on public.trades;
create trigger trades_touch before update on public.trades
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- trade_screenshots
-- ---------------------------------------------------------------------------
create table if not exists public.trade_screenshots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  trade_id    uuid not null references public.trades (id) on delete cascade,
  file_path   text not null,
  caption     text,
  position    text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists screenshots_trade_idx on public.trade_screenshots (trade_id);

-- ---------------------------------------------------------------------------
-- tags
-- ---------------------------------------------------------------------------
create table if not exists public.tags (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name    text not null,
  unique (user_id, name)
);

create table if not exists public.trade_tags (
  trade_id uuid not null references public.trades (id) on delete cascade,
  tag_id   uuid not null references public.tags (id) on delete cascade,
  primary key (trade_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- daily_notes
-- ---------------------------------------------------------------------------
create table if not exists public.daily_notes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  day            text not null,
  morning_plan   text,
  evening_review text,
  mood           text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, day)
);

drop trigger if exists daily_notes_touch on public.daily_notes;
create trigger daily_notes_touch before update on public.daily_notes
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.accounts          enable row level security;
alter table public.trades            enable row level security;
alter table public.trade_screenshots enable row level security;
alter table public.tags              enable row level security;
alter table public.trade_tags        enable row level security;
alter table public.daily_notes       enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'accounts', 'trades', 'trade_screenshots', 'tags', 'daily_notes'
  ]
  loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);

    execute format(
      'create policy %I_select on public.%I for select using (auth.uid() = user_id)', t, t);
    execute format(
      'create policy %I_insert on public.%I for insert with check (auth.uid() = user_id)', t, t);
    execute format(
      'create policy %I_update on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);
    execute format(
      'create policy %I_delete on public.%I for delete using (auth.uid() = user_id)', t, t);
  end loop;
end;
$$;

-- trade_tags joins through trades, so it is guarded by ownership of the trade.
drop policy if exists trade_tags_select on public.trade_tags;
create policy trade_tags_select on public.trade_tags for select
  using (exists (
    select 1 from public.trades t
    where t.id = trade_tags.trade_id and t.user_id = auth.uid()
  ));

drop policy if exists trade_tags_write on public.trade_tags;
create policy trade_tags_write on public.trade_tags for all
  using (exists (
    select 1 from public.trades t
    where t.id = trade_tags.trade_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.trades t
    where t.id = trade_tags.trade_id and t.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- Private screenshot bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', false)
on conflict (id) do nothing;

-- Files live under "<user_id>/...", so ownership is a path prefix check.
drop policy if exists screenshots_read on storage.objects;
create policy screenshots_read on storage.objects for select
  using (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists screenshots_write on storage.objects;
create policy screenshots_write on storage.objects for insert
  with check (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists screenshots_delete on storage.objects;
create policy screenshots_delete on storage.objects for delete
  using (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
