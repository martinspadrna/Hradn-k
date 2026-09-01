-- Hradník-only authentication. No changes to other application tables.
create table if not exists public.hradnik_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  display_name text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists public.hradnik_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.hradnik_users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists public.hradnik_user_place_state (
  user_id uuid not null references public.hradnik_users(id) on delete cascade,
  place_id bigint not null references public.hradnik_places(id) on delete cascade,
  status text not null default 'none' check (status in ('none','want','visited')),
  favorite boolean not null default false,
  rating smallint not null default 0 check (rating between 0 and 5),
  visited_on date,
  note text,
  updated_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

alter table public.hradnik_users enable row level security;
alter table public.hradnik_sessions enable row level security;
alter table public.hradnik_user_place_state enable row level security;

revoke all on public.hradnik_users from anon, authenticated;
revoke all on public.hradnik_sessions from anon, authenticated;
revoke all on public.hradnik_user_place_state from anon, authenticated;

create index if not exists hradnik_sessions_token_hash_idx on public.hradnik_sessions(token_hash);
create index if not exists hradnik_sessions_expires_idx on public.hradnik_sessions(expires_at);
create index if not exists hradnik_user_place_state_user_idx on public.hradnik_user_place_state(user_id);
