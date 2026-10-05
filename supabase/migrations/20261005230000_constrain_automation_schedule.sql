do $$ begin
  if not exists (select 1 from pg_constraint where conname='automations_schedule_check') then
    alter table public.automations
      add constraint automations_schedule_check
      check (schedule in ('hourly','daily','weekly'));
  end if;
end $$;
