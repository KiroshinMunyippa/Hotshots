-- Run this in the ACCOUNTS Supabase project.
-- Supabase already provides `auth.users` for email/password login. This adds
-- a `profiles` table that extends it with the fields a future subscription
-- needs (plan, status, Stripe customer id) so billing can be bolted on later
-- without touching the recipes/ratings/inventory database at all.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  email text not null,
  subscription_plan text not null default 'free' check (subscription_plan in ('free', 'plus', 'pro')),
  subscription_status text not null default 'active' check (subscription_status in ('active', 'trialing', 'past_due', 'canceled')),
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Individuals can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Individuals can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Automatically create a profile row whenever someone signs up.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
