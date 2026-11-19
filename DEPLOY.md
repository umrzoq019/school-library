# Deploying the GulPS / GulPM library

The website is the static folder `site/` (no build). The data lives in Supabase. Students only need the web address.

## Already done

- The Supabase project **school-library** has the database from `supabase/schema.sql` and 12 sample books (`supabase/seed.sql`).
- `site/config.js` points at that project. The key in it is the public *anon* key. It is meant to be public: the database rules decide who can read or change what. Never put the `service_role` key anywhere in this repository.

## 1. Publish the site (Netlify, about 5 minutes)

1. Open <https://app.netlify.com> and sign in with GitHub.
2. **Add new site > Import an existing project > GitHub**, choose `school-library`, branch `main`.
3. Netlify reads `netlify.toml` (publish directory `site`, no build command). Press **Deploy**.
4. **Site configuration > Change site name**: type `gulps`. The address is then **https://gulps.netlify.app** (if taken, `gulps-library` or `gulps-uz`).

Any other static host works too (Cloudflare Pages, GitHub Pages, Vercel): publish the `site/` folder.

### Own address (optional, paid)

`.library` is not a real domain ending, so `gulps.library` cannot be bought. A real one would be `gulps.uz` or `library.gulps.uz`, bought from a `.uz` registrar (check availability and price there). Then in Netlify: **Domain management > Add a domain** and enter the DNS records it shows at the registrar. HTTPS is automatic.

## 2. Tell Supabase the address (Authentication > URL Configuration)

Set **Site URL** to the website address and add it under **Redirect URLs**. Otherwise e-mail links (confirmation, password reset) point to the wrong place.

## 3. Choose how sign-up works (Authentication > Providers > Email)

- **Confirm email OFF (simplest).** Students can log in right after registering. Use a school code (step 5) so strangers cannot join.
- **Confirm email ON.** Needs your own e-mail service under Authentication > SMTP (for example Brevo or Resend). Supabase's built-in sender only reaches your own team and is heavily limited.
- **Forgot password** also needs that SMTP. Until then, an admin can send a recovery link from Authentication > Users.

## 4. Become the first admin

1. Open the website and **Register** with your own e-mail.
2. In Supabase > **SQL Editor** run (with your e-mail):

   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
3. Reload the site. The **Admin** button appears. More admins and librarians: Admin > **Admins**.

## 5. First setup inside the Admin area

- **Settings:** set a **school code** (registration then requires it), the number of books one person may borrow, and whether registration is open. Share the code only inside the school.
- **Books:** delete the sample books and add your own one by one, or use **Import CSV** (template download inside).

## Daily use

- Students register themselves: surname, first name, class, e-mail, password. They get an ID such as `ST-7K2QX`. Teachers register with surname and first name only.
- Books are handed out at the desk: **Admin > Loans > Check out a book**, choose borrower and book. **Mark returned** when it comes back. There are no due dates.
- When every copy is out, signed-in readers can **Reserve** and see their queue place. Staff see them under **Admin > Reservations**.
- A person without a login (for example a young child) can be added at the desk: **Users > Add user**.

## Good to know

- Free Supabase projects pause after a week without use. Restore with one click in the dashboard, or upgrade to avoid it.
- **Export CSV** in Admin gives backups of books, users and loans.
- The school code keeps casual strangers out; it is not a defence against a determined attacker. Anyone can pick "teacher" while registering, which only changes their label. Librarian and admin roles can be given only by an admin.
