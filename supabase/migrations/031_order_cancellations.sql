-- Tabela de cancelamentos de pedidos (bilateral: cliente ou admin)
create table if not exists order_cancellations (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references orders(id) on delete cascade,
  initiated_by          text not null check (initiated_by in ('customer', 'admin')),
  initiated_by_id       uuid,
  previous_status       text not null,
  reason                text not null,
  status                text not null default 'pendente' check (status in ('pendente', 'aprovado', 'negado')),
  reviewed_by           uuid,
  reviewed_at           timestamptz,
  refund_amount         numeric(10,2),
  refund_status         text not null default 'nao_aplicavel' check (refund_status in ('nao_aplicavel', 'pendente', 'processado', 'falhou')),
  refund_transaction_id text,
  admin_notes           text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Índices para consultas por pedido e status
create index if not exists order_cancellations_order_id_idx on order_cancellations(order_id);
create index if not exists order_cancellations_status_idx on order_cancellations(status);

-- Adiciona o novo valor ao status de pedidos (se usar enum nativo no Supabase)
-- Se o status for armazenado como text, este bloco não é necessário.
-- alter type order_status add value if not exists 'cancelamento_solicitado';

-- RLS: admin vê tudo; cliente vê só os seus
alter table order_cancellations enable row level security;

create policy "admin_all_cancellations" on order_cancellations
  for all using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
        and role in ('super_admin', 'admin_editora')
    )
  );

create policy "customer_own_cancellations" on order_cancellations
  for select using (
    initiated_by = 'customer'
    and initiated_by_id = auth.uid()
  );
