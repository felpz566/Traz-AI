-- TRAZ custom Google identity/session layer.
-- Supabase remains database/storage; Supabase Auth is not used by the application.

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  avatar_url text,
  google_sub text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists app_sessions_user_idx on public.app_sessions(user_id);
create index if not exists app_sessions_expires_idx on public.app_sessions(expires_at);

insert into public.app_users (id,email,name,created_at,updated_at)
select id,coalesce(email,id::text),coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name'),created_at,now()
from auth.users
on conflict (id) do update set email=excluded.email,name=coalesce(excluded.name,public.app_users.name),updated_at=now();

do $$
declare r record;
begin
  for r in
    select tc.table_schema,tc.table_name,tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu on ccu.constraint_name=tc.constraint_name and ccu.constraint_schema=tc.constraint_schema
    where tc.constraint_type='FOREIGN KEY' and tc.table_schema='public' and ccu.table_schema='auth' and ccu.table_name='users'
  loop
    execute format('alter table %I.%I drop constraint %I',r.table_schema,r.table_name,r.constraint_name);
  end loop;
end $$;

alter table public.profiles add constraint profiles_app_user_fk foreign key (id) references public.app_users(id) on delete cascade;
alter table public.subscriptions add constraint subscriptions_app_user_fk foreign key (user_id) references public.app_users(id) on delete cascade;
alter table public.conversations add constraint conversations_app_user_fk foreign key (user_id) references public.app_users(id) on delete cascade;
alter table public.projects add constraint projects_app_user_fk foreign key (user_id) references public.app_users(id) on delete cascade;
alter table public.project_files add constraint project_files_app_user_fk foreign key (user_id) references public.app_users(id) on delete cascade;
alter table public.usage_events add constraint usage_events_app_user_fk foreign key (user_id) references public.app_users(id) on delete cascade;
alter table public.agents add constraint agents_app_user_fk foreign key (user_id) references public.app_users(id) on delete cascade;
alter table public.memories add constraint memories_app_user_fk foreign key (user_id) references public.app_users(id) on delete cascade;
alter table public.automations add constraint automations_app_user_fk foreign key (user_id) references public.app_users(id) on delete cascade;

alter table public.app_users enable row level security;
alter table public.app_sessions enable row level security;