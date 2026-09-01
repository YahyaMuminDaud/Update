# Complainathon — session handoff

Read this first if you're picking this project up in a new session. It's a
context dump, not documentation — see `README.md` for the actual
architecture/setup/deploy docs (that file is accurate and complete, don't
duplicate it here).

## Status right now

Fully working, tested end-to-end in the browser by the user: sign in with
Google, post, edit own post, delete own post — all confirmed working against
real Supabase + Firebase. **Not yet deployed to Vercel. Not yet a git repo**
(offered to `git init` + commit, user hadn't confirmed before moving on to
redesign discussion — ask again before assuming either has happened).

## Stack decisions worth knowing before touching anything

- **Prisma pinned to 6.19.3** (both `prisma` CLI and `@prisma/client`) —
  deliberately avoided Prisma 7 (new config file, new default generator,
  too new/undocumented for a reliable Vercel deploy at the time this was
  built). See Gotcha #1 below — this pin has already drifted once.
- **Postgres = Supabase** (user's choice over Neon), via the Supavisor
  pooler: `DATABASE_URL` = transaction pooler port 6543
  (`?pgbouncer=true`), `DIRECT_URL` = session pooler port 5432. Username
  format is `postgres.<project-ref>` on host
  `aws-0-us-east-2.pooler.supabase.com`. Project ref `qzpykiaekwpmpxzdtwcg`.
- **Firebase Auth = Google sign-in only.** Client SDK init is lazy and
  browser-only by design (Gotcha #3 — this was a real bug, not style
  preference). Admin SDK verifies the ID token per-request in API routes;
  ownership (`authorId === token.uid`) is enforced **server-side**, the UI
  hiding edit/delete buttons is cosmetic only.
- **Design system**: chosen via the `ui-ux-pro-max` skill → Minimalism
  pattern, Inter font, neutral slate palette + blue primary (`#2563EB`).
  The user now wants a redesign — see "What's next."

## `.env` is already populated and working

Supabase (`DATABASE_URL`, `DIRECT_URL`) and Firebase
(`NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_SERVICE_ACCOUNT_BASE64`) for the live
"complainathon" projects on both services, both free tier. Don't need to
redo any of the account setup in `README.md` unless something breaks.

## Gotchas already hit once — don't repeat

1. **Prisma version drift**: running `npm install prisma --save-dev` with
   no version pin (e.g. from Supabase's own "Connect to your project"
   instructions) installs latest major (v7) and desyncs it from
   `@prisma/client`, which breaks `db push`/generate in confusing ways.
   Always pin explicitly: `npm install prisma@6.19.3 --save-dev`.
2. **Firebase Admin must stay lazy**: `src/lib/firebase-admin.ts` exports
   `getAdminAuth()`, a memoized lazy getter — not a top-level `adminAuth`
   constant. Calling `getAuth()` at module scope breaks Next's build-time
   route analysis before env vars are available in that phase.
3. **Firebase client Auth must stay lazy + browser-only**:
   `src/lib/firebase-client.ts` exports `getFirebaseAuth()`, called only
   from `useEffect` or event handlers inside `AuthProvider.tsx` — never
   from a component's render body. Calling `getAuth()` at render time runs
   during SSR of *every* page (including `/_not-found`) and throws if env
   vars are missing/invalid at that point. Auth is a browser-only concept;
   keep it out of the server render path entirely.
4. Supabase's password placeholder in copy-paste snippets is
   `[YOUR-PASSWORD]` — replace the whole bracketed token including the
   brackets, don't just fill in the password and leave `[...]` around it.

## What's next (where the last session stopped)

The user asked to redesign the frontend and add more features, then said
"leave this for another day" before specifics were nailed down. Next
session should start by asking:

1. **Redesign direction** — no visual direction given yet beyond wanting
   one. They want to bring in **Figma designs**: no Figma MCP/connector was
   available in that session, so when asked how to bridge Figma → code,
   they chose **"share links or exported screenshots"** (not Dev Mode MCP,
   not a REST API token). Expect them to paste Figma links or exported
   images next session — translate by eye into Tailwind/React, and ask for
   the Inspect panel's hex/px values on specific frames if pixel precision
   matters for a given component.
2. **New features** — not yet specified at all. Ask what they have in
   mind before planning anything.

Don't start writing code until both of those are concrete — this was
explicitly left as "let's talk it through" territory, not a green light to
redesign speculatively.

## Quick resume checklist

- `npm run dev` should just work (`.env` is already populated).
- After any change: `npx tsc --noEmit`, `npm run lint`, `npm run build` —
  all three were clean as of the last session; keep them that way.
- Still outstanding regardless of redesign: `git init` + first commit, then
  Vercel deploy per `README.md` step 5 (needs the user's GitHub/Vercel
  accounts — can't be done from here without them).
