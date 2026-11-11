# Security bug bash plan

Date drafted: 2026-11-10
Scope: web app (`src/`), mobile app (`apps/mobile/`), Supabase project `fztfmbnszhjohpgofzma`, CI.
Source: code + live-config security review (policies, grants, storage config, public auth settings, code read-through).

The goal is to **reproduce each finding first, fix it, then prove the fix** with the same repro. Nothing here has been applied yet.

## How to run the bash

**Setup (once)**

- Two test accounts in a non-production-critical state: `alice` (victim) and `mallory` (attacker). Sign in with Google on web or mobile.
- Grab each account's access token (web: `supabase.auth.getSession()` in the browser console; mobile: log it temporarily in dev only).
- Export for the shell:

```bash
export SB_URL="https://fztfmbnszhjohpgofzma.supabase.co"
export ANON="<publishable anon key>"          # from .env.local / Supabase dashboard
export MALLORY_JWT="<mallory access token>"
export ALICE_ID="<alice profiles.id>"
```

- Do destructive repros against test rows only (create a test meet owned by `mallory`).
- Any change to RLS/grants goes in a new file in `supabase/migrations/` (the Supabase MCP in `.cursor/mcp.json` is `read_only=true`, so migrations are applied by you via the dashboard/CLI).

**Per-item template:** Repro -> Expected today (bug) -> Fix -> Expected after fix -> Owner/status.

## Order of work and dependencies

1. Verify no client code relies on the things being locked down (items 1, 4). See "Rollout safety" below.
2. Ship **web + mobile code changes** that stop needing the data/privileges.
3. Apply **DB migration** (items 1, 4, 5, 6).
4. Apply **dashboard/config** changes (items 2, 3, 8) and **headers** (item 7).
5. Re-run every repro. Record results in the table at the bottom.

---

## Findings

### P1 - High

#### 1. Signed-in users can read every user's email
- **Where:** `public.profiles.email`, column `SELECT` granted to `authenticated`.
- **Repro:**
  ```bash
  curl "$SB_URL/rest/v1/profiles?select=id,email" \
    -H "apikey: $ANON" -H "Authorization: Bearer $MALLORY_JWT"
  ```
- **Expected today:** returns all users' emails. **Expected after fix:** `permission denied` (or the column is absent when selecting it explicitly).
- **Fix:**
  - Migration: `revoke select on public.profiles from authenticated;` then `grant select (id, fullname, username, headline, bio, link, profile_color) on public.profiles to authenticated;` (same column list as the existing anon grant in `20260930230000_hide_profile_email_from_anon.sql`; confirm whether `created_at` is needed).
  - Web: `src/app/profile/page.tsx:56` calls `fetchUserByUID(user.id, { includeEmail: true })` which does `select('*')`. Change it to the public column list and read the email from the session (`user.email`) instead. Simplify `src/hooks/fetchUserbyUID.ts` accordingly.
  - Web: `src/models/user.ts:76` (`saveProfile` uses `.select("*")` on the returned row) must switch to an explicit column list or it will fail after the revoke.
  - Mobile: confirm `apps/mobile/src/lib/profiles.ts` never uses `select('*')` on `profiles`.
- **Verify:** repro above fails; profile page, profile edit/save, public `/user/[id]` page, mobile profile + user screens all still load.
- **Rollback:** `grant select on public.profiles to authenticated;`

#### 2. `images` bucket has no server-side size or type limits
- **Where:** Supabase Storage bucket `images` (public, no `file_size_limit`, no `allowed_mime_types`).
- **Repro:** as `mallory`, upload a large non-image to her own folder:
  ```bash
  head -c 50000000 /dev/urandom > /tmp/big.bin
  curl -X POST "$SB_URL/storage/v1/object/images/meetImages/<mallory-uid>/test.bin" \
    -H "apikey: $ANON" -H "Authorization: Bearer $MALLORY_JWT" \
    -H "Content-Type: application/octet-stream" --data-binary @/tmp/big.bin
  ```
