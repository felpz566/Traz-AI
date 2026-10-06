create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','pro','r','ultra')),
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('pro','r','ultra')),
  status text not null check (status in ('active','grace','past_due','canceled')),
  paid_at timestamptz not null,
  due_at timestamptz not null,
  deadline_at timestamptz not null,
  last_transaction_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscriptions_active_user_idx
on public.subscriptions(user_id) where status in ('active','grace','past_due');

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  transaction_hash text,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  model text,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_conversations (
  project_id uuid not null references public.projects(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  primary key (project_id, conversation_id)
);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  path text not null,
  mime_type text,
  storage_path text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, path)
);

create index if not exists conversations_user_idx on public.conversations(user_id,updated_at desc);
create index if not exists messages_conversation_idx on public.messages(conversation_id,created_at);
create index if not exists projects_user_idx on public.projects(user_id,updated_at desc);
create index if not exists project_files_project_idx on public.project_files(project_id,updated_at desc);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.projects enable row level security;
alter table public.project_conversations enable row level security;
alter table public.project_files enable row level security;

drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "subscriptions_self_select" on public.subscriptions;
create policy "subscriptions_self_select" on public.subscriptions for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "conversations_owner_all" on public.conversations;
create policy "conversations_owner_all" on public.conversations for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "messages_owner_select" on public.messages;
create policy "messages_owner_select" on public.messages for select to authenticated
using (exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = (select auth.uid())));

drop policy if exists "messages_owner_insert" on public.messages;
create policy "messages_owner_insert" on public.messages for insert to authenticated
with check (exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = (select auth.uid())));

drop policy if exists "projects_owner_all" on public.projects;
create policy "projects_owner_all" on public.projects for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "project_conversations_owner_all" on public.project_conversations;
create policy "project_conversations_owner_all" on public.project_conversations for all to authenticated
using (
  exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid()))
  and exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = (select auth.uid()))
)
with check (
  exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid()))
  and exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = (select auth.uid()))
);

drop policy if exists "project_files_owner_all" on public.project_files;
create policy "project_files_owner_all" on public.project_files for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "billing_events_no_client_access" on public.billing_events;


create table if not exists public.usage_events (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 metric text not null check (metric in ('messages','files','projects','agents')),
 quantity integer not null default 1 check (quantity > 0),
 metadata jsonb,
 created_at timestamptz not null default now()
);

create table if not exists public.agents (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null,
 instructions text not null default '',
 model text not null default 'traz-1-fast',
 tools jsonb not null default '[]'::jsonb,
 knowledge jsonb not null default '[]'::jsonb,
 memory_scope text not null default 'project',
 permissions jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.memories (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 scope text not null check (scope in ('conversation','project','user')),
 scope_id uuid,
 content text not null,
 metadata jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create index if not exists usage_events_user_idx on public.usage_events(user_id,created_at desc);
create index if not exists agents_user_idx on public.agents(user_id,updated_at desc);
create index if not exists memories_user_idx on public.memories(user_id,updated_at desc);
create index if not exists project_conversations_conversation_idx on public.project_conversations(conversation_id);
create index if not exists project_files_user_idx on public.project_files(user_id);

alter table public.usage_events enable row level security;
alter table public.agents enable row level security;
alter table public.memories enable row level security;

drop policy if exists "usage_events_self_select" on public.usage_events;
create policy "usage_events_self_select" on public.usage_events for select to authenticated using ((select auth.uid())=user_id);

drop policy if exists "agents_owner_all" on public.agents;
create policy "agents_owner_all" on public.agents for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

drop policy if exists "memories_owner_all" on public.memories;
create policy "memories_owner_all" on public.memories for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);


-- Private project file bucket. The bucket is intentionally private; access is enforced by storage.objects RLS.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'traz-files','traz-files',false,52428800,
  array[
    'text/*','application/json','application/pdf','application/zip','application/octet-stream',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/*','audio/*','video/*'
  ]::text[]
)
on conflict (id) do update set public=false,file_size_limit=52428800;

drop policy if exists "nexus_files_select_own" on storage.objects;
create policy "nexus_files_select_own" on storage.objects for select to authenticated
using (bucket_id='traz-files' and (select coalesce(auth.jwt()->>'is_anonymous','false')) <> 'true' and (storage.foldername(name))[1]=(select auth.uid()::text));

drop policy if exists "nexus_files_insert_own" on storage.objects;
create policy "nexus_files_insert_own" on storage.objects for insert to authenticated
with check (bucket_id='traz-files' and (select coalesce(auth.jwt()->>'is_anonymous','false')) <> 'true' and (storage.foldername(name))[1]=(select auth.uid()::text));

drop policy if exists "nexus_files_update_own" on storage.objects;
create policy "nexus_files_update_own" on storage.objects for update to authenticated
using (bucket_id='traz-files' and (storage.foldername(name))[1]=(select auth.uid()::text))
with check (bucket_id='traz-files' and (storage.foldername(name))[1]=(select auth.uid()::text));

drop policy if exists "nexus_files_delete_own" on storage.objects;
create policy "nexus_files_delete_own" on storage.objects for delete to authenticated
using (bucket_id='traz-files' and (storage.foldername(name))[1]=(select auth.uid()::text));


-- Scheduled TRAZ automations
create table if not exists public.automations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, prompt text not null, schedule text not null check (schedule in ('hourly','daily','weekly')), enabled boolean not null default true,
 last_run_at timestamptz, next_run_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.automations enable row level security;
create policy "automations_owner_all" on public.automations for all to authenticated
using ((select coalesce(auth.jwt()->>'is_anonymous','false')) <> 'true' and (select auth.uid())=user_id)
with check ((select coalesce(auth.jwt()->>'is_anonymous','false')) <> 'true' and (select auth.uid())=user_id);
create index if not exists automations_user_idx on public.automations(user_id,created_at desc);
create index if not exists automations_due_idx on public.automations(enabled,next_run_at) where enabled=true;

create table if not exists public.automation_runs (
 id uuid primary key default gen_random_uuid(), automation_id uuid not null references public.automations(id) on delete cascade,
 status text not null check (status in ('running','success','error')), output text, error text,
 started_at timestamptz not null default now(), finished_at timestamptz
);
alter table public.automation_runs enable row level security;
create policy "automation_runs_owner_select" on public.automation_runs for select to authenticated
using (exists (select 1 from public.automations a where a.id=automation_id and (select auth.uid())=a.user_id));
create index if not exists automation_runs_automation_idx on public.automation_runs(automation_id,started_at desc);
