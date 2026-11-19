# Putting the GulPS / GulPM library online

The website is the plain folder `site/` (no build step). The data lives in a free Supabase project. Students and teachers only need the web address. About 25 minutes, once.

## 1. Create the database (Supabase)

1. Sign in at <https://supabase.com> and press **New project**. Choose a region close to Uzbekistan (for example Frankfurt) and save the database password.
2. Open **SQL Editor > New query**, paste all of `supabase/gulps/schema.sql`, press **Run**. It should finish with "Success".
3. Optional: run `supabase/gulps/seed.sql` the same way to add 12 sample books (English, Uzbek, Russian).
4. Open **Project Settings > API** and copy the **Project URL** and the **anon / publishable key**. You need both in step 3. Never use the `service_role` key.

## 2. Set up sign-in (Supabase > Authentication)

- **Providers > Email**: keep it enabled.
- **Confirm email**: choose one:
  - **Off (simplest).** Students can log in right after registering. Protect registration with a school code (step 5) so strangers cannot join.
  - **On.** Students must click a link in an email. Supabase's built-in email sender only delivers to your own team and is heavily limited, so this needs your own SMTP service (Settings > Authentication > SMTP, for example Brevo or Resend).
- **Password reset** also sends email, so "Forgot your password?" only works once SMTP is set up. Until then an admin can set a new password: Authentication > Users > the user > Send password recovery, or delete and re-register.
- **URL Configuration**: after step 4, set **Site URL** to your website address, and add it under **Redirect URLs** as well.

## 3. Put your keys in the site

Edit `site/config.js`:

```js
window.GUL_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-ANON-KEY"
};
```

The anon key is meant to be public. The rules in `schema.sql` decide what each person can read and change.

## 4. Publish the website (Netlify)

1. Push this repository to GitHub (the `site/` folder and `netlify.toml` must be in the branch you deploy).
2. At <https://app.netlify.com> choose **Add new site > Import an existing project**, pick the repository. Netlify reads `netlify.toml`: publish directory `site`, no build command. Press **Deploy**.
3. Optional: **Domain management** to add your own domain. HTTPS is automatic.
4. Go back to Supabase and set the Site URL (step 2) to the address Netlify gave you.

No GitHub? Drag the `site` folder onto <https://app.netlify.com/drop>. Any static host works the same way (Cloudflare Pages, GitHub Pages, Vercel). `netlify.toml` only adds security headers on Netlify.

## 5. Make yourself the first admin

1. Open your website and **Register** with your own email.
2. In Supabase **SQL Editor** run (with your email):

   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
3. Refresh the website. The **Admin** button appears. More admins and librarians: Admin > **Admins**.
4. Admin > **Settings**: set a **school code** (people need it to register), the number of books one person may borrow, and whether registration is open.
5. Admin > **Books**: add books one by one, or **Import CSV** (download the template there).

## How it works day to day

- Students register themselves (surname, first name, class 5-01 to 11-02, email, password) and get a library ID such as `ST-7K2QX`. Teachers register with surname and first name only.
- Books are handed out at the library desk. Staff open **Admin > Loans > Check out a book**, pick the borrower and the book, and press Check out. **There are no due dates**: a book stays with the borrower until staff press **Mark returned**.
- When every copy is out, signed-in readers can **Reserve** a book and see their place in the queue. Staff see reservations under **Admin > Reservations**.
- People without a login (for example a young child) can be added at the desk with **Users > Add user**. They get an ID and can still borrow.

## Good to know

- The free Supabase plan pauses a project after a week without use. Restore it with one click in the dashboard; open the site now and then, or upgrade.
- Back up from Supabase (Database > Backups on paid plans) or export books, users and loans with the **Export CSV** buttons in Admin.
- The school-code check cannot stop a determined attacker. It keeps casual strangers out. Anyone who picks "teacher" at registration gets a teacher label only; roles with extra powers can be given only by an admin.
- The older React prototype in `src/` is no longer deployed and can be deleted.