- **Expected today:** succeeds, file publicly downloadable. **After fix:** rejected (size/MIME).
- **Fix:** set bucket `file_size_limit` = 10 MiB and `allowed_mime_types` = `image/jpeg, image/png, image/webp, image/heic, image/gif` (Dashboard -> Storage -> `images` -> Edit, or SQL on `storage.buckets`). Keep the client 10 MB / 10-image checks (`apps/mobile/src/lib/meetWrite.ts`, web create/edit) as UX.
- **Verify:** repro rejected; normal photo upload from web and mobile still works (including iPhone HEIC from the picker).
- **Cleanup:** delete the test object afterward.

#### 3. Email/password signup is enabled but the app only uses Google
- **Where:** Supabase Auth settings (`/auth/v1/settings` shows `email: true`, signup open, autoconfirm off, leaked-password protection off).
- **Repro:**
  ```bash
  curl -X POST "$SB_URL/auth/v1/signup" -H "apikey: $ANON" -H "Content-Type: application/json" \
    -d '{"email":"bashtest+1@example.com","password":"password123"}'
  ```
- **Expected today:** account created (pending email confirmation). **After fix:** signup disabled error.
- **Fix:** disable the Email provider (Dashboard -> Authentication -> Providers) since no UI uses it. If you ever want it, first turn on leaked-password protection and a minimum password length.
- **Verify:** repro rejected; Google sign-in on web and mobile still works. Check no `signInWithPassword` / `signUp` calls exist: `rg "signInWithPassword|signUp\(" src apps/mobile/src`.
- **Why it matters:** it is what makes items 1 and 2 reachable by anonymous strangers.

### P2 - Medium

#### 4. Users can update any column of their own profile (including `email`)
- **Where:** `public.profiles` `UPDATE` privilege on all columns for `authenticated`.
- **Repro:**
  ```bash
  curl -X PATCH "$SB_URL/rest/v1/profiles?id=eq.<mallory-uid>" \
    -H "apikey: $ANON" -H "Authorization: Bearer $MALLORY_JWT" \
    -H "Content-Type: application/json" -d '{"email":"alice@example.com"}'
  ```
- **Expected today:** succeeds; alice's real signup later fails on the unique `email` constraint in `handle_new_user`. **After fix:** `permission denied`.
- **Fix:** `revoke update on public.profiles from authenticated;` then `grant update (fullname, username, headline, bio, link, profile_color) on public.profiles to authenticated;`. Verify the exact column list against the profile edit form (web and mobile) and the case-insensitive username migration (`20261012235500_...`).
- **Verify:** repro rejected; editing every profile field on web and mobile still saves.
- **Also test:** update another user's row (`id=eq.<alice-id>`) returns 0 rows (RLS) - regression check.

#### 5. No server-side validation on `meets`
- **Where:** `public.meets` constraints; rules like title max 25 and California-only live only in `packages/shared/src/meetForm.ts`.
- **Repros (as mallory, on her own meet):**
  - Insert a title of 5000 characters.
  - `images` containing `https://evil.example/tracker.png` or 500 entries.
  - `links` containing `javascript:alert(1)`.
  - `endTime` before `startTime`; date far in the past/future.
  - Large `body`.
- **Expected today:** all accepted. **After fix:** rejected by the database.
- **Fix (migration):**
  - `CHECK (char_length(title) between 1 and 25)`, sane `body` max length (match the form), `cardinality(images) <= 10`.
  - A `BEFORE INSERT OR UPDATE` trigger (or CHECK) that requires each `images` entry to start with `$SB_URL/storage/v1/object/public/images/meetImages/<organizerId>/`.
  - `links` entries must match `^https?://`.
  - `endTime >= startTime` when both set.
  - Do **not** enforce California in SQL unless you decide it is a product rule, not just a form rule (decision needed).
