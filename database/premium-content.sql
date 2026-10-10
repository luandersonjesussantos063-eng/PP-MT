-- Conteúdo Premium novo fica APENAS no Supabase; não versionar enunciados, gabaritos ou explicações no GitHub.
create table if not exists public.ppmt_premium_questions (
 id text primary key check (id ~ '^mt-premium-[a-z0-9-]{4,90}$'),
 subject text not null check(length(subject) between 3 and 90),
 topic text not null check(length(topic) between 3 and 140),
 statement text not null check(length(statement) between 20 and 5000),
 options jsonb not null check(jsonb_typeof(options)='array' and jsonb_array_length(options) between 3 and 5),
 answer_index smallint not null check(answer_index between 0 and 4),
 explanation text not null check(length(explanation) between 30 and 4000),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.ppmt_premium_attempts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 question_id text not null references public.ppmt_premium_questions(id),
 selected_index smallint not null check(selected_index between 0 and 4),
 correct boolean not null,
 created_at timestamptz not null default now()
);
create index if not exists ppmt_premium_attempts_user_idx on public.ppmt_premium_attempts(user_id,created_at desc);
alter table public.ppmt_premium_questions enable row level security;
alter table public.ppmt_premium_attempts enable row level security;
revoke all on public.ppmt_premium_questions,public.ppmt_premium_attempts from PUBLIC, anon,authenticated;
grant select,insert,update,delete on public.ppmt_premium_questions,public.ppmt_premium_attempts to service_role;
-- Dados e respostas não têm policies de SELECT para clientes.
