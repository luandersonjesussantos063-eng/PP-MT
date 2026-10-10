-- Membership foundation. Billing and paid-content enforcement are NOT activated.
begin;
create table public.memberships (
 user_id uuid primary key references auth.users(id) on delete cascade,
 status text not null default 'inactive' check(status in ('inactive','active','past_due','canceled')),
 current_period_end timestamptz,
 updated_at timestamptz not null default now(),
 check(status <> 'active' or current_period_end is not null)
);
alter table public.memberships enable row level security;
revoke all on public.memberships from anon, authenticated;
grant select(user_id,status,current_period_end) on public.memberships to authenticated;
grant all on public.memberships to service_role;
create policy memberships_read_own on public.memberships for select to authenticated using ((select auth.uid()) = user_id);
create function public.my_membership() returns jsonb
language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object('premium', exists(select 1 from public.memberships where user_id=(select auth.uid()) and status='active' and current_period_end>now()), 'status', coalesce((select status from public.memberships where user_id=(select auth.uid())), 'inactive'), 'current_period_end', (select current_period_end from public.memberships where user_id=(select auth.uid())));
$$;
revoke all on function public.my_membership() from public, anon;
grant execute on function public.my_membership() to authenticated;
commit;
