-- GulPS / GulPM library: database schema (Supabase / Postgres).
-- For an EMPTY project: run this whole file once in the Supabase SQL Editor.
-- (The school-library project already has it applied.) There are no due dates: a loan is active until returned_at is set.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------- tables
create table public.profiles (
  id          uuid primary key default gen_random_uuid(),
  auth_id     uuid unique references auth.users (id) on delete set null,
  code        text not null unique,
  first_name  text not null check (length(trim(first_name)) between 1 and 60),
  last_name   text not null check (length(trim(last_name)) between 1 and 60),
  role        text not null default 'student' check (role in ('student','teacher','librarian','admin')),
  grade       text check (grade is null or grade ~ '^(5|6|7|8|9|10|11)-0[12]$'),
  email       text,
  banned      boolean not null default false,
  ban_reason  text,
  created_at  timestamptz not null default now(),
  constraint students_have_a_class check (role <> 'student' or grade is not null)
);

create table public.books (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(trim(title)) > 0),
  author      text not null default '',
  genre       text not null default '',
  lang        text not null default 'en' check (lang in ('uz','en','ru')),
  year        text,
  total       integer not null default 1 check (total >= 1),
  shelf       text,
  isbn        text,
  cover_url   text,
  description text not null default '',
  created_at  timestamptz not null default now()
);

-- A loan has no due date. It is active until returned_at is set.
create table public.loans (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid references public.books (id) on delete set null,
  user_id     uuid references public.profiles (id) on delete set null,
  out_at      timestamptz not null default now(),
  returned_at timestamptz,
  issued_by   uuid references public.profiles (id) on delete set null,
  returned_by uuid references public.profiles (id) on delete set null
);
create unique index loans_one_active_copy on public.loans (book_id, user_id) where returned_at is null;
create index loans_user_idx on public.loans (user_id);
create index loans_book_idx on public.loans (book_id);

create table public.holds (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid not null references public.books (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (book_id, user_id)
);

create table public.shelf (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  book_id    uuid not null references public.books (id) on delete cascade,
  status     text not null check (status in ('want','reading','finished')),
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.books (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  body        text not null default '' check (length(body) <= 600),
  author_name text not null,
  created_at  timestamptz not null default now(),
  unique (book_id, user_id)
);

create table public.settings (key text primary key, value jsonb not null);
insert into public.settings values ('max_loans', '3'), ('registration_open', 'true');
create table public.secrets (key text primary key, value text not null);

-- ---------------------------------------------------------------- helpers
create function private.rand_code(n int) returns text language sql volatile set search_path = '' as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, n)
$$;
create function private.my_pid() returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.profiles where auth_id = (select auth.uid())
$$;
create function private.is_staff() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role in ('librarian','admin') from public.profiles where auth_id = (select auth.uid())), false)
$$;
create function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' from public.profiles where auth_id = (select auth.uid())), false)
$$;
create function private.new_code(p_role text) returns text language plpgsql volatile set search_path = '' as $$
declare c text;
begin
  loop
    c := (case when p_role = 'teacher' then 'TC-' else 'ST-' end) || private.rand_code(5);
    exit when not exists (select 1 from public.profiles where code = c);
  end loop;
  return c;
