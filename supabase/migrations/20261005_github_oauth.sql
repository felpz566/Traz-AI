create table if not exists public.github_connections (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  github_user_id bigint not null unique,
  github_login text not null,
  github_name text,
  github_avatar_url text,
  access_token_enc text not null,
  refresh_token_enc text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.github_connections enable row level security;
