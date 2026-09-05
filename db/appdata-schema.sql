-- Run this in the APP DATA Supabase project (a separate Supabase project from
-- Accounts). It holds recipes, ingredients, ratings, and bar inventory.
--
-- IMPORTANT: `author_id` / `user_id` below are Supabase auth UUIDs that live in
-- the ACCOUNTS project, not this one. Postgres cannot enforce a foreign key
-- across two separate databases, so there is no FK to a local users table --
-- ownership is checked in the Vercel API layer instead (see /api). Row Level
-- Security is enabled with NO policies on purpose: the anon/public key gets
-- nothing at all, and only the Vercel API (using this project's service-role
-- key, which always bypasses RLS) can read or write this data.

create extension if not exists pgcrypto;

create table recipes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null,
  name text not null check (char_length(name) between 1 and 80),
  category text not null check (category in ('Classic', 'Fruity', 'Strong', 'Sweet', 'Sour')),
  description text,
  abv numeric(4, 1),
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recipes_explore_idx on recipes (category, created_at desc) where is_shared = true;
create index recipes_author_idx on recipes (author_id);

create table recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes (id) on delete cascade,
  name text not null,
  amount numeric(10, 2),
  unit text,
  sort_order smallint not null default 0,
  check (amount is null or amount >= 0)
);

create table recipe_instructions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes (id) on delete cascade,
  step_number smallint not null check (step_number > 0),
  instruction text not null,
  unique (recipe_id, step_number)
);

create table recipe_ratings (
  recipe_id uuid not null references recipes (id) on delete cascade,
  user_id uuid not null,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  type text not null default 'Other' check (type in ('Spirit', 'Beer', 'Cordial', 'Other')),
  amount text,
  updated_at timestamptz not null default now()
);
create index inventory_user_idx on inventory_items (user_id);

alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;
alter table recipe_instructions enable row level security;
alter table recipe_ratings enable row level security;
alter table inventory_items enable row level security;
