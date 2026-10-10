-- Checkout Pix real de R$ 0,01: piloto restrito aos testadores existentes.
-- Sem assinatura, sem renovação e sem liberar conteúdo Premium.
create table if not exists public.pix_pilot_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  provider_id text unique,
  state text not null default 'creating'
    check (state in ('creating','pending','approved','rejected','cancelled','expired','refunded','needs_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.pix_pilot_orders enable row level security;
revoke all on public.pix_pilot_orders from public, anon, authenticated;
grant select, insert, update on public.pix_pilot_orders to service_role;
-- Operações sempre pela Edge Function, após validar sessão e lista de testadores.
