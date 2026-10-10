-- Migracao aplicada via Supabase: ppmt_centavo_premium_private_pilot_20261010.
-- Teste privado de 1 centavo com 24 horas de acesso, sem alterar memberships oficiais.
create table if not exists public.ppmt_centavo_premium_orders (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references auth.users(id) on delete cascade,
 provider_payment_id text unique,
 state text not null default 'creating' check(state in ('creating','pending','approved','refunded','cancelled','rejected','expired','needs_review')),
 premium_until timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint ppmt_centavo_provider_id_digits check(provider_payment_id is null or provider_payment_id ~ '^[0-9]{1,25}$')
);
alter table public.ppmt_centavo_premium_orders enable row level security;
revoke all on public.ppmt_centavo_premium_orders from public,anon,authenticated;
grant select,insert,update on public.ppmt_centavo_premium_orders to service_role;
create or replace function public.ppmt_approve_centavo_premium(
 p_order_id uuid,p_payment_id text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_row public.ppmt_centavo_premium_orders%rowtype;
begin
 if auth.role()<>'service_role' then raise exception 'Access denied';end if;
 if p_order_id is null or p_payment_id !~ '^[0-9]{1,25}$' then raise exception 'Invalid id';end if;
 update public.ppmt_centavo_premium_orders
    set state='approved',premium_until=now()+interval '24 hours',updated_at=now()
  where id=p_order_id and provider_payment_id=p_payment_id
    and state in ('creating','pending','needs_review') returning * into v_row;
 if v_row.id is null then
   select * into v_row from public.ppmt_centavo_premium_orders
    where id=p_order_id and provider_payment_id=p_payment_id;
 end if;
 if v_row.id is null then raise exception 'Pedido nao encontrado';end if;
 return jsonb_build_object('state',v_row.state,'premium_until',v_row.premium_until);
end $$;
revoke all on function public.ppmt_approve_centavo_premium(uuid,text) from public,anon,authenticated;
grant execute on function public.ppmt_approve_centavo_premium(uuid,text) to service_role;
create or replace function public.ppmt_revoke_centavo_premium(
 p_order_id uuid,p_payment_id text
) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.role()<>'service_role' then raise exception 'Access denied';end if;
 if p_order_id is null or p_payment_id !~ '^[0-9]{1,25}$' then raise exception 'Invalid id';end if;
 update public.ppmt_centavo_premium_orders
    set state='refunded',premium_until=null,updated_at=now()
  where id=p_order_id and provider_payment_id=p_payment_id
    and state in ('approved','pending','creating','needs_review');
end $$;
revoke all on function public.ppmt_revoke_centavo_premium(uuid,text) from public,anon,authenticated;
grant execute on function public.ppmt_revoke_centavo_premium(uuid,text) to service_role;
