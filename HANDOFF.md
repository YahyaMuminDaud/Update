# Complainathon — session handoff

Read this first if you're picking this project up in a new session. It's a
context dump of current state and non-obvious decisions, not documentation
— see `README.md` for architecture/setup/deploy docs (accurate for local
dev; see "Deployment reality" below for how production actually gets
updated).

## Status right now

**Live at https://complainathon.vercel.app**, latest commit `dc5b948`,
deployed. The app is a group-scoped complaint feed ("Twitter x Locket,"
per the user): sign in with Google, pick a username on first sign-in,
then join or create up to 5 groups by invite code. Each group has its own
private feed — same compose/edit/delete UX per post, just scoped to the
group. No group discovery/browsing; joining requires knowing the invite
code.

**Not yet confirmed working end-to-end**: Google sign-in on iPhone was
broken (see "Google sign-in on iOS Safari" below) and was just switched
to a different sign-in mechanism (Google Identity Services) this session.
The fix is deployed and the required Google Cloud Console origin was just
added, but Google's own docs warn origin changes can take "5 minutes to a
few hours" to propagate — **this has not yet been confirmed working on a
real iPhone**. If you're picking this up fresh, that's the first thing to
verify before doing anything else; if it's still broken after a few
hours, re-check the exact origin value saved in Google Cloud Console
(see gotcha #10 below).

App naming is still unresolved — the Figma mockups show a literal "Name"
placeholder for the app title. Code/branding still says "Complainathon"
everywhere.

## How it's built

**Data model** (`prisma/schema.prisma`):
- `User` — Firebase `uid` → unique `username`. Required before posting or
  creating/joining a group (blocking modal on first sign-in,
  `src/components/UsernameModal.tsx`, orchestrated from `AuthProvider.tsx`).
  Changeable anytime after via the pencil icon. Usernames are **frozen
  onto `Complaint.authorName` at post time** — renaming later does NOT
  rewrite old posts' displayed name.
- `Group` — `id`, `name`, unique `inviteCode`, `createdAt`.
- `GroupMember` — join table: `groupId`, `userId`, `role` (`OWNER` |
  `MEMBER`), unique on `[groupId, userId]`. Creator is OWNER (can remove
  members, delete the group, regenerate the invite code); everyone else
  is MEMBER. **Owners cannot leave a group** — they must delete it
  instead (members can leave anytime). 5-group cap is combined
  (owned + joined together), enforced in the API layer, not the schema.
- `Complaint` — unchanged shape from v1 except: requires `groupId`
  (cascades on group delete), and has **no `authorPhoto`** — avatars were
  removed app-wide (`Avatar.tsx` deleted) to match the mockups' text-only
  design.

**API routes**: group CRUD lives under `src/app/api/groups/` — `POST /`
(create), `GET /` (list caller's groups), `POST /join` (by invite code),
`GET /[id]` (detail + role; `inviteCode` included only for the OWNER),
`GET /[id]/members`, `DELETE /[id]` (OWNER-only), `POST /[id]/leave`
(400s for OWNER), `DELETE /[id]/members/[userId]` (OWNER-only, can't
target self), `POST /[id]/regenerate-code` (OWNER-only),
`GET|POST /[id]/complaints` (group-scoped feed — there is no flat public
`/api/complaints` anymore; every read requires group membership).
Membership/ownership checks are centralized in `src/lib/groups.ts`
(`requireMembership`, `requireOwner`). `PATCH|DELETE /api/complaints/[id]`
stayed flat since a complaint id is already globally unique.

**Pages** (all client components — see architecture note below): `/`
(login), `/groups` (picker: grid of group buttons + Join/Create, capped
at 5, sign-out in the top-right corner), `/groups/create`, `/groups/join`,
`/groups/[id]` (feed — header `GroupHeader.tsx` has a back-arrow to
`/groups`, group name + username top-left, settings gear top-right),
`/groups/[id]/settings` (`GroupSettings.tsx`: invite code + regenerate
for OWNER, member list with remove for OWNER, delete-group for OWNER or
leave-group for everyone else).

**Why pages are client components, not server-rendered**: feeds are
private now (group-membership-gated), and auth is Bearer-token-only —
there's no session cookie a server component could read to know who's
asking. So `/groups` and `/groups/[id]` fetch client-side on mount
instead of via SSR, same pattern `ComposeBox`/`SignInButton` already used
for the loading-auth-state case. Minor UX cost (a spinner before first
paint) traded for not needing a session-cookie auth path.

**Design**: dark-navy, centered, outlined "ghost" buttons (border,
transparent/dark fill) — driven by Figma mockups sent as inline images,
not a Figma file/link. The existing dark-mode CSS tokens in `globals.css`
already matched closely enough that no new palette was needed, just new
component styling for the group-related screens. Light/dark still follows
system preference, same as before. Primary actions that predate the
redesign (Post, Save) keep the older solid-fill button style — only
Login/Join/Create/group-tile buttons use the new outlined style.

**Known deviation from mockups**: the picker's group-tile grid is a
simple centered flex-wrap, not pixel-identical to the mockups' bespoke
2/1/2 arrangement at exactly 5 groups vs. a plain row of 3 at exactly 3
groups. Worth eyeballing against the real mockups if it looks off, and
worth checking whether more mockup screens show up later — the user
described the feed/settings/create/join screens verbally ("assume a
similar design") rather than mocking every one, so what's built
(`GroupHeader.tsx`, `GroupSettings.tsx`, `CreateGroupForm.tsx`,
`JoinGroupForm.tsx`) is a best-effort interpretation, not a pixel-checked
match.

## Google sign-in on iOS Safari — a whole saga, read before touching auth

Google sign-in worked fine on desktop but was completely broken on
iPhone. What was tried, in order, and why each attempt failed:

1. **`signInWithPopup` (original v1-v3 code)**: failed on iPhone with
   Firebase's own error, `"Unable to process request due to missing
   initial state."`
2. **Switched to `signInWithRedirect` on mobile** (desktop kept the
   popup): still failed, but silently — user completed the Google
   sign-in screen, got redirected back, and the page just looked
   unchanged, no error anywhere.
3. **Added a `pageshow`/`event.persisted` listener to force-reload on
   Safari's back-forward-cache restore** (a plausible cause of "redirect
   completes but the page never re-runs its mount effect"): didn't fix
   it.
4. **Added visible on-screen error reporting** (previously errors only
   went to `console.error`, invisible without plugging the phone into a
   Mac for remote debugging): still showed nothing, even after the user
   **fully reset their iPhone** (ruling out every device-state theory —
   cached JS, cookies, Private Browsing residue, ITP's learned per-site
   classification).

**Root cause**, once a device reset didn't fix it: Firebase's sign-in
flow (both popup and redirect — they share this underlying mechanism)
bounces through an invisible intermediate hop with zero user interaction:
`your app → <project>.firebaseapp.com/__/auth/handler → accounts.google.com
→ firebaseapp.com again → your app`. Safari has a built-in, stateless
anti-"bounce tracking" protection that detects exactly this pattern — a
site writing storage then immediately (via JS, not a real link click)
redirecting through another domain with no interaction on it — and wipes
that storage right then, before the flow ever reaches Google. This is
deterministic and device-independent (not a setting, not cache), which is
why every attempt above failed identically and why the phone reset didn't
help.

**Fix (this session, commit `dc5b948`)**: replaced Firebase's own
popup/redirect entirely with **Google Identity Services** (`src/lib/
google-identity.ts`) — loads `https://accounts.google.com/gsi/client`,
calls `google.accounts.oauth2.initTokenClient(...).requestAccessToken()`
to open a *real* popup straight to `accounts.google.com` (no
`firebaseapp.com` bounce at all), then exchanges the resulting access
token for a Firebase credential via `GoogleAuthProvider.credential(null,
accessToken)` + `signInWithCredential`. `AuthProvider.tsx` calls
`preloadGoogleIdentity()` on mount so the script is already loaded by the
time the user clicks the button — `requestAccessToken()` must run
**synchronously inside the click handler's call stack** or Safari's
popup blocker rejects it; an `await` before it (e.g. lazy-loading the
script on click) breaks that chain.

This required a new env var, **`NEXT_PUBLIC_GOOGLE_CLIENT_ID`** — the Web
client ID Firebase auto-provisions for the Google sign-in provider (find
it at Firebase Console → Authentication → Sign-in method → Google → Web
SDK configuration). Already added to `.env` and to Vercel across all
three environments this session.

## Deployment reality — read before touching prod

This project is **not connected to GitHub for auto-deploy**. It was
deployed straight from the local filesystem via the Vercel CLI. Pushing
commits to git (there's no remote configured anyway) does **nothing** to
the live site. To ship a change:

```bash
npx vercel --prod --scope scrap5
```

**Always pass `--scope scrap5` explicitly.** Bare `npx vercel --prod`
failed once with `"Not authorized"` even with a valid logged-in CLI
session and a correct `.vercel/project.json` — adding `--scope scrap5`
fixed it immediately. Cause unconfirmed; don't bother re-debugging it.

Vercel project: `scrap5/complainathon` (scope `scrap5`, the account's
default team, email `yahyamdaud21@gmail.com`). Vercel CLI is not
installed globally — everything runs via `npx vercel ...`, which
downloads on first use each session if the npx cache is cold.

All 9 env vars from `.env` are already set in Vercel across
Production/Preview/Development (`npx vercel env ls` to check). If you add
a new env var to `.env`, you must also `npx vercel env add NAME
<environment>` (one environment per invocation — the CLI rejects multiple
environments in one call) for each of production/preview/development
before it'll be available at build/runtime. `NEXT_PUBLIC_*` vars that
look like credentials need `--type config` explicitly or the CLI blocks
the add asking you to choose public/private.

`complainathon.vercel.app` **is** confirmed added to Firebase Console →
Authentication → Settings → Authorized domains (required or Google
sign-in fails with `auth/unauthorized-domain` on the live site) — this
was unconfirmed for a while but is now resolved, no action needed.

**Schema changes need a human in the loop.** `npx prisma db push` against
the real Supabase DB was blocked by the auto-mode classifier as a
production-schema-altering action — it had to be run by the user
manually, not the agent. Same happened trying to write
`.claude/settings.local.json` (permission config is treated as a security
boundary the agent can't self-modify). Expect both again; plan to hand
these off rather than assuming they'll run automatically.

## Stack decisions worth knowing before touching anything

- **Prisma pinned to 6.19.3** (both `prisma` CLI and `@prisma/client`) —
  deliberately avoided Prisma 7/8rc (new config file, new default
  generator, too new/undocumented for a reliable Vercel deploy). See
  Gotcha #1 — this pin has already drifted once before.
- **`jose` pinned to 5.10.0 via npm `overrides`** in `package.json` — see
  Gotcha #5. This is load-bearing; don't remove it without understanding
  why it's there, and be careful if you ever bump `firebase-admin` or
  `jwks-rsa`, since the override forces a version outside their declared
  semver range.
- **Postgres = Supabase**, via the Supavisor pooler: `DATABASE_URL` =
  transaction pooler port 6543 (`?pgbouncer=true`), `DIRECT_URL` = session
  pooler port 5432. Username format `postgres.<project-ref>` on host
  `aws-0-us-east-2.pooler.supabase.com`. Project ref
  `qzpykiaekwpmpxzdtwcg`.
- **Firebase Auth = Google sign-in only.** Client SDK init is lazy and
  browser-only by design (Gotcha #3). Admin SDK verifies the ID token
  per-request in API routes; ownership (`authorId === token.uid`) is
  enforced **server-side**, the UI hiding edit/delete buttons is cosmetic
  only.
- **Google sign-in itself goes through Google Identity Services, not
  Firebase's `signInWithPopup`/`signInWithRedirect`** — see "Google
  sign-in on iOS Safari" above for why. `src/lib/google-identity.ts`
  handles the GIS script + token client; `AuthProvider.tsx` exchanges the
  access token for a Firebase credential via `signInWithCredential`.

## `.env` is already populated and working

Supabase (`DATABASE_URL`, `DIRECT_URL`) and Firebase
(`NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_SERVICE_ACCOUNT_BASE64`) for the live
"complainathon" projects on both services, both free tier, plus
`NEXT_PUBLIC_GOOGLE_CLIENT_ID` (Google Identity Services, see "Google
sign-in on iOS Safari" above). The same values are mirrored into Vercel's
env vars (see "Deployment reality"). Don't need to redo any account setup
in `README.md` unless something breaks.

## Gotchas already hit once — don't repeat

1. **Prisma version drift**: running `npm install prisma --save-dev` with
   no version pin installs latest major and desyncs it from
   `@prisma/client`, breaking `db push`/generate in confusing ways.
   Always pin explicitly: `npm install prisma@6.19.3 --save-dev`.
2. **Firebase Admin must stay lazy**: `src/lib/firebase-admin.ts` exports
   `getAdminAuth()`, a memoized lazy getter — not a top-level `adminAuth`
   constant. Calling `getAuth()` at module scope breaks Next's build-time
   route analysis before env vars are available in that phase.
3. **Firebase client Auth must stay lazy + browser-only**:
   `src/lib/firebase-client.ts` exports `getFirebaseAuth()`, called only
   from `useEffect` or event handlers inside `AuthProvider.tsx` — never
   from a component's render body.
4. Supabase's password placeholder in copy-paste snippets is
   `[YOUR-PASSWORD]` — replace the whole bracketed token including the
   brackets.
5. **`firebase-admin` + Turbopack production build = `ERR_REQUIRE_ESM`,
   silently NOT reproducible in `next dev`.** `firebase-admin`'s
   `jwks-rsa` dependency requires `jose ^6.1.3`, which ships ESM-only (no
   CJS `require` export condition). Next.js auto-externalizes
   `firebase-admin`, so in Vercel's serverless runtime, loading
   `firebase-admin/auth` does a raw Node `require()` that transitively
   hits `require('jose')` and throws — breaking **every** route that
   imports `src/lib/auth-server.ts`, even ones that never call the auth
   check, because the static `import` loads the whole module graph. Fixed
   via `"overrides": { "jose": "5.10.0" }` in `package.json` (last version
   with a real CJS build; the narrow API surface `jwks-rsa` uses is
   unchanged between v5 and v6). **If you ever see a 500 on every API
   route in production only, with builds/typecheck/dev all green, check
   this override didn't get removed or that a `firebase-admin`/`jwks-rsa`
   bump didn't reintroduce the problem with a different transitive
   package.**
6. The message `Detected .env file, it is strongly recommended to use
   Vercel's env handling instead` in Vercel build logs is **not** your
   local `.env` leaking — `.gitignore`/CLI upload rules exclude it.
   Vercel's own build container materializes a `.env` from the dashboard
   env vars for framework-detection purposes; expected, not a secret
   exposure.
7. **Vercel deploy needs `--scope scrap5` explicitly** — see "Deployment
   reality" above.
8. **Schema pushes and permission-file edits need a human in the loop**
   — the agent's auto-mode classifier blocks both `npx prisma db push`
   against the real DB and writes to `.claude/settings.local.json`. Don't
   assume either will run automatically; hand them to the user.
9. **Firebase's `signInWithPopup`/`signInWithRedirect` are both
   deterministically broken on iOS Safari** — see "Google sign-in on iOS
   Safari" above. Don't try switching between them again as a fix; the
   failure is structural (Safari's anti-bounce-tracking protection wiping
   storage during Firebase's invisible `firebaseapp.com` hop), not a
   config or caching issue. The fix in place is Google Identity Services
   instead.
10. **Google Identity Services needs its own origin allowlist, separate
    from Firebase's "Authorized domains."** Google Cloud Console → APIs &
    Services → Credentials → the OAuth 2.0 Client ID (matches
    `NEXT_PUBLIC_GOOGLE_CLIENT_ID`) → "Authorized JavaScript origins" must
    list `https://complainathon.vercel.app` exactly (no trailing slash) or
    GIS's popup fails with `Error 400: origin_mismatch`. Google's own UI
    warns changes can take "5 minutes to a few hours" to propagate — don't
    assume a fix is broken just because it doesn't work immediately after
    saving the origin.
11. **The Google Cloud Console project picker can default to the wrong
    Google account/org** and simply not list the `complainathon` project
    at all (it showed an unrelated "n8n" project instead once). Every
    Firebase project is backed by a GCP project with the same ID, so
    jumping straight to
    `https://console.cloud.google.com/apis/credentials?project=complainathon`
    bypasses the picker; if that 404s or asks to sign in, you're logged
    into Cloud Console with the wrong Google account (should be
    `yahyamdaud21@gmail.com`).

## What's next

1. **Confirm Google sign-in actually works on a real iPhone now** — this
   is the top priority, see "Status right now" above. Not yet confirmed
   as of end of session; the fix and the Google Cloud Console origin were
   both just put in place and may need time to propagate.
2. More Figma mockups may arrive for screens that were only described
   verbally so far (feed, settings, create, join) — compare against what's
   built rather than assuming a clean slate.
3. App naming — still just "Complainathon" / mockup placeholder "Name",
   nothing decided.
4. New features beyond the group system — not discussed yet; ask before
   planning anything.

## Quick resume checklist

- `npm run dev` should just work (`.env` is already populated).
- After any change: `npx tsc --noEmit`, `npm run lint`, `npm run build` —
  all three are clean as of `dc5b948`; keep them that way.
- To ship a change to production: `npx vercel --prod --scope scrap5` (see
  "Deployment reality" — no git-push-to-deploy pipeline exists).
- If you change `prisma/schema.prisma`, run `npx prisma db push` against
  the real Supabase DB (uses `.env`'s `DATABASE_URL`/`DIRECT_URL`) before
  deploying code that depends on the new shape — this project has no
  migration history, `db push` is the whole workflow. Expect this to need
  the user to run it manually (see Gotcha #8).
- No GitHub remote is configured. If the user wants CI or GitHub-based
  deploys later, that's a separate step (`git remote add origin ...` +
  either `gh repo create` or a manually-created empty repo, then probably
  switch Vercel from CLI-deployed to Git-connected in the dashboard).
