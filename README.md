# Korean Community @ BU

A community site for Korean students at Boston University: Academics, Sports, and Housing in one place.
Built by the BU LIKELION team (소영, 희서, 우주, 원우).

**Stack:** Next.js (App Router) · Tailwind CSS · Supabase (login + database) · Vercel (hosting)

---

## Week 1 status ✅

- Homepage, navbar, and three category tabs (Academics / Sports / Housing)
- @bu.edu-only sign-up and login with an emailed code (no passwords)
- Log out, plus the navbar shows who is logged in
- Database tables for posts, comments, and reports (with security rules)

---

## First-time setup (one person, once)

### 1. Create the Supabase project
1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Open **SQL Editor → New query**, paste everything in `supabase/schema.sql`, and click **Run**.
3. Open **Authentication → Email Templates → Magic Link** and replace the message body with:
   ```html
   <h2>Your Korean Community login code</h2>
   <p>Enter this code to log in: <strong>{{ .Token }}</strong></p>
   ```
   Save. (Without this step, users get a link instead of a code.)
4. Open **Project Settings → API** and copy the **Project URL** and the **anon / publishable key**.

### 2. Before inviting testers (Week 4)
Supabase's built-in email sender is only meant for testing and is heavily limited.
Before real users sign up, connect a custom email sender (for example Resend) in
**Authentication → SMTP Settings**. Check Supabase's docs for the current limits.

---

## Running it on your computer (everyone)

```bash
git clone https://github.com/YOUR-NAME/korean-community.git
cd korean-community
npm install
```

Copy `.env.example` to a new file named `.env.local` and paste in the two Supabase values.
**Never commit `.env.local`.** Share the keys privately (e.g. KakaoTalk DM).

```bash
npm run dev
```

Open http://localhost:3000.

---

## Where things are

```
app/
  layout.tsx          Shared frame (navbar + footer) on every page
  page.tsx            Homepage  →  /
  academics/page.tsx  →  /academics
  sports/page.tsx     →  /sports
  housing/page.tsx    →  /housing
  login/page.tsx      →  /login   (bu.edu email → code → logged in)
components/
  Navbar.tsx          Top bar: tabs + log in / log out
  CategoryPage.tsx    Shared layout for the three tabs (posts go here in Week 2)
lib/
  categories.ts       The three tabs, defined once
  supabase/client.ts  createClient(): use this to talk to the database
supabase/
  schema.sql          Database tables + security rules
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
add the two `NEXT_PUBLIC_SUPABASE_...` environment variables → **Deploy**.
