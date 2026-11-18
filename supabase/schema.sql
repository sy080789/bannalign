-- bannalign schema. Paste into Supabase → SQL Editor → Run. Safe to re-run.

-- Who may read/write anything. Only these emails are part of the household.
create table if not exists public.members (email text primary key);
insert into public.members (email) values
  ('stephenpkyeung@gmail.com'),
  ('amandaspickles@gmail.com')
on conflict do nothing;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members where email = (auth.jwt() ->> 'email'));
$$;

-- Last-write-wins: ignore an update older than what's stored; stamp server time for pulls.
create or replace function public.lww() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null;
  end if;
  new.synced_at := clock_timestamp();
  return new;
end $$;

create table if not exists public.lists (
  id text primary key,
  name text not null,
  sort int not null default 0,
  updated_at timestamptz not null,
  deleted boolean not null default false,
  synced_at timestamptz not null default now()
);

create table if not exists public.items (
  id text primary key,
  list_id text not null,
  name text not null,
  qty text not null default '',
  category text not null default 'Other',
  staple boolean not null default false,
  in_list boolean not null default true,
  checked boolean not null default false,
  updated_at timestamptz not null,
  deleted boolean not null default false,
  synced_at timestamptz not null default now()
);

create index if not exists items_synced_at on public.items (synced_at);
create index if not exists lists_synced_at on public.lists (synced_at);

drop trigger if exists lists_lww on public.lists;
create trigger lists_lww before insert or update on public.lists for each row execute function public.lww();
drop trigger if exists items_lww on public.items;
create trigger items_lww before insert or update on public.items for each row execute function public.lww();

insert into public.lists (id, name, sort, updated_at) values
  ('groceries', 'Groceries', 0, 'epoch'),
  ('household', 'Household', 1, 'epoch')
on conflict do nothing;

-- Row Level Security: household members only.
alter table public.members enable row level security;
alter table public.lists enable row level security;
alter table public.items enable row level security;

drop policy if exists members_all on public.lists;
create policy members_all on public.lists for all to authenticated using (public.is_member()) with check (public.is_member());
drop policy if exists members_all on public.items;
create policy members_all on public.items for all to authenticated using (public.is_member()) with check (public.is_member());

-- Realtime pings so the other phone updates within seconds.
do $$ begin
  alter publication supabase_realtime add table public.lists, public.items;
exception when duplicate_object then null;
end $$;

-- ---------- Phase 2: Recipes ----------

alter table public.items add column if not exists source text;

create table if not exists public.recipes (
  id text primary key,
  name text not null,
  source_url text not null default '',
  image_url text not null default '',
  servings text not null default '',
  total_time text not null default '',
  ingredients jsonb not null default '[]',
  steps jsonb not null default '[]',
  notes text not null default '',
  tags jsonb not null default '[]',
  favorite boolean not null default false,
  last_cooked timestamptz,
  updated_at timestamptz not null,
  deleted boolean not null default false,
  synced_at timestamptz not null default now()
);

create index if not exists recipes_synced_at on public.recipes (synced_at);
drop trigger if exists recipes_lww on public.recipes;
create trigger recipes_lww before insert or update on public.recipes for each row execute function public.lww();

alter table public.recipes enable row level security;
drop policy if exists members_all on public.recipes;
create policy members_all on public.recipes for all to authenticated using (public.is_member()) with check (public.is_member());

do $$ begin
  alter publication supabase_realtime add table public.recipes;
exception when duplicate_object then null;
end $$;

-- Photos: public bucket with random file names (works offline via the service-worker cache).
-- Only household members can upload.
insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict do nothing;
drop policy if exists photos_member_insert on storage.objects;
create policy photos_member_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.is_member());

-- ---------- Phase 3: Plants ----------

create table if not exists public.plants (
  id text primary key,
  name text not null,
  room text not null default '',
  photo_url text not null default '',
  interval_days integer not null default 7,
  amount text not null default '',
  notes text not null default '',
  last_watered timestamptz,
  last_watered_by text not null default '',
  snooze_until timestamptz,
  updated_at timestamptz not null,
  deleted boolean not null default false,
  synced_at timestamptz not null default now()
);

create table if not exists public.plant_events (
  id text primary key,
  plant_id text not null,
  kind text not null,
  at timestamptz not null,
  by text not null default '',
  photo_url text not null default '',
  updated_at timestamptz not null,
  deleted boolean not null default false,
  synced_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['plants', 'plant_events'] loop
    execute format('create index if not exists %I on public.%I (synced_at)', t || '_synced_at', t);
    execute format('drop trigger if exists %I on public.%I', t || '_lww', t);
    execute format('create trigger %I before insert or update on public.%I for each row execute function public.lww()', t || '_lww', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists members_all on public.%I', t);
    execute format('create policy members_all on public.%I for all to authenticated using (public.is_member()) with check (public.is_member())', t);
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
