-- Run this in the ACCOUNTS Supabase project (same one as accounts-schema.sql).
-- Makes guest (anonymous) sign-ins skip the profiles table entirely, and
-- creates the profile the moment a guest adds an email/password (i.e.
-- upgrades to a real account) via supabase.auth.updateUser().
--
-- Also requires: Authentication -> Settings -> "Allow anonymous sign-ins"
-- turned ON in this Supabase project. There's no SQL for that -- it's a
-- dashboard toggle.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  if new.is_anonymous then
    return new; -- guests don't get a profiles row unless/until they add an email
  end if;
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- Fires when a guest adds an email/password and stops being anonymous.
-- Reuses the same function -- by the time this fires, new.is_anonymous is
-- already false, so it inserts the profile row just like a fresh signup.
drop trigger if exists on_auth_user_upgraded on auth.users;
create trigger on_auth_user_upgraded
  after update on auth.users
  for each row
  when (old.is_anonymous = true and new.is_anonymous = false)
  execute procedure public.handle_new_user();
