alter table public.messages
  add column if not exists model text;

alter table public.messages
  drop constraint if exists messages_role_check;

alter table public.messages
  add constraint messages_role_check
  check (role in ('user','assistant','system'));
