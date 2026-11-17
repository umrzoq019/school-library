-- Stacks school library schema
-- Run this whole file in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  class_name text,
  email text,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null default '',
  category text not null default 'Fiction',
  description text not null default '',
  cover_url text,
  language text not null default 'English',
  published_year integer,
  isbn text,
  copies_total integer not null default 1 check (copies_total >= 0),
  copies_available integer not null default 1 check (copies_available >= 0 and copies_available <= copies_total),
  is_featured boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loan_requests (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete restrict,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'returned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists books_published_idx on public.books (is_published, created_at desc);
create index if not exists loan_requests_student_idx on public.loan_requests (student_id, created_at desc);
create index if not exists loan_requests_status_idx on public.loan_requests (status, created_at desc);
create index if not exists loan_requests_book_id_idx on public.loan_requests (book_id);
create unique index if not exists loan_one_active_request_per_student_book
  on public.loan_requests (student_id, book_id)
  where status in ('pending', 'approved');

-- Authorization helper lives outside the exposed public API schema.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $is_admin$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'admin'
    );
$is_admin$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- Public sign-up always creates a student. The browser never chooses the role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, class_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'class_name', ''),
    new.email,
    'student'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = case when public.profiles.full_name = '' then excluded.full_name else public.profiles.full_name end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Students can update only non-privileged profile fields through the API.
-- Role changes are reserved for trusted staff using the Supabase SQL Editor.
drop trigger if exists protect_profile_role on public.profiles;
drop function if exists public.prevent_profile_role_change();
revoke update on public.profiles from public, anon, authenticated;
grant update (full_name, class_name) on public.profiles to authenticated;

-- Explicit API grants; row-level security below still governs which rows
-- each role can access or change.
grant usage on schema public to anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.books to anon, authenticated;
grant insert, update, delete on public.books to authenticated;
grant select, insert on public.loan_requests to authenticated;
revoke update on public.loan_requests from public, anon, authenticated;
grant update (status) on public.loan_requests to authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists books_touch_updated_at on public.books;
create trigger books_touch_updated_at before update on public.books
for each row execute procedure public.touch_updated_at();

drop trigger if exists loan_requests_touch_updated_at on public.loan_requests;
create trigger loan_requests_touch_updated_at before update on public.loan_requests
for each row execute procedure public.touch_updated_at();
revoke all on function public.touch_updated_at() from public, anon, authenticated;

-- Keep available-copy counts in sync with approved/returned loans.
create or replace function public.sync_loan_book_copies()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status then
    if old.status <> 'approved' and new.status = 'approved' then
      update public.books
        set copies_available = copies_available - 1
        where id = new.book_id and copies_available > 0;
      if not found then
        raise exception 'No copies of this book are currently available';
      end if;
    elsif old.status = 'approved' and new.status <> 'approved' then
      update public.books
        set copies_available = least(copies_total, copies_available + 1)
        where id = new.book_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists loan_status_updates_book_copies on public.loan_requests;
create trigger loan_status_updates_book_copies
  after update of status on public.loan_requests
  for each row execute procedure public.sync_loan_book_copies();
revoke all on function public.sync_loan_book_copies() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.loan_requests enable row level security;

drop policy if exists "Students and admins can read profiles" on public.profiles;
create policy "Students and admins can read profiles"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists "Students can update their own profile" on public.profiles;
create policy "Students can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists "Published books are visible to everyone" on public.books;
drop policy if exists "Published books are visible to anon" on public.books;
drop policy if exists "Published books and admin book records are visible to authenticated" on public.books;
create policy "Published books are visible to anon"
  on public.books for select to anon
  using (is_published = true);

create policy "Published books and admin book records are visible to authenticated"
  on public.books for select to authenticated
  using (is_published = true or (select private.is_admin()));

drop policy if exists "Admins can insert books" on public.books;
create policy "Admins can insert books"
  on public.books for insert to authenticated
  with check ((select private.is_admin()));

drop policy if exists "Admins can update books" on public.books;
create policy "Admins can update books"
  on public.books for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "Admins can delete books" on public.books;
create policy "Admins can delete books"
  on public.books for delete to authenticated
  using ((select private.is_admin()));

drop policy if exists "Students can read their requests and admins can read all" on public.loan_requests;
create policy "Students can read their requests and admins can read all"
  on public.loan_requests for select to authenticated
  using (student_id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists "Students can request available books" on public.loan_requests;
create policy "Students can request available books"
  on public.loan_requests for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1 from public.books
      where books.id = book_id
        and books.is_published = true
        and books.copies_available > 0
    )
  );

drop policy if exists "Admins can update loan requests" on public.loan_requests;
create policy "Admins can update loan requests"
  on public.loan_requests for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- Optional initial data is intentionally left out. The app includes a preview
-- catalog, and real books can be entered from the admin workspace.
