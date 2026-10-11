-- Traz AI workspace domain
create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '',
  language text not null default 'TypeScript',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  path text not null,
  language text not null default 'text',
  content text not null default '',
  size integer not null default 0,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, path)
);

create table if not exists public.snippets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  language text not null default 'text',
  content text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  content text not null default '',
  type text not null default 'text',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent text not null,
  prompt text not null,
  status text not null default 'pending' check (status in ('pending','running','completed','failed')),
  result text not null default '',
  credits_used integer not null default 25,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.files enable row level security;
alter table public.snippets enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.agent_runs enable row level security;

create policy "projects_owner_all" on public.projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "files_owner_all" on public.files for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "snippets_owner_all" on public.snippets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "knowledge_owner_all" on public.knowledge_documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "agent_runs_owner_all" on public.agent_runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists projects_user_updated_idx on public.projects(user_id, updated_at desc);
create index if not exists files_project_updated_idx on public.files(project_id, updated_at desc);
create index if not exists snippets_user_updated_idx on public.snippets(user_id, updated_at desc);
create index if not exists knowledge_user_updated_idx on public.knowledge_documents(user_id, updated_at desc);
create index if not exists agent_runs_user_updated_idx on public.agent_runs(user_id, updated_at desc);
