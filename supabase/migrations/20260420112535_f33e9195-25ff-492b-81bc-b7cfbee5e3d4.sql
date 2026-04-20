-- Enums
do $$ begin
  create type public.app_role as enum ('admin', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_plan as enum ('free', 'artist_basic', 'studio_pro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_status as enum ('active', 'inactive', 'canceled', 'past_due', 'trialing', 'suspended');
exception when duplicate_object then null; end $$;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Profiles read own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Profiles update own" on public.profiles for update to authenticated using (auth.uid() = id);

-- User roles
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Roles read own" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "Roles read all admins" on public.user_roles for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Subscriptions (with PayPal fields and generation usage)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan public.subscription_plan not null default 'free',
  status public.subscription_status not null default 'inactive',
  paypal_subscription_id text unique,
  paypal_plan_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  generations_used int not null default 0,
  generations_period_start timestamptz not null default date_trunc('month', now()),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy "Subs read own" on public.subscriptions for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_active_subscription(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = _user_id
      and status in ('active', 'trialing')
      and plan in ('artist_basic', 'studio_pro')
  )
$$;

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled Design',
  prompt text,
  design_url text,
  body_reference_url text,
  fabric_json jsonb,
  mode text not null default 'design' check (mode in ('design', 'stencil', 'placement')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.projects enable row level security;
create policy "Projects select own" on public.projects for select to authenticated using (auth.uid() = user_id);
create policy "Projects insert own" on public.projects for insert to authenticated with check (auth.uid() = user_id);
create policy "Projects update own" on public.projects for update to authenticated using (auth.uid() = user_id);
create policy "Projects delete own" on public.projects for delete to authenticated using (auth.uid() = user_id);
create index if not exists projects_user_id_idx on public.projects(user_id, created_at desc);

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute procedure public.touch_updated_at();
drop trigger if exists subscriptions_touch on public.subscriptions;
create trigger subscriptions_touch before update on public.subscriptions for each row execute procedure public.touch_updated_at();
drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects for each row execute procedure public.touch_updated_at();

-- New user trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(coalesce(new.email, ''), '@', 1))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  insert into public.subscriptions (user_id, plan, status) values (new.id, 'free', 'inactive') on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Storage buckets (private)
insert into storage.buckets (id, name, public) values ('designs', 'designs', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('body-references', 'body-references', false) on conflict (id) do nothing;

create policy "Designs read own" on storage.objects for select to authenticated using (bucket_id = 'designs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Designs upload own" on storage.objects for insert to authenticated with check (bucket_id = 'designs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Designs update own" on storage.objects for update to authenticated using (bucket_id = 'designs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Designs delete own" on storage.objects for delete to authenticated using (bucket_id = 'designs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "BodyRef read own" on storage.objects for select to authenticated using (bucket_id = 'body-references' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "BodyRef upload own" on storage.objects for insert to authenticated with check (bucket_id = 'body-references' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "BodyRef delete own" on storage.objects for delete to authenticated using (bucket_id = 'body-references' and (storage.foldername(name))[1] = auth.uid()::text);

-- Generation quota RPC
create or replace function public.consume_generation(_user_id uuid, _is_pro boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _row public.subscriptions%rowtype;
  _limit int;
begin
  select * into _row from public.subscriptions where user_id = _user_id for update;
  if not found then
    insert into public.subscriptions (user_id, plan, status) values (_user_id, 'free', 'inactive')
    returning * into _row;
  end if;

  if _row.generations_period_start < date_trunc('month', now()) then
    _row.generations_used := 0;
    _row.generations_period_start := date_trunc('month', now());
  end if;

  if _is_pro and _row.plan = 'studio_pro' then
    _limit := 100000;
  elsif _is_pro and _row.plan = 'artist_basic' then
    _limit := 200;
  else
    _limit := 5;
  end if;

  if _row.generations_used >= _limit then
    return jsonb_build_object('allowed', false, 'used', _row.generations_used, 'limit', _limit);
  end if;

  update public.subscriptions
    set generations_used = _row.generations_used + 1,
        generations_period_start = _row.generations_period_start,
        updated_at = now()
    where user_id = _user_id;

  return jsonb_build_object('allowed', true, 'used', _row.generations_used + 1, 'limit', _limit);
end;
$$;