# Complainathon — session handoff

Read this first if you're picking this project up in a new session. It's a
context dump, not documentation — see `README.md` for the actual
architecture/setup/deploy docs (that file is accurate for local dev, but see
"Deployment reality" below for how production actually gets updated now).

## Status right now

**Live in production, running the v3 group-scoped redesign:**
https://complainathon.vercel.app — committed (`94b3de1`) and deployed via
`npx vercel --prod --scope scrap5` (see the `--scope` note under
"Deployment reality" below, plain `--prod` failed with "Not authorized").

Git repo, Vercel deploy, the v2 username feature, and the v3 group redesign
all happened across sessions, in this order:

1. `git init` + first commit (`9600167`).
2. Deployed to a **brand-new** Vercel account (email
   `yahyamdaud21@gmail.com`, CLI login via device-code flow) using the
   **Vercel CLI directly**, not GitHub integration — see "Deployment
   reality" below, this matters.
3. Hit and fixed a production-only 500 on every API route (`4f734dd`) —
   see Gotcha #5, it's the most important one in this file.
4. Shipped v2: usernames, required on first sign-in (`2cff9f3`). User
   tested the full flow locally in browser and confirmed it works
   ("Ok perfect") before it was committed and deployed.
5. Shipped v3 (this session, **not yet committed or deployed**): full pivot
   to group-scoped feeds. See "v3: group-scoped redesign" below.

## v3: group-scoped redesign (this session, not yet committed/deployed)

Product pivot, described by the user as "Twitter x Locket": instead of one
public feed, users join/create up to 5 groups via invite code, and each
group has its own private feed (the same compose/edit/delete UX as before,
just scoped). Driven by Figma mockups (dark theme, centered, outlined
"ghost" buttons) the user sent inline as images, not a Figma link/file.

**Confirmed product decisions:**
- Join is invite-code only, no approval step.
- Group creator is OWNER (can remove members, delete group, regenerate
  invite code); everyone else is a plain MEMBER.
- 5-group cap is **combined** (owned + joined together), not per-category.
- Members can leave anytime. **Owners cannot leave — must delete the group
  instead** (my default, not explicitly asked; flagged during planning,
  no objection raised).
- Posts stay editable/deletable by their author, same as v2, just scoped
  to the group now.
- Avatars removed **everywhere** (compose box, post cards, header) — the
  user's mockups are text-only. `Avatar.tsx` was deleted,
  `Complaint.authorPhoto` dropped from the schema.
- Existing production complaints were **wiped** (confirmed explicitly) —
  there was no group to attach old posts to, and no migration path was
  wanted. `Complaint` table was truncated before the schema push.
- Theme stays system light/dark, same as before — the mockups' dark navy
  is close enough to the existing dark-mode CSS tokens in `globals.css`
  that no new palette was needed, just new component styling (outlined
  buttons instead of solid-fill, for the new screens).
- App name is still unresolved — mockups showed a literal "Name"
  placeholder; branding/copy still says "Complainathon" everywhere in code
  for now.

**Schema (`prisma/schema.prisma`):** added `Group` (id, name,
`inviteCode` unique, `createdAt`) and `GroupMember` (join table:
`groupId`, `userId`, `role: OWNER | MEMBER`, unique on
`[groupId, userId]`). `Complaint` gained a required `groupId` (cascades on
group delete) and lost `authorPhoto`.

