# Stacks — School Library

A student-friendly school library web app with a MangaLib-inspired discovery flow: search-first catalog browsing, genre filters, cover-led book cards, and dedicated book pages.

## Features

- Homepage with featured books, new arrivals, and category shortcuts.
- Searchable catalog with category filtering and book detail pages.
- Student self-registration and email/password sign-in through Supabase Auth.
- Student account page for profile details and borrowing requests.
- Admin-only workspace with a dedicated sidebar, book management, and loan request review.
- Supabase Row Level Security policies and a database trigger that always creates new signups as students.
- Responsive layout for desktop, tablet, and mobile.

## Run locally

1. Install Node.js 22.12 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and add your Supabase project URL and publishable key.
4. Run the SQL in `supabase/schema.sql` in the Supabase SQL Editor.
5. Run `npm run dev` and open the local URL Vite prints.

The catalog has a small local preview dataset when Supabase is not configured. Authentication, borrowing, and administration require a configured Supabase project.

## Create an admin account

Student registration is public, but the registration flow cannot assign admin permissions. After a trusted staff member registers and confirms their account, promote that account manually in the Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'staff@example.edu');
```

The admin sidebar and admin routes are only rendered for profiles whose database role is `admin`. Supabase RLS policies enforce the same authorization on the data layer.

## Deployment

Deploy as a Vite static site. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the hosting provider's environment variables, and configure the Supabase Auth site URL and redirect URLs for the deployed domain.
