create table if not exists email_logs (
  id          uuid primary key default gen_random_uuid(),
  email_type  text        not null,  -- e.g. 'welcome', 'order_confirmation', 'sac_reply'
  sent_at     timestamptz not null default now()
);

alter table email_logs enable row level security;

-- Only service-role can read/insert (called server-side only)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'email_logs'
    and policyname = 'service role full access'
  ) then
    execute 'create policy "service role full access" on email_logs for all using (auth.role() = ''service_role'')';
  end if;
end; $$;
