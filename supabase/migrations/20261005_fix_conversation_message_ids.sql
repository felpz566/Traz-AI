alter table public.conversations
  alter column id set default gen_random_uuid();

alter table public.messages
  alter column id set default gen_random_uuid();