**New API routes**, all under `src/app/api/groups/`: `POST /` (create,
enforces the 5-group cap), `GET /` (list caller's groups), `POST /join`
(by invite code), `GET /[id]` (detail + role; includes `inviteCode` only
for the OWNER), `GET /[id]/members`, `DELETE /[id]` (OWNER-only),
`POST /[id]/leave` (400s for OWNER), `DELETE /[id]/members/[userId]`
(OWNER-only, can't target self), `POST /[id]/regenerate-code`
(OWNER-only), `GET|POST /[id]/complaints` (replaces the old flat
`/api/complaints`, which was deleted — complaints are no longer public,
every read now requires group membership). Membership/ownership checks
are centralized in `src/lib/groups.ts` (`requireMembership`,
`requireOwner`).

**New pages** (all client components now — see below for why): `/`
(login), `/groups` (picker — grid of group buttons + Join/Create, capped
at 5), `/groups/create`, `/groups/join`, `/groups/[id]` (feed, header
component `GroupHeader.tsx`: group name + username top-left, settings
gear top-right), `/groups/[id]/settings` (`GroupSettings.tsx`: invite
code + regenerate for OWNER, member list with remove for OWNER,
delete-group for OWNER or leave-group for everyone else).

**Architecture note — pages went client-only:** the old root `page.tsx`
did a server-side Prisma query because the feed was public. Now that
every feed requires group membership, and auth is Bearer-token-only (no
session cookie — see the Firebase Auth note below), server components
can't verify who's asking. So `/groups` and `/groups/[id]` fetch
client-side on mount instead of via SSR, same pattern `ComposeBox`/
`SignInButton` already used for the loading-auth-state case. Minor UX
cost (a spinner before first paint) traded for not needing to invent a
session-cookie auth path.

**Known deviation from the mockups:** the picker's group-tile grid is
implemented as a simple centered flex-wrap (not pixel-identical to the
mockups' bespoke 2/1/2 arrangement at exactly 5 groups vs. a plain row of
3 at exactly 3 groups) — flagged during planning, no objection raised,
but worth eyeballing against the real mockups if it looks off.

**Auto-mode classifier blocked two actions** that had to be handed to the
user to run manually: writing `.claude/settings.local.json` (permission
config is treated as a security boundary the agent can't self-modify) and
`npx prisma db push` (a live production schema change). Both are things
to expect again if this pattern repeats — plan to hand off schema
migrations and permission-file edits rather than assuming they'll run
automatically.

**Migration steps actually run** (against the real Supabase DB): 
```bash
echo 'TRUNCATE TABLE "Complaint";' | npx prisma db execute --stdin --schema prisma/schema.prisma
npx prisma db push   # run by the user, not the agent — see note above
```
Verified post-push via a one-off Node script querying
`prisma.group.count()` / `prisma.groupMember.count()` /
`prisma.complaint.count()` — all reachable, complaints at 0.

**Done:** committed (`94b3de1`) and deployed to production
(`npx vercel --prod --scope scrap5`) — see "Deployment reality" above for
the `--scope` gotcha hit along the way.

## Deployment reality — read before touching prod

This project is **not connected to GitHub for auto-deploy**. It was
deployed straight from the local filesystem via `npx vercel --prod`.
Pushing commits to git (there's no remote configured yet anyway) does
**nothing** to the live site. To ship a change:

```bash
npx vercel --prod --scope scrap5
```

**Bare `npx vercel --prod` (no `--scope`) failed with `"Not authorized"`**
during the v3 deploy, even though `npx vercel whoami` showed a valid
logged-in session and `.vercel/project.json` was present and correct.
Adding `--scope scrap5` fixed it immediately. Cause unconfirmed (CLI
default-scope resolution behaving differently across sessions/versions?)
— just always pass `--scope scrap5` explicitly rather than debugging it
again.

Vercel project: `scrap5/complainathon` (scope `scrap5`, the account's
default team). Vercel CLI is not installed globally — everything runs via
`npx vercel ...` and downloads on first use each session if the npx cache
is cold.

All 9 env vars from `.env` are already set in Vercel across
Production/Preview/Development (`npx vercel env ls` to check). If you add
a new env var to `.env`, you must also `npx vercel env add NAME
<environment>` (one environment per invocation — the CLI rejects multiple
environments in one call) for each of production/preview/development
before it'll be available at build/runtime. `NEXT_PUBLIC_*` vars that
look like credentials need `--type config` explicitly or the CLI blocks
the add asking you to choose public/private.

**Outstanding, unconfirmed:** the user was told to add
`complainathon.vercel.app` to Firebase Console → Authentication →
Settings → Authorized domains (required or Google sign-in fails with
`auth/unauthorized-domain` on the live site). This was **not explicitly
confirmed done** — check with the user or just check the Firebase console
directly before assuming Google sign-in works on the live URL.

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
- **Usernames (v2, new this session):** a `User` table
  (`prisma/schema.prisma`) maps Firebase `uid` → a unique username.
  Required on first sign-in via a blocking modal
  (`src/components/UsernameModal.tsx`, orchestrated from
  `AuthProvider.tsx`) — the user explicitly chose "required on first
  sign-in" over "optional/anytime" when asked. Usernames are **frozen
  onto each `Complaint.authorName` at post time** — the user explicitly
  chose this over "always show current username," so renaming later does
  NOT rewrite old posts' displayed name. Changeable anytime after via the
  pencil icon next to the name in `SignInButton.tsx`. `POST
  /api/complaints` now 409s with "Set a username before posting" if
  somehow called before a `User` row exists (belt-and-suspenders; the
  frontend modal should always prevent this state).
- **Design system**: originally chosen via the `ui-ux-pro-max` skill →
  Minimalism pattern, Inter font, neutral slate palette + blue primary
  (`#2563EB`). As of the v3 group redesign this session, new screens use
  an outlined "ghost button" style (border, transparent/dark fill) instead
  of solid-primary-fill, matching the Figma mockups — see "v3: group-scoped
  redesign" above for full detail.

## `.env` is already populated and working

Supabase (`DATABASE_URL`, `DIRECT_URL`) and Firebase
(`NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_SERVICE_ACCOUNT_BASE64`) for the live
"complainathon" projects on both services, both free tier. The same
values are mirrored into Vercel's env vars (see "Deployment reality").
Don't need to redo any account setup in `README.md` unless something
breaks.

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
   CJS `require` export condition — `jose`'s `package.json` has
   `"type": "module"` and no `require` key). Next.js auto-externalizes
   `firebase-admin` (it's on the built-in `serverExternalPackages` list),
   so in Vercel's actual serverless runtime, loading `firebase-admin/auth`
   does a raw Node `require()` that transitively hits `require('jose')`
   and throws. This broke **every** route that imports
   `src/lib/auth-server.ts` — including plain `GET /api/complaints`,
   which never calls the auth check, because the static `import` at the
   top of the file still loads the whole module graph. It didn't show up
   in `next dev` because dev's module loader handles the interop
   differently. Fixed by adding to `package.json`:
   ```json
   "overrides": { "jose": "5.10.0" }
   ```
   `jose@5.10.0` is the last version with a real CJS build
   (`dist/node/cjs/index.js`). The narrow API surface `jwks-rsa` actually
   uses (`importJWK`, `exportSPKI`) is unchanged between v5 and v6, so
   this is safe. **If you ever see a 500 on every API route in
   production only, with builds/typecheck/dev all green, check this
   override didn't get removed or that a `firebase-admin`/`jwks-rsa`
   bump didn't reintroduce the same problem with a different transitive
   package.**
6. The message `Detected .env file, it is strongly recommended to use
   Vercel's env handling instead` in Vercel build logs is **not** your
   local `.env` leaking — `.gitignore`/CLI upload rules exclude it.
   Vercel's own build container materializes a `.env` from the dashboard
   env vars for framework-detection purposes; this is expected and not a
   secret exposure.

## What's next (where this session stopped)

1. **More mockups may be coming.** The user sent login + group-picker
   screens (1 through 5 groups) inline as images and described the feed/
   settings screens verbally ("assume a similar design" to what's already
   built) rather than mocking every screen. If more images show up, compare
   against what's built (`GroupHeader.tsx`, `GroupSettings.tsx`,
   `CreateGroupForm.tsx`, `JoinGroupForm.tsx`) rather than assuming a clean
   slate.
2. **App naming** — mockups showed a placeholder "Name" title; nothing
   decided yet. Code still says "Complainathon" throughout.
3. Confirmed this session (no longer open): `complainathon.vercel.app` **is**
   in Firebase's authorized domains list.

## Quick resume checklist

- `npm run dev` should just work (`.env` is already populated).
- After any change: `npx tsc --noEmit`, `npm run lint`, `npm run build` —
  all three were clean as of the end of this session (v3, uncommitted);
  keep them that way.
- To ship a change to production: `npx vercel --prod` (see "Deployment
  reality" — there is no git-push-to-deploy pipeline set up).
- If you change `prisma/schema.prisma`, run `npx prisma db push` against
  the real Supabase DB (uses `.env`'s `DATABASE_URL`/`DIRECT_URL`) before
  deploying code that depends on the new shape — this project has no
  migration history, `db push` is the whole workflow. Expect this to need
  a human in the loop rather than running automatically — see the
  auto-mode classifier note under "v3: group-scoped redesign" above.
- No GitHub remote is configured. If the user wants CI or GitHub-based
  deploys later, that's a separate step (`git remote add origin ...` +
  either `gh repo create` or a manually-created empty repo, then probably
  switch Vercel from CLI-deployed to Git-connected in the dashboard).
