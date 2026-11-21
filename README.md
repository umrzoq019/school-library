# GulPS / GulPM School Library

Library website of the **Presidential School in Gulistan (GulPS)** / **Guliston shahridagi Prezident maktabi (GulPM)**.

- Catalog with live availability ("2 of 3 available", or "Not available · 0 of 1"), filters for genre, book language (Uzbek / English / Russian) and stock, ratings and reviews.
- Student and teacher accounts: surname, first name, class (5-01 to 11-02), unique library ID, book history.
- Reservations with a queue, and a personal shelf (want to read / reading / finished).
- Staff-only admin area: lend and return, reservations, books (CSV import and export), users with their details, roles, bans, reports, settings.
- Uzbek / English interface, light and dark mode, works on phones.
- **No due dates.** A book stays with the borrower until staff mark it returned.

## Folders

| Path | What it is |
| --- | --- |
| `site/` | The website: plain HTML, CSS and JavaScript, no build step. `config.js` holds the Supabase URL and public key; `vercel.json` the hosting headers. |
| `supabase/schema.sql` | The whole database: tables, access rules, functions. |
| `supabase/seed.sql` | Optional sample books. |
| `DEPLOY.md` | Step-by-step deployment and first-admin guide. |

Try it locally: `python3 -m http.server -d site 8000`, then open <http://localhost:8000>.
