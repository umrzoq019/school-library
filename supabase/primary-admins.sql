-- Primary admins: accounts that no other admin (or librarian) can change, suspend or remove.
-- Run once in the Supabase SQL editor (or as a migration). Safe to run again.
--
-- How it works
--  * profiles.is_owner marks a primary admin. Nothing in the website can set or clear it.
--  * A trigger refuses (E_PROTECTED) any change to role, suspension, login link, email or code
--    of such an account, and refuses to delete it, when the request comes from the website.
--    Changes made in the Supabase dashboard / SQL editor are not blocked: that is database-level access.
--  * An account is marked automatically only when its email is on the list below AND the person
--    clicked a real confirmation email (confirmation_sent_at is set). While "Confirm email" is
--    switched off in Supabase Auth, nobody is marked automatically, so a stranger cannot take
--    over a primary admin address by registering it first.

alter table public.profiles add column if not exists is_owner boolean not null default false;

create table if not exists private.owner_emails (email text primary key check (email = lower(email)));
alter table private.owner_emails enable row level security;          -- no policy: unreadable from the website
revoke all on private.owner_emails from public, anon, authenticated;
insert into private.owner_emails (email) values ('umrzoqprimqulov48@gmail.com'), ('umrzoqprimqulov@gmail.com')
  on conflict do nothing;

create or replace function private.protect_owner_rows() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then                 -- dashboard, SQL editor, migrations, the auth server
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    if old.is_owner then raise exception 'E_PROTECTED'; end if;
    return old;
  end if;
  if old.is_owner and (new.is_owner is distinct from old.is_owner or new.role is distinct from old.role
      or new.banned is distinct from old.banned or new.ban_reason is distinct from old.ban_reason
      or new.auth_id is distinct from old.auth_id or new.email is distinct from old.email
      or new.code is distinct from old.code) then
    raise exception 'E_PROTECTED';
  end if;
  if new.is_owner and not old.is_owner then raise exception 'E_FORBIDDEN'; end if;
  return new;
end $$;
revoke all on function private.protect_owner_rows() from public, anon, authenticated;
drop trigger if exists protect_owner_rows on public.profiles;
create trigger protect_owner_rows before update or delete on public.profiles
  for each row execute function private.protect_owner_rows();

create or replace function private.grant_owner_on_verified_email() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is not null and new.confirmation_sent_at is not null
     and exists (select 1 from private.owner_emails where email = lower(new.email)) then
    update public.profiles set role = 'admin', is_owner = true where auth_id = new.id;
  end if;
  return new;
end $$;
revoke all on function private.grant_owner_on_verified_email() from public, anon, authenticated;
drop trigger if exists grant_owner_on_verified_email on auth.users;
create trigger grant_owner_on_verified_email after insert or update of email_confirmed_at on auth.users
  for each row execute function private.grant_owner_on_verified_email();

-- accounts that already exist and were verified through a real confirmation email
update public.profiles p set role = 'admin', is_owner = true
  from auth.users u
  where u.id = p.auth_id and u.confirmation_sent_at is not null and u.email_confirmed_at is not null
    and lower(u.email) in (select email from private.owner_emails);
