# Korean Community @ BU

A community site for Korean students at Boston University: Academics, Sports, and Housing in one place.
Built by the BU LIKELION team (소영, 희서, 우주, 원우).

**Stack:** Next.js (App Router) · Tailwind CSS · Clerk (login) · Supabase (database) · Vercel (hosting)

---

## Week 1 status ✅

- Homepage, navbar, and three category tabs (Academics / Sports / Housing)
- Sign up / log in with Clerk (email + password, email verification), @bu.edu only
- Database tables for posts, comments, and reports, with security rules that
  only let BU students read/write and only let people edit their own posts

---

## First-time setup (one person, once)

### 1. Clerk (login)
1. Create an application at [clerk.com](https://clerk.com). Turn on **Email** (and Password if you want).
2. **Restrictions → Allowlist**: turn it on and add the domain `bu.edu`.
   (Free in development mode, which is what we use for the MVP.)
3. **Sessions → Customize session token**: add this and save:
   ```json
   { "email": "{{user.primary_email_address}}" }
   ```
4. **Integrations → Supabase**: turn it on and copy the **Clerk domain** it shows.
5. **API Keys**: copy the publishable key (`pk_test_...`) and secret key (`sk_test_...`).

### 2. Supabase (database)
1. **Authentication → Sign In / Providers → Third-Party Auth → Add provider → Clerk**,
   paste the Clerk domain, save.
2. For a new database, open **SQL Editor → New query**, paste `supabase/schema.sql`, and run it once. The script stops if any of the community tables already exist.
3. **Project Settings → API Keys**: copy the Project URL and the publishable key.

### Updating an existing database

1. Save the SQL for the change in a new file under `supabase/migrations/` named `YYYYMMDDHHMMSS_description.sql`. Use targeted statements such as `ALTER TABLE` to add a column or `ALTER POLICY` to update permissions.
2. Apply the migration to a test database with the existing schema. Verify that existing data is still present and the change works.
3. After review, apply only the new migration in the team's Supabase SQL Editor. Record which migrations have been applied so they can be run once and in order.

For a new database, run `schema.sql` first, then apply migrations in filename order.

---

## Running it on your computer (everyone)

```bash
git clone https://github.com/YOUR-NAME/korean-community.git
cd korean-community
npm install
```

Copy `.env.example` to a new file named `.env.local` and fill in the 2 Clerk keys and 2 Supabase values.
**Never commit `.env.local`.** Share the keys privately (e.g. KakaoTalk DM).

```bash
npm run dev
```

Open https://bukorean.vercel.app

---

## Where things are

```
app/
  layout.tsx          Shared frame (navbar + footer) on every page
  page.tsx            Homepage  →  /
  academics/page.tsx  →  /academics
  sports/page.tsx     →  /sports
  housing/page.tsx    →  /housing
components/
  Navbar.tsx          Top bar: tabs + Clerk log in / sign up / profile button
  CategoryPage.tsx    Shared layout for the three tabs (posts go here in Week 2)
lib/
  categories.ts       The three tabs, defined once
  supabase/client.ts  useSupabase(): use this to talk to the database
supabase/
  schema.sql          Initial tables and security rules for a new database
  migrations/         Incremental SQL changes (added as needed)
proxy.ts              Lets Clerk check who is logged in on every page
```

To add or rename a tab, edit `lib/categories.ts` and add a matching folder in `app/`.

---

## Team workflow

1. `git pull` before you start working.
2. Make a branch for your feature: `git checkout -b feature/image-upload`
3. Commit and push your branch, then open a Pull Request on GitHub.
4. Someone else checks it, then merge into `main`. Vercel redeploys automatically.

## Deploying

On [vercel.com](https://vercel.com): **Add New → Project** → import this repo →
add all 4 environment variables from `.env.local` → **Deploy**.
