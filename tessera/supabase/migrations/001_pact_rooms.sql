-- Tessera's server routes use the service-role key; browser clients never receive it.
-- Run this once in Supabase SQL Editor before enabling Live Pact Rooms.
create extension if not exists pgcrypto;

create table if not exists public.tessera_pact_rooms (
  id uuid primary key default gen_random_uuid(),
  trip jsonb not null,
  agreement jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tessera_pact_invites (
  token_hash text primary key,
  room_id uuid not null references public.tessera_pact_rooms(id) on delete cascade,
  role text not null check (role in ('organizer', 'traveler')),
  traveler_id text,
  label text not null,
  created_at timestamptz not null default now(),
  constraint traveler_invites_have_a_traveler check (
    (role = 'organizer' and traveler_id is null) or (role = 'traveler' and traveler_id is not null)
  )
);

create table if not exists public.tessera_pact_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.tessera_pact_rooms(id) on delete cascade,
  traveler_id text,
  actor_label text not null,
  action text not null check (action in ('accepted', 'concern')),
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists tessera_pact_events_room_created_at_idx
  on public.tessera_pact_events (room_id, created_at desc);

alter table public.tessera_pact_rooms enable row level security;
alter table public.tessera_pact_invites enable row level security;
alter table public.tessera_pact_events enable row level security;

-- There are intentionally no public RLS policies. All reads/writes flow through
-- Tessera's server routes, which verify a random invite token before using the service role.
