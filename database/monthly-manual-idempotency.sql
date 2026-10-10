-- Impede creditar dois meses pela mesma preferência de checkout manual,
-- mesmo quando o comprador conclui dois pagamentos distintos.
alter table public.ppmt_monthly_payments add column if not exists source_reference text;
create unique index if not exists ppmt_monthly_one_manual_checkout
 on public.ppmt_monthly_payments(source_reference)
 where source='manual' and source_reference is not null;

create or replace function public.ppmt_credit_verified_manual_payment(
 p_user_id uuid,p_payment_id text,p_paid_at timestamptz,p_reference uuid
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare v_rows integer:=0;v_end timestamptz;
begin
 if auth.role()<>'service_role' then raise exception 'Access denied';end if;
 if p_user_id is null or p_reference is null or
    p_payment_id !~ '^[0-9]{1,25}$' or p_paid_at is null or
    p_paid_at>now()+interval '10 minutes' or p_paid_at<now()-interval '3 months'
 then raise exception 'Invalid payment evidence';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,0));
 if not exists(select 1 from public.ppmt_monthly_orders
               where id=p_reference and user_id=p_user_id and provider_preference_id is not null)
 then raise exception 'Payment is not tied to a valid monthly order';end if;
 insert into public.ppmt_monthly_payments(provider_payment_id,user_id,source,paid_at,source_reference)
 values(p_payment_id,p_user_id,'manual',p_paid_at,p_reference::text)
 on conflict do nothing;
 get diagnostics v_rows=row_count;
 if v_rows>0 then
  insert into public.memberships(user_id,status,current_period_end)
  values(p_user_id,'active',greatest(now(),p_paid_at)+interval '1 month')
  on conflict(user_id) do update set
    status='active',
    current_period_end=greatest(now(),coalesce(public.memberships.current_period_end,now()))+interval '1 month',
    updated_at=now();
 end if;
 select current_period_end into v_end from public.memberships where user_id=p_user_id;
 return pg_catalog.jsonb_build_object('credited',v_rows>0,'current_period_end',v_end);
end;$$;
revoke all on function public.ppmt_credit_verified_manual_payment(uuid,text,timestamptz,uuid)
 from public,anon,authenticated;
grant execute on function public.ppmt_credit_verified_manual_payment(uuid,text,timestamptz,uuid) to service_role;