end $$;
revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------- sign-up
-- The browser sends names, role (student or teacher), class and the school code as user metadata.
-- The role can never become librarian or admin from here.
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb); r text; g text; sc text;
begin
  r := case when m ->> 'role' = 'teacher' then 'teacher' else 'student' end;
  g := case when r = 'teacher' then null else nullif(m ->> 'grade', '') end;
  if not coalesce((select (value #>> '{}')::boolean from public.settings where key = 'registration_open'), true) then
    raise exception 'E_CLOSED';
  end if;
  select value into sc from public.secrets where key = 'school_code';
  if coalesce(sc, '') <> '' and coalesce(m ->> 'school_code', '') <> sc then raise exception 'E_SCHOOL_CODE'; end if;
  insert into public.profiles (auth_id, code, first_name, last_name, role, grade, email)
  values (new.id, private.new_code(r), trim(coalesce(m ->> 'first_name', '')), trim(coalesce(m ->> 'last_name', '')), r, g, new.email);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- public functions
create function public.registration_info() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'open', coalesce((select (value #>> '{}')::boolean from public.settings where key = 'registration_open'), true),
    'code_required', coalesce((select value <> '' from public.secrets where key = 'school_code'), false))
$$;
create function public.check_school_code(p_code text) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select value = coalesce(p_code, '') from public.secrets where key = 'school_code'), true)
$$;

create function public.books_overview() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id, 'title', b.title, 'author', b.author, 'genre', b.genre, 'lang', b.lang, 'year', b.year,
    'total', b.total, 'shelf', b.shelf, 'isbn', b.isbn, 'cover_url', b.cover_url, 'description', b.description,
    'added', (extract(epoch from b.created_at) * 1000)::bigint,
    'out_n',    (select count(*) from public.loans l where l.book_id = b.id and l.returned_at is null),
    'hold_n',   (select count(*) from public.holds h where h.book_id = b.id),
    'borrow_n', (select count(*) from public.loans l where l.book_id = b.id),
    'rating_avg', (select round(avg(r.rating)::numeric, 1) from public.reviews r where r.book_id = b.id),
    'rating_n', (select count(*) from public.reviews r where r.book_id = b.id)
  ) order by b.title), '[]'::jsonb)
  from public.books b
$$;

create function public.reviews_for(p_book uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'rating', r.rating, 'body', r.body, 'author', r.author_name,
    'created', r.created_at, 'mine', coalesce(r.user_id = private.my_pid(), false)) order by r.created_at desc), '[]'::jsonb)
  from public.reviews r where r.book_id = p_book
$$;

-- ---------------------------------------------------------------- signed-in functions
create function public.my_holds() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'book_id', h.book_id, 'created', h.created_at,
    'position', (select count(*) from public.holds x where x.book_id = h.book_id and (x.created_at, x.id) <= (h.created_at, h.id))
  ) order by h.created_at), '[]'::jsonb)
  from public.holds h where h.user_id = private.my_pid()
$$;

create function public.place_hold(p_book uuid) returns void language plpgsql security definer set search_path = '' as $$
declare me public.profiles; b public.books;
begin
  select * into me from public.profiles where id = private.my_pid();
  if not found then raise exception 'E_FORBIDDEN'; end if;
  if me.banned then raise exception 'E_BANNED'; end if;
  select * into b from public.books where id = p_book;
  if not found then raise exception 'E_NOT_FOUND'; end if;
  if exists (select 1 from public.loans where book_id = p_book and user_id = me.id and returned_at is null) then raise exception 'E_HAVE'; end if;
  if b.total - (select count(*) from public.loans where book_id = p_book and returned_at is null) > 0 then raise exception 'E_AVAILABLE'; end if;
  insert into public.holds (book_id, user_id) values (p_book, me.id);
exception when unique_violation then raise exception 'E_DUP';
end $$;

create function public.cancel_hold(p_book uuid) returns void language sql security definer set search_path = '' as $$
  delete from public.holds where book_id = p_book and user_id = private.my_pid()
$$;

create function public.save_review(p_book uuid, p_rating int, p_body text) returns void language plpgsql security definer set search_path = '' as $$
declare me public.profiles;
begin
  select * into me from public.profiles where id = private.my_pid();
  if not found then raise exception 'E_FORBIDDEN'; end if;
  if me.banned then raise exception 'E_BANNED'; end if;
  insert into public.reviews (book_id, user_id, rating, body, author_name)
  values (p_book, me.id, p_rating, left(trim(coalesce(p_body, '')), 600), me.first_name || ' ' || left(me.last_name, 1) || '.')
  on conflict (book_id, user_id) do update set rating = excluded.rating, body = excluded.body, created_at = now();
end $$;

