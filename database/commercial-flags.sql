-- Controles comerciais do PPMT com acesso EXCLUSIVO via service_role.
-- A chave de assinatura do Mercado Pago permanece como Secret da Edge Function.
create table if not exists public.ppmt_commercial_flags (
 id smallint primary key default 1 check(id=1),
 delivery_ready boolean not null default false,
 private_pilot_enabled boolean not null default false,
 public_sales_enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.ppmt_commercial_flags enable row level security;
revoke all on public.ppmt_commercial_flags from public,anon,authenticated;
grant select on public.ppmt_commercial_flags to service_role;
insert into public.ppmt_commercial_flags(id,delivery_ready,private_pilot_enabled,public_sales_enabled)
values(1,true,true,false)
on conflict(id) do update set
 delivery_ready=true,
 private_pilot_enabled=true,
 public_sales_enabled=false,
 updated_at=now();
