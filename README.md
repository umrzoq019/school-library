# GulPS / GulPM School Library

Library website for the **Presidential School in Gulistan (GulPS)** / **Guliston shahridagi Prezident maktabi (GulPM)**.

- Catalog with live availability ("2 of 3 available" or "Not available · 0 of 1"), filters by genre, book language (Uzbek / English / Russian) and stock, ratings and reviews.
- Student and teacher accounts (surname, first name, class 5-01 to 11-02, unique library ID, book history), reservations with a queue, a personal shelf (want to read / reading / finished).
- Admin area for staff only: lend and return, reservations, books (CSV import/export), users, roles, bans, reports and settings. Borrowers' names and details are visible to staff.
- Uzbek / English interface switch, light and dark mode, works on phones.
- **No due dates.** A book stays with the borrower until staff mark it returned.

**Deploy it: see [DEPLOY.md](DEPLOY.md).** The site is the static folder `site/`; the database is `supabase/gulps/schema.sql` (Supabase). Try it locally with `python3 -m http.server -d site 8000` after filling in `site/config.js`.

---

# Legacy React prototype (not deployed)

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

## Deploy (Netlify Free)

The repository includes `netlify.toml` and a single-page-app redirect for React Router.

1. Sign in to [Netlify](https://app.netlify.com/) and choose **Add new site → Import an existing project**.
2. Connect GitHub and select `umrzoq019/school-library`.
3. Netlify reads the build settings from `netlify.toml` (`npm run build`, publish `dist`). Deploy the `main` branch.
4. In **Site configuration → Environment variables**, add:
   - `VITE_SUPABASE_URL` = `https://ugiotwjaehdmoddkqixp.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = the project's publishable key from Supabase **Settings → API Keys**.
5. Trigger a new deploy so the Vite build receives those variables.
6. In Supabase **Authentication → URL Configuration**, set **Site URL** to your Netlify site URL and add `https://YOUR-SITE.netlify.app/**` and `https://YOUR-SITE.netlify.app/account` to the allowed redirect URLs.

The Netlify Free plan is $0/month with a 300-credit monthly limit; sites pause when the limit is reached. See [Netlify pricing](https://www.netlify.com/pricing/).

## Database migrations

- `supabase/migrations/` contains the applied migration history for the project.
- `supabase/schema.sql` is the full current schema reference.
- The Supabase project has the database objects installed already; do not rerun the initial migration against a populated database.