- **Verify:** each repro rejected; create/edit on web and mobile still work, including existing meets (run `select` for rows that would violate the new constraints **before** adding them; add as `NOT VALID` first if legacy data fails).

#### 6. `handle_new_user()` is executable through the API
- **Where:** Supabase security advisor ("SECURITY DEFINER function executable by anon/authenticated").
- **Repro:** `curl -X POST "$SB_URL/rest/v1/rpc/handle_new_user" -H "apikey: $ANON" -H "Content-Type: application/json" -d '{}'` (expect an error either way - it is a trigger function - but the privilege should not exist).
- **Fix:** `revoke execute on function public.handle_new_user() from public, anon, authenticated;` (the auth trigger runs as the function owner and is unaffected).
- **Verify:** re-run Supabase advisors (`get_advisors`) - warning gone; sign up a **new** Google account and confirm the profile row is still created. (Test this: it is the one thing this revoke could break.)

#### 7. Missing Content-Security-Policy and HSTS
- **Where:** `src/proxy.ts` sets only some security headers.
- **Repro:** `curl -sI https://<prod-domain>/ | rg -i "content-security-policy|strict-transport"`.
- **Fix:**
  - Check what Vercel already sends (HSTS is often added by the platform).
  - Add a CSP in report-only mode first. Must allow: self, Supabase URL (`connect-src`, `img-src` for storage), the map tile/style host(s) and workers (`worker-src blob:`, `img-src data: blob:`), Photon geocoder, Formspree (if used on web), HeroUI/Next inline styles/scripts (nonce or `unsafe-inline` for styles initially).
  - Promote to enforcing once the report-only run is clean across `/map`, `/meets`, `/create`, `/profile`, meet detail.
- **Verify:** browser console shows no CSP violations on every route; map still renders; image upload and preview work.

#### 8. Postgres version has security patches available
- **Where:** Supabase advisor.
- **Fix:** schedule the upgrade in the Supabase dashboard (brief downtime). Take a backup first.
- **Verify:** advisor warning cleared; smoke test sign in, list meets, create meet, upload image.

### P3 - Low / hardening

#### 9. `links` / profile `link` rendering
- Nothing renders them as clickable today. Add a shared `isSafeHttpUrl()` in `packages/shared` (+ unit test) and use it at **every** place a link is rendered or opened (web and mobile), so a stored `javascript:` or `data:` URL is never an `href`.
- **Test:** store a `javascript:` link through the API (after item 5 this should be blocked at the DB too) and confirm neither client makes it clickable. Add the unit test cases `javascript:`, `data:`, `HTTP://`, no scheme, whitespace.

#### 10. Console logging of data
- Remove `console.log("Profile data edited:", data[0])` (`src/models/user.ts:86`; includes the profile row). Review `src/models/meet.ts:173,213` and `src/app/create/page.tsx`, `src/app/meet/[id]/page.tsx` logs of form data; strip or gate behind `NODE_ENV !== 'production'`.
- **Verify:** `rg "console\.log" src` shows only intentional dev-only logs.

#### 11. Sign in with Apple nonce (before enabling `EXPO_PUBLIC_ENABLE_APPLE_SIGN_IN`)
- `apps/mobile/src/auth/AuthProvider.tsx` calls `signInWithIdToken` without a nonce. Generate a raw nonce, pass its SHA-256 to Apple and the raw nonce to Supabase.
- **Test:** can only be verified once the Apple services ID / provider exist. Track, do not block the bash.

#### 12. Mobile OAuth redirect hygiene
- Confirm `blip://auth-callback` is the only custom-scheme redirect in Supabase's allow-list and that no wildcard redirect entries exist (Dashboard -> Authentication -> URL configuration). PKCE (S256) is working, which covers custom-scheme interception.
- **Test:** attempt sign-in with a tampered `state`/missing code and confirm the app shows an error and stays signed out. Consider universal links later.