create function public.delete_review(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.reviews where id = p_id and (user_id = private.my_pid() or private.is_staff());
end $$;

-- ---------------------------------------------------------------- staff functions (librarian or admin)
create function public.staff_checkout(p_book uuid, p_user uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare b public.books; u public.profiles; mx int; active int; free int; others int; mine public.holds; pos int; lid uuid;
begin
  if not private.is_staff() then raise exception 'E_FORBIDDEN'; end if;
  select * into b from public.books where id = p_book for update;
  if not found then raise exception 'E_NOT_FOUND'; end if;
  select * into u from public.profiles where id = p_user;
  if not found then raise exception 'E_NOT_FOUND'; end if;
  if u.banned then raise exception 'E_BANNED'; end if;
  select coalesce((value #>> '{}')::int, 0) into mx from public.settings where key = 'max_loans';
  select count(*) into active from public.loans where user_id = p_user and returned_at is null;
  if mx > 0 and active >= mx then raise exception 'E_LIMIT'; end if;
  free := b.total - (select count(*) from public.loans where book_id = b.id and returned_at is null);
  if free <= 0 then raise exception 'E_UNAVAILABLE'; end if;
  select count(*) into others from public.holds where book_id = b.id and user_id <> p_user;
  select * into mine from public.holds where book_id = b.id and user_id = p_user;
  if found then
    select count(*) into pos from public.holds h where h.book_id = b.id and (h.created_at, h.id) <= (mine.created_at, mine.id);
    if pos > free then raise exception 'E_QUEUE'; end if;
  elsif free <= others then raise exception 'E_QUEUE';
  end if;
  insert into public.loans (book_id, user_id, issued_by) values (b.id, p_user, private.my_pid()) returning id into lid;
  delete from public.holds where book_id = b.id and user_id = p_user;
  return lid;
exception when unique_violation then raise exception 'E_DUP';
end $$;

create function public.staff_return(p_loan uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_staff() then raise exception 'E_FORBIDDEN'; end if;
  update public.loans set returned_at = now(), returned_by = private.my_pid() where id = p_loan and returned_at is null;
  if not found then raise exception 'E_NOT_FOUND'; end if;
end $$;

create function public.staff_remove_hold(p_hold uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_staff() then raise exception 'E_FORBIDDEN'; end if;
  delete from public.holds where id = p_hold;
end $$;

create function public.staff_set_ban(p_user uuid, p_banned boolean, p_reason text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_staff() then raise exception 'E_FORBIDDEN'; end if;
  update public.profiles set banned = p_banned, ban_reason = case when p_banned then nullif(trim(coalesce(p_reason, '')), '') end where id = p_user;
end $$;

-- Adds a person who has no website login (a desk-added account). They can still borrow at the desk.
create function public.staff_add_user(p_role text, p_first text, p_last text, p_grade text) returns text language plpgsql security definer set search_path = '' as $$
declare c text;
begin
  if not private.is_staff() then raise exception 'E_FORBIDDEN'; end if;
  if p_role not in ('student','teacher') then raise exception 'E_FORBIDDEN'; end if;
  c := private.new_code(p_role);
  insert into public.profiles (code, first_name, last_name, role, grade)
  values (c, trim(p_first), trim(p_last), p_role, case when p_role = 'teacher' then null else p_grade end);
  return c;
end $$;

-- ---------------------------------------------------------------- admin functions
create function public.admin_set_role(p_user uuid, p_role text) returns void language plpgsql security definer set search_path = '' as $$
declare cur public.profiles;
begin
  if not private.is_admin() then raise exception 'E_FORBIDDEN'; end if;
  if p_role not in ('student','teacher','librarian','admin') then raise exception 'E_FORBIDDEN'; end if;
  select * into cur from public.profiles where id = p_user;
  if not found then raise exception 'E_NOT_FOUND'; end if;
  if cur.role = 'admin' and p_role <> 'admin' and (select count(*) from public.profiles where role = 'admin') <= 1 then raise exception 'E_LAST_ADMIN'; end if;
  if p_role = 'student' and cur.grade is null then raise exception 'E_NEEDS_CLASS'; end if;
  update public.profiles set role = p_role where id = p_user;
end $$;

create function public.admin_delete_user(p_user uuid) returns void language plpgsql security definer set search_path = '' as $$
declare a uuid;
begin
  if not private.is_admin() then raise exception 'E_FORBIDDEN'; end if;
  if p_user = private.my_pid() then raise exception 'E_FORBIDDEN'; end if;
  if exists (select 1 from public.loans where user_id = p_user and returned_at is null) then raise exception 'E_HAS_LOANS'; end if;
  select auth_id into a from public.profiles where id = p_user;
  delete from public.profiles where id = p_user;
  if a is not null then delete from auth.users where id = a; end if;
end $$;

create function public.admin_settings() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'E_FORBIDDEN'; end if;
  return jsonb_build_object(
    'max_loans', coalesce((select (value #>> '{}')::int from public.settings where key = 'max_loans'), 3),
    'registration_open', coalesce((select (value #>> '{}')::boolean from public.settings where key = 'registration_open'), true),
    'school_code', coalesce((select value from public.secrets where key = 'school_code'), ''));
end $$;

create function public.admin_save_settings(p_max_loans int, p_registration_open boolean, p_school_code text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'E_FORBIDDEN'; end if;
  insert into public.settings values ('max_loans', to_jsonb(greatest(0, least(coalesce(p_max_loans, 3), 50))))
    on conflict (key) do update set value = excluded.value;
  insert into public.settings values ('registration_open', to_jsonb(coalesce(p_registration_open, true)))
    on conflict (key) do update set value = excluded.value;
  if coalesce(trim(p_school_code), '') = '' then delete from public.secrets where key = 'school_code';
  else insert into public.secrets values ('school_code', trim(p_school_code)) on conflict (key) do update set value = excluded.value; end if;
end $$;

-- ---------------------------------------------------------------- access rules
alter table public.profiles enable row level security;
alter table public.books    enable row level security;
alter table public.loans    enable row level security;
alter table public.holds    enable row level security;
alter table public.shelf    enable row level security;
alter table public.reviews  enable row level security;
alter table public.settings enable row level security;
alter table public.secrets  enable row level security;   -- no policy: nobody can read it directly

revoke all on public.profiles, public.books, public.loans, public.holds, public.shelf, public.reviews, public.settings, public.secrets from anon, authenticated;
grant select on public.books, public.settings to anon, authenticated;
grant select on public.profiles, public.loans, public.holds to authenticated;
grant update (first_name, last_name, grade) on public.profiles to authenticated;   -- never role, banned or code
grant insert, update, delete on public.books to authenticated;
grant select, insert, update, delete on public.shelf to authenticated;

create policy profiles_read   on public.profiles for select to authenticated using (auth_id = (select auth.uid()) or private.is_staff());
create policy profiles_update on public.profiles for update to authenticated using (auth_id = (select auth.uid())) with check (auth_id = (select auth.uid()));
create policy books_read      on public.books    for select to anon, authenticated using (true);
create policy books_insert    on public.books    for insert to authenticated with check (private.is_staff());
create policy books_update    on public.books    for update to authenticated using (private.is_staff()) with check (private.is_staff());
create policy books_delete    on public.books    for delete to authenticated using (private.is_staff());
create policy loans_read      on public.loans    for select to authenticated using (user_id = private.my_pid() or private.is_staff());
create policy holds_read      on public.holds    for select to authenticated using (user_id = private.my_pid() or private.is_staff());
create policy shelf_own       on public.shelf    for all    to authenticated using (user_id = private.my_pid()) with check (user_id = private.my_pid());
create policy settings_read   on public.settings for select to anon, authenticated using (true);

-- Functions: nothing is callable unless granted here.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.registration_info(), public.check_school_code(text), public.books_overview(), public.reviews_for(uuid) to anon, authenticated;
grant execute on function public.my_holds(), public.place_hold(uuid), public.cancel_hold(uuid), public.save_review(uuid, int, text), public.delete_review(uuid),
  public.staff_checkout(uuid, uuid), public.staff_return(uuid), public.staff_remove_hold(uuid), public.staff_set_ban(uuid, boolean, text),
  public.staff_add_user(text, text, text, text), public.admin_set_role(uuid, text), public.admin_delete_user(uuid),
  public.admin_settings(), public.admin_save_settings(int, boolean, text) to authenticated;
