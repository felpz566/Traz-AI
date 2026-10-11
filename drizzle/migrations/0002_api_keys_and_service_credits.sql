create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Chave',
  key_prefix text not null,
  key_hash text not null unique,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.api_keys to authenticated;
grant all on public.api_keys to service_role;

alter table public.api_keys enable row level security;

create policy "api_keys: dono lê" on public.api_keys
for select to authenticated using (user_id = auth.uid());

create policy "api_keys: dono cria" on public.api_keys
for insert to authenticated with check (user_id = auth.uid());

create policy "api_keys: dono atualiza" on public.api_keys
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "api_keys: dono apaga" on public.api_keys
for delete to authenticated using (user_id = auth.uid());

create index if not exists api_keys_user_id_idx on public.api_keys(user_id);

-- Cobrança de créditos para chamadas feitas via chave de API (sem sessão).
create or replace function public.consume_credits_for(
  _user_id uuid,
  _action text,
  _cost integer,
  _chat_id uuid default null,
  _model text default null
)
returns table(credits integer, daily_credit_limit integer, is_admin boolean)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  prof public.profiles%rowtype;
  admin boolean;
  limit_for_plan integer;
begin
  select * into prof from public.profiles where id = _user_id for update;
  if not found then
    raise exception 'profile_not_found';
  end if;
  if prof.suspended then
    raise exception 'account_suspended';
  end if;

  admin := public.has_role(_user_id, 'admin');

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
      where id = _user_id
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
      where id = _user_id
      returning * into prof;
  else
    update public.profiles set last_active_at = now() where id = _user_id returning * into prof;
  end if;

  insert into public.usage_logs (user_id, chat_id, action, model, credits_used)
  values (_user_id, _chat_id, _action, _model, case when admin then 0 else _cost end);

  return query select prof.credits, prof.daily_credit_limit, admin;
end;
$$;

revoke all on function public.consume_credits_for(uuid, text, integer, uuid, text) from public, anon, authenticated;
grant execute on function public.consume_credits_for(uuid, text, integer, uuid, text) to service_role;