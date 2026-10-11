-- IA explicativa PP-MT: cotas atômicas, cache e acesso somente service_role.
create table if not exists public.ppmt_ai_daily_usage(
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null,
 used integer not null default 0 check(used>=0),
 primary key(user_id,day)
);
create table if not exists public.ppmt_ai_global_usage(
 day date primary key,
 used integer not null default 0 check(used>=0)
);
create table if not exists public.ppmt_ai_explanation_cache(
 cache_key text primary key check(cache_key ~ '^[a-f0-9]{64}$'),
 explanation text not null check(length(explanation) between 60 and 8000),
 sources jsonb not null default '[]'::jsonb check(jsonb_typeof(sources)='array'),
 created_at timestamptz not null default now()
);
alter table public.ppmt_ai_daily_usage enable row level security;
alter table public.ppmt_ai_global_usage enable row level security;
alter table public.ppmt_ai_explanation_cache enable row level security;
revoke all on public.ppmt_ai_daily_usage from public,anon,authenticated;
revoke all on public.ppmt_ai_global_usage from public,anon,authenticated;
revoke all on public.ppmt_ai_explanation_cache from public,anon,authenticated;
grant select,insert,update on public.ppmt_ai_daily_usage to service_role;
grant select,insert,update on public.ppmt_ai_global_usage to service_role;
grant select,insert on public.ppmt_ai_explanation_cache to service_role;

create or replace function public.ppmt_reserve_ai_explanation(p_user_id uuid,p_day date,p_user_limit integer)
returns boolean
language plpgsql security definer set search_path=''
as $$
declare global_used integer; user_used integer;
begin
 if auth.role()<>'service_role' then raise exception 'Forbidden'; end if;
 if p_user_id is null or p_day is null or p_day<>((now() at time zone 'UTC')::date)
    or p_user_limit not between 1 and 10 then return false; end if;
 insert into public.ppmt_ai_global_usage(day,used) values(p_day,1)
 on conflict(day) do update set used=public.ppmt_ai_global_usage.used+1
 where public.ppmt_ai_global_usage.used < 100
 returning used into global_used;
 if global_used is null then return false; end if;
 insert into public.ppmt_ai_daily_usage(user_id,day,used) values(p_user_id,p_day,1)
 on conflict(user_id,day) do update set used=public.ppmt_ai_daily_usage.used+1
 where public.ppmt_ai_daily_usage.used < p_user_limit
 returning used into user_used;
 if user_used is null then
  update public.ppmt_ai_global_usage set used=used-1 where day=p_day;
  return false;
 end if;
 return true;
end;
$$;
revoke all on function public.ppmt_reserve_ai_explanation(uuid,date,integer) from public,anon,authenticated;
grant execute on function public.ppmt_reserve_ai_explanation(uuid,date,integer) to service_role;
