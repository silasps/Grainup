create table if not exists beta_feedback (
  id uuid primary key default gen_random_uuid(),
  page_url text not null,
  message text not null,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  user_name text,
  status text not null default 'novo' check (status in ('novo', 'em_analise', 'implementado', 'descartado')),
  created_at timestamptz not null default now()
);

alter table beta_feedback enable row level security;

create policy "Usuários autenticados podem enviar feedback"
  on beta_feedback for insert
  to authenticated
  with check (true);

create policy "Usuários anônimos podem enviar feedback"
  on beta_feedback for insert
  to anon
  with check (true);
