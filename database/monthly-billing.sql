-- Estrutura financeira do PPMT Premium R$ 19,99 / mês.
-- Compras manuais por Pix/boleto/débito: nova cobrança a cada período.
-- Cartão de crédito: assinatura mensal autorizada no Mercado Pago.
-- Comercialização ainda depende da flag segura PPMT_MONTHLY_BILLING_ENABLED.
create table if not exists public.ppmt_monthly_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_preference_id text unique,
  checkout_url text,
  state text not null default 'creating'
    check(state in ('creating','pending','paid','expired','cancelled','needs_review')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  updated_at timestamptz not null default now()
);
create index if not exists ppmt_monthly_orders_owner_idx
  on public.ppmt_monthly_orders(user_id,created_at desc);
create unique index if not exists ppmt_monthly_orders_one_open_idx
  on public.ppmt_monthly_orders(user_id)
  where state in ('creating','pending','needs_review');

create table if not exists public.ppmt_monthly_cards (
  user_id uuid primary key references auth.users(id) on delete cascade,
  external_reference uuid not null default gen_random_uuid() unique,
  provider_id text unique,
  checkout_url text,
  state text not null default 'creating'
    check(state in ('creating','pending','authorized','paused','cancelled','needs_review','past_due')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ppmt_monthly_payments (
  provider_payment_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check(source in ('manual','card')),
  paid_at timestamptz not null,
  refunded boolean not null default false,
  recorded_at timestamptz not null default now()
);
create index if not exists ppmt_monthly_payments_by_user
  on public.ppmt_monthly_payments(user_id,paid_at);
alter table public.ppmt_monthly_orders enable row level security;
alter table public.ppmt_monthly_cards enable row level security;
alter table public.ppmt_monthly_payments enable row level security;
revoke all on public.ppmt_monthly_orders,public.ppmt_monthly_cards,public.ppmt_monthly_payments from public,anon,authenticated;
grant all on public.ppmt_monthly_orders,public.ppmt_monthly_cards,public.ppmt_monthly_payments to service_role;

-- Servidor valida assinatura criptográfica/retorno autenticado, pagamento real,
-- recebedor, valor, moeda, ausência de estorno e vínculo ao aluno antes desta RPC.
-- A RPC é executável SOMENTE com service_role. Um pagamento aprovado conta uma única vez.
create or replace function public.ppmt_credit_verified_monthly_payment(
  p_user_id uuid,p_payment_id text,p_source text,p_paid_at timestamptz
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  v_new boolean := false;
  v_end timestamptz;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Access denied';
  end if;
  if p_user_id is null or p_payment_id !~ '^[0-9]{1,25}$'
     or p_source not in ('manual','card')
     or p_paid_at is null or p_paid_at > now()+interval '10 minutes'
     or p_paid_at < now()-interval '3 months' then
    raise exception 'Invalid payment evidence';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,0));
  insert into public.ppmt_monthly_payments(provider_payment_id,user_id,source,paid_at)
  values(p_payment_id,p_user_id,p_source,p_paid_at)
  on conflict(provider_payment_id) do nothing;
  get diagnostics v_new=row_count;
  if v_new then
    insert into public.memberships(user_id,status,current_period_end)
    values(p_user_id,'active',greatest(now(),p_paid_at)+interval '1 month')
    on conflict(user_id) do update set
      status='active',
      current_period_end=greatest(now(),coalesce(public.memberships.current_period_end,now()))+interval '1 month',
      updated_at=now();
  end if;
  select current_period_end into v_end from public.memberships where user_id=p_user_id;
  return pg_catalog.jsonb_build_object('credited',v_new,'current_period_end',v_end);
end;
$$;
revoke all on function public.ppmt_credit_verified_monthly_payment(uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.ppmt_credit_verified_monthly_payment(uuid,text,text,timestamptz) to service_role;

-- Em casos de reembolso/chargeback, suspende imediatamente o Premium
-- até revisão financeira. Não remove registro de auditoria.
create or replace function public.ppmt_void_verified_monthly_payment(
  p_payment_id text
) returns boolean
language plpgsql security definer set search_path=''
as $$
declare v_user uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'Access denied'; end if;
  update public.ppmt_monthly_payments set refunded=true
  where provider_payment_id=p_payment_id and refunded=false returning user_id into v_user;
  if v_user is null then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text,0));
  update public.memberships set status='past_due',updated_at=now() where user_id=v_user;
  return true;
end;
$$;
revoke all on function public.ppmt_void_verified_monthly_payment(text) from public,anon,authenticated;
grant execute on function public.ppmt_void_verified_monthly_payment(text) to service_role;