#### 13. CI hardening (`.github/workflows/ci.yml`)
- Add `npm audit --omit=dev --audit-level=high` as a non-blocking step first.
- Add mobile checks (`apps/mobile`: typecheck + `chunkedStorage` tests) and `packages/shared` tests if not already covered by `npm test`.
- Pin `actions/checkout` and `actions/setup-node` to commit SHAs (keep the tag as a comment); add Dependabot for `github-actions`.
- **Verify:** a PR run is green; a deliberately-added vulnerable dev dependency shows up in the audit step.

#### 14. Remaining dependency alerts
- `maplibre-gl` (critical advisory, not reachable in this app's usage) - confirm by re-reading the advisory against our usage, then dismiss in Dependabot with a reason or upgrade if a non-breaking fix exists.
- `zod` (high, Expo dev tooling only) - fixed by an Expo SDK bump; track.
- `esbuild` (low, dev server) - track.
- **Verify:** `npm audit` and `cd apps/mobile && npm audit` results recorded in `docs/VULNERABILITIES.md`.

---

## Regression checks (run after every fix)

- Logged-out: `/`, `/map`, `/meets`, a meet detail page, a `/user/[id]` page load; `/create` and `/profile` redirect to login; `/sandbox` is blocked in production.
- Anon API: `profiles?select=email` fails; `meets` read still works; cannot insert/update/delete meets.
- Signed in (Google): sign in/out on web and mobile; create meet with 1-10 photos; edit meet and reorder/remove photos; delete meet (storage objects removed); RSVP; edit profile; report an issue.
- Cross-user: `mallory` cannot edit/delete `alice`'s meets, profile, or storage objects (expect 0 rows / 403).
- `/auth/callback?next=https://evil.example` and `next=//evil.example` still redirect to a same-site path.

## Rollout safety

- **Item 1 and 4 are breaking if clients still use `select('*')` on `profiles`.** Deploy the web change first (and push a mobile build or confirm mobile already uses explicit columns), then apply the migration.
- Write each migration with a commented rollback, like `20260930230000_hide_profile_email_from_anon.sql`.
- Add `NOT VALID` constraints first for item 5 if existing meets would fail them, then clean up data and `VALIDATE`.
- Apply and test on a Supabase branch/preview if available (`list_branches`); otherwise apply in production off-peak with the rollback ready.

## Out of scope / decisions needed

- Whether California-only is a product rule enforced by the DB (item 5).
- Whether any email-based login is wanted in the future (item 3).
- Rate limiting beyond Supabase's built-in auth limits (e.g. an upload/meet-creation quota per user) - not planned; revisit if abuse appears.
- Pen-testing Vercel/Supabase platform configuration beyond what is visible from the repo and public endpoints.

## Run log - 2026-11-11

The Supabase project was paused for inactivity at the start of the run (host returned NXDOMAIN) and was restored before any live checks. Free-tier projects pause after about a week without activity, which takes the live site down too; consider a keep-alive or a paid plan if the app needs to stay up.

Live checks used only read-only SQL, the advisors and unauthenticated requests. No accounts were created and no test data was written. Authenticated repros (Mallory/Alice JWTs) are still to be run, and the migrations are **written but not applied**.

| # | Live finding | Status |
|---|--------------|--------|
| 1 | Confirmed by privilege check: `authenticated` can `SELECT` `profiles.email`. `anon` is correctly blocked (`permission denied`). | Code + migration `20261111000100` written, not applied |
| 2 | Confirmed: bucket `images` is public with `file_size_limit` and `allowed_mime_types` both null. Existing objects are all image types, max ~1.2 MB, so limits are safe. | Migration `20261111000300` written, not applied |
| 3 | Confirmed: `external.email = true`, `disable_signup = false`, autoconfirm off. Signup was not attempted. | Dashboard change, **you need to do this** |
| 4 | Confirmed and wider than reported: `authenticated` can `UPDATE` every `profiles` column (`id`, `email`, `created_at` included) and `anon` holds `UPDATE` on every column too (RLS blocks it from changing rows). | Migration `20261111000100` written, not applied |
| 5 | Confirmed: no constraints or triggers on `meets` besides the PK and FK. 4 existing meets have titles over 25 chars (ids 44, 66, 39, 41), so constraints are `NOT VALID`. One image URL (meet 39) has a double slash but is in our own bucket. | Migration `20261111000200` written, not applied |
| 6 | Advisor confirms `anon`/`authenticated` hold `EXECUTE`. `POST /rest/v1/rpc/handle_new_user` returns `PGRST202` (not exposed as an RPC), so the practical risk is lower than the advisor suggests. | Migration `20261111000300` written, not applied |
| 7 | Confirmed: `src/proxy.ts` set no CSP or HSTS. | Report-only CSP + HSTS added in `src/proxy.ts`; needs a console check on every route before enforcing |
| 8 | Advisor confirms `supabase-postgres-15.8.1.131` has security patches available. | Dashboard upgrade, **you need to do this** |
| 9 | No code renders `links` or profile `link` as a clickable URL today. | `isSafeHttpUrl()` added to `@blip/shared` with tests, for use when that changes |
| 10 | Removed the profile-row `console.log` in `saveProfile`. Meet-form logs in `src/models/meet.ts`, create and edit pages remain (meet data is public). | Done (profile log) |
| 11 | Apple sign-in is flagged off; needs Apple setup before it can be tested. | Not started |
| 12 | Redirect allow-list is a dashboard setting. | Needs your check |
| 13 | CI: pinned `actions/checkout` and `actions/setup-node` to commit SHAs, added a non-blocking production `npm audit`, added a `mobile` job (typecheck + tests, both pass locally). The mobile job's `npm ci` on GitHub is untested until the PR runs. | Done, unverified on CI |
| 14 | Not re-checked this run. | Open |

Decisions made while implementing, so you can overrule them:
- Item 5 skips two planned checks: `endTime >= startTime` (overnight meets) and `http(s)` on `links` (free text, never rendered as a link). Body max is 5000 chars (current max is 117).
- Item 13 does not add a `dependabot.yml`, because that would start opening version-update PRs; say so if you want it.

Local checks after the code changes: web `npm test` (all pass), `npm run typecheck`, `npm run lint` (0 errors, the 3 known warnings); mobile typecheck and tests pass. The three migrations have not been run anywhere, including a syntax check.

## Results tracker

| # | Item | Severity | Repro confirmed | Fixed | Fix verified | PR / migration |
|---|------|----------|-----------------|-------|--------------|----------------|
| 1 | Emails readable by signed-in users | High | Yes (privilege check) | Written | | `20261111000100` + web changes |
| 2 | Bucket size/type limits | High | Yes (config) | Written | | `20261111000300` |
| 3 | Email signup enabled | High | Yes (settings) | | | Dashboard |
| 4 | Profile column UPDATE too broad | Medium | Yes (privilege check) | Written | | `20261111000100` |
| 5 | `meets` server-side validation | Medium | Yes (no constraints) | Written | | `20261111000200` |
| 6 | `handle_new_user` executable | Medium | Yes (advisor) | Written | | `20261111000300` |
| 7 | CSP / HSTS | Medium | Yes (code) | Report-only | | `src/proxy.ts` |
| 8 | Postgres patch upgrade | Medium | Yes (advisor) | | | Dashboard |
| 9 | Safe link rendering | Low | n/a | Helper added | | `safeUrl.ts` |
| 10 | Console logging | Low | Yes | Partly | | `src/models/user.ts` |
| 11 | Apple sign-in nonce | Low | | | | |
| 12 | Mobile OAuth redirect hygiene | Low | | | | |
| 13 | CI hardening | Low | Yes | Done | Pending CI run | `ci.yml` |
| 14 | Remaining dependency alerts | Low | | | | |
