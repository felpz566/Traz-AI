-- ===== enums =====
create type public.app_role as enum ('user', 'admin');
create type public.plan_type as enum ('free', 'plus', 'pro');
create type public.message_role as enum ('user', 'assistant', 'system');

-- ===== profiles =====
create table public.profiles (
  id uuid primary key,
  name text not null default 'Usuário',
  email text not null,
  avatar_url text,
  plan public.plan_type not null default 'free',
  credits integer not null default 100,
  daily_credit_limit integer not null default 100,
  credits_reset_at timestamptz not null default now(),
  favorite_languages text[] not null default array['Luau','Python','JavaScript','TypeScript','TSX','HTML','CSS','C#','C++'],
  preferences jsonb not null default '{"theme":"dark","defaultLanguage":"TypeScript","defaultModel":"felpz-fast","memoryEnabled":true,"notifications":true,"sound":false,"animations":true,"density":"comfortable","confirmDelete":true,"enterToSend":true,"codePreviews":true}'::jsonb,
  suspended boolean not null default false,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ===== roles =====
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Users read own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Users read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id or public.has_role(auth.uid(), 'admin'));
create policy "Users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id or public.has_role(auth.uid(), 'admin'));
create policy "Users insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- ===== chats =====
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null default 'Novo chat',
  language text not null default 'TypeScript',
  model text not null default 'felpz-fast',
  title_generated boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index chats_user_idx on public.chats(user_id, updated_at desc);

grant select, insert, update, delete on public.chats to authenticated;
grant all on public.chats to service_role;
alter table public.chats enable row level security;

create policy "Own chats" on public.chats
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===== messages =====
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null,
  role public.message_role not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index messages_chat_idx on public.messages(chat_id, created_at);

grant select, insert, delete on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;

create policy "Own messages" on public.messages
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===== usage logs =====
create table public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  chat_id uuid,
  action text not null,
  model text,
  credits_used integer not null default 0,
  created_at timestamptz not null default now()
);
create index usage_logs_user_idx on public.usage_logs(user_id, created_at desc);

grant select on public.usage_logs to authenticated;
grant all on public.usage_logs to service_role;
alter table public.usage_logs enable row level security;

create policy "Own usage" on public.usage_logs
  for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

-- ===== subscriptions =====
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  plan public.plan_type not null default 'free',
  status text not null default 'active',
  provider text,
  provider_subscription_id text,
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;

create policy "Own subscription" on public.subscriptions
  for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

-- ===== new user handling =====
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_emails text[] := array['felipinho.anastacio13@gmail.com','felipe.anastacio1904@gmail.com'];
  is_admin boolean := lower(new.email) = any (admin_emails);
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, case when is_admin then 'admin'::public.app_role else 'user'::public.app_role end)
  on conflict do nothing;

  insert into public.subscriptions (user_id, plan) values (new.id, 'free')
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== credit engine =====
create or replace function public.consume_credits(
  _action text,
  _cost integer,
  _chat_id uuid default null,
  _model text default null
)
returns table (credits integer, daily_credit_limit integer, is_admin boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  prof public.profiles%rowtype;
  admin boolean;
  limit_for_plan integer;
begin
  if uid is null then
    raise exception 'unauthorized';
  end if;

  select * into prof from public.profiles where id = uid for update;
  if not found then
    raise exception 'profile_not_found';
  end if;
  if prof.suspended then
    raise exception 'account_suspended';
  end if;

  admin := public.has_role(uid, 'admin');

  limit_for_plan := case prof.plan
    when 'free' then 100
    when 'plus' then 500
    when 'pro' then 1000
    else 100 end;

  if prof.credits_reset_at < date_trunc('day', now()) or prof.daily_credit_limit <> limit_for_plan then
    update public.profiles
      set credits = limit_for_plan,
          daily_credit_limit = limit_for_plan,
          credits_reset_at = now(),
          updated_at = now()
      where id = uid
      returning * into prof;
  end if;

  if not admin then
    if prof.credits < _cost then
      raise exception 'insufficient_credits';
    end if;
    update public.profiles
      set credits = credits - _cost,
          last_active_at = now(),
          updated_at = now()
      where id = uid
      returning * into prof;
  else
    update public.profiles set last_active_at = now() where id = uid returning * into prof;
  end if;

  insert into public.usage_logs (user_id, chat_id, action, model, credits_used)
  values (uid, _chat_id, _action, _model, case when admin then 0 else _cost end);

  return query select prof.credits, prof.daily_credit_limit, admin;
end;
$$;

grant execute on function public.consume_credits(text, integer, uuid, text) to authenticated;

create or replace function public.sync_daily_credits()
returns table (credits integer, daily_credit_limit integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  prof public.profiles%rowtype;
  limit_for_plan integer;
begin
  if uid is null then
    raise exception 'unauthorized';
  end if;
  select * into prof from public.profiles where id = uid for update;
  if not found then
    raise exception 'profile_not_found';
  end if;

  limit_for_plan := case prof.plan
    when 'free' then 100
    when 'plus' then 500
    when 'pro' then 1000
    else 100 end;

  if prof.credits_reset_at < date_trunc('day', now()) or prof.daily_credit_limit <> limit_for_plan then
    update public.profiles
      set credits = limit_for_plan,
          daily_credit_limit = limit_for_plan,
          credits_reset_at = now(),
          updated_at = now()
      where id = uid
      returning * into prof;
  end if;

  return query select prof.credits, prof.daily_credit_limit;
end;
$$;

grant execute on function public.sync_daily_credits() to authenticated;