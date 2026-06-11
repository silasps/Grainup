create table if not exists bling_tokens (
  id          int primary key default 1,
  access_token  text not null,
  refresh_token text not null,
  expires_at    timestamptz not null,
  updated_at    timestamptz default now()
);
alter table bling_tokens enable row level security;
