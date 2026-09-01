# Complainathon

A public feed of short complaints, sorted by most recent. Anyone can read the
feed; signing in with Google lets you post, and you can only edit or delete
your own complaints.

**Stack:** Next.js (App Router, TypeScript) · Prisma · Postgres (Neon or
Supabase) · Firebase Authentication (Google sign-in) · Tailwind CSS · Vercel.
Every piece runs on a free tier.

## How it works

- `GET /api/complaints` — public, returns the 100 most recent complaints.
- `POST /api/complaints` — requires a valid Firebase ID token, creates a
  complaint owned by the signed-in user.
- `PATCH /api/complaints/[id]` / `DELETE /api/complaints/[id]` — requires a
  valid Firebase ID token **and** that the token's `uid` matches the
  complaint's `authorId`; otherwise the API returns `403`.

The client sends the Firebase ID token as `Authorization: Bearer <token>` on
every write. The server verifies it with the Firebase Admin SDK
(`src/lib/auth-server.ts`) — the UI hiding edit/delete buttons for other
users' posts is a convenience, not the security boundary; the API enforces it
independently.

## 1. Create a Postgres database (pick one, both are free)

### Option A — Neon

1. Create a project at [neon.tech](https://neon.tech).
2. From the dashboard, copy the **pooled connection string** → `DATABASE_URL`.
3. Copy the **direct connection string** → `DIRECT_URL`.

### Option B — Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Project Settings → Database → Connection string.
3. Use the **Transaction pooler** (port 6543) for `DATABASE_URL`, appending
   `?pgbouncer=true`.
4. Use the **Session pooler / direct** (port 5432) connection for
   `DIRECT_URL`.

## 2. Create a Firebase project (Google sign-in)

1. Create a project at the [Firebase console](https://console.firebase.google.com).
2. **Build → Authentication → Get started → Sign-in method → Google → Enable.**
3. **Project settings → General → Your apps → Add app → Web.** Copy the
   `firebaseConfig` values into the `NEXT_PUBLIC_FIREBASE_*` variables below.
4. **Project settings → Service accounts → Generate new private key.** This
   downloads a JSON file — base64-encode the whole file into
   `FIREBASE_SERVICE_ACCOUNT_BASE64`:
   - macOS/Linux: `base64 -i service-account.json | tr -d '\n'`
   - Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))`
5. Once you know your deployed domain, add it under **Authentication →
   Settings → Authorized domains** (Vercel's `*.vercel.app` domain and any
   custom domain). `localhost` is allowed by default.

## 3. Configure environment variables

Copy `.env.example` to `.env` and fill in the values from steps 1–2:

```bash
cp .env.example .env
```

## 4. Install dependencies and push the schema

```bash
npm install
npx prisma db push    # creates the Complaint table from prisma/schema.prisma
npm run dev            # http://localhost:3000
```

## 5. Deploy to Vercel (free tier)

1. Push this repo to GitHub.
2. [Import the repo on Vercel](https://vercel.com/new).
3. Add every variable from `.env` as a Vercel **Environment Variable**
   (Project Settings → Environment Variables) — do this for all
   environments (Production/Preview/Development).
4. Deploy. Vercel runs `npm run build`, which runs `prisma generate`
   automatically via the `postinstall` script (see `package.json`).
5. Add your Vercel deployment URL to Firebase's **Authorized domains**
   (step 2.5 above), or Google sign-in will fail with
   `auth/unauthorized-domain`.

No further migration step is needed on Vercel — the schema was already
pushed to the database in step 4 above, and Vercel just connects to it via
`DATABASE_URL`.

## Project structure

```
src/
  app/
    page.tsx                     Server component: fetches the initial feed via Prisma
    loading.tsx                  Route-level skeleton loading state
    layout.tsx                   Root layout, Inter font, AuthProvider
    api/complaints/route.ts      GET (list) / POST (create)
    api/complaints/[id]/route.ts PATCH (update) / DELETE — author-only
  components/
    AuthProvider.tsx             Firebase auth state + Google sign-in/out
    ComplaintFeed.tsx             Client state, wires API calls to the UI
    ComposeBox.tsx                New-complaint form
    ComplaintCard.tsx             Single complaint, inline edit/delete for owner
    SignInButton.tsx / Avatar.tsx / EmptyState.tsx / icons.tsx
  lib/
    prisma.ts                    Prisma client singleton
    firebase-client.ts            Firebase client SDK init
    firebase-admin.ts             Firebase Admin SDK init (server-only)
    auth-server.ts                Verifies the bearer token on API routes
    validation.ts                 Shared complaint length/shape rules
prisma/schema.prisma              Complaint model
```

## Local development notes

- `npm run dev` — dev server.
- `npx prisma studio` — browse/edit the database visually.
- `npx prisma db push` — sync schema changes to the database (no migration
  history; fine for a small project like this). Use `npx prisma migrate dev`
  instead if you want tracked migration files.
