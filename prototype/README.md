# GulPS / GulPM library prototype

A single-file version of the library site (`index.html`) for the Presidential School in Gulistan
(Guliston shahridagi Prezident maktabi).

- Uzbek and English interface, switchable from the header.
- Books carry a language (Uzbek, English, Russian) and can be filtered by it.
- Homepage, catalog, book pages, saved list, student registration and profile.
- Admin sidebar that only admin accounts see: loans with borrower names, books, students with all their data, admins.

This file was built to run as a Claude artifact. It reads and writes data through the artifact runtime
(`window.claude.use("db")` and `window.claude.use("user")`), so opened on its own it shows an empty library.
To host it elsewhere, replace the four places that call `DB.collection(...)` / `DB.doc(...)` with your own backend
(for example the Supabase client already used by the React app in the repository root).
The Uzbek strings live in the `UZ` object near the top of the script.
