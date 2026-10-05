# Blip — Big-Picture Audit

**Date:** 2026-09-23  
**Updated:** 2026-10-04 (MapLibre swap, guest access, profile email exposure, middleware location — all deployed to production; item 3 CI + tests added)  
**Repo:** `/Users/nndpznn/Desktop/CMSI/personal/blip`  
**Constraint (original):** Report only — no application code changes. Secret values are not printed.

---

## Snapshot

Blip is a California-focused car/coffee meet discovery app (map + list, RSVP, create/edit, profiles). Stack: **Next.js 16.1.6** App Router, **React 19**, TypeScript, **Supabase** (auth + Postgres + storage), MapLibre GL (OpenFreeMap tiles) + Photon search, HeroUI, Tailwind 4. Hosted on Vercel.

**Auth boundary (current):** Cookie-backed `@supabase/ssr` clients, [`src/middleware.ts`](../src/middleware.ts) (session refresh, `/create` + `/profile` + `/user` gates, prod `/sandbox` block, security headers), and `/auth/callback` for OAuth. Logged-out visitors can browse the map, meet list and meet details; attending, creating and profile pages prompt sign-in (deployed and stable as of 2026-10-04). **Correction (2026-09-30):** the middleware previously sat at the repo root while the app uses `src/`, so Next never ran it and the `/create` / `/profile` gates and security headers were not active; it now lives in `src/` and the redirects and headers are verified. Client screens still talk to Supabase with the anon key; **RLS on the Supabase project is the data-authorization boundary**. Product maturity is pre-1.0 (`package.json` version `0.5.0`).

---

## Ranked action items

Priority order used: **security → reliability → efficiency → organization**.

### 1. Unverified Supabase RLS + unused service-role key (Security — P0) — DONE

**Status (2026-09-23):** Addressed for production trust. Operator confirmed RLS policies for `meets`, `profiles`, `meet_attendees`, and the `images` bucket match the targets below. `SUPABASE_SERVICE_ROLE_KEY` removed from local `.env` (only `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` remain). Key was never used in app code.

**Original concern:** All reads/writes went through the browser anon client with RLS only mentioned in comments and no policies in-repo. A service-role key in frontend `.env` was a leak/mis-deploy risk.

**Targets that were verified in the Supabase dashboard:**
- Authenticated `INSERT` on meets only with `organizerId = auth.uid()`
- `UPDATE`/`DELETE` only when `organizerId = auth.uid()`
- Profile `UPDATE` only on `id = auth.uid()`
- Attendees insert/delete only for `profile_id = auth.uid()`
- Storage writes/deletes scoped to `meetImages/{auth.uid()}/…`

**Correction (2026-10-05):** exporting the live policies showed the storage rule above was **not** true for writes. Permissive policies are OR'd, and these were present: `allow anyone to upload` (INSERT `with check (true)` — anyone, even logged out, could upload any file to any bucket/path), `allow anyone to read` (SELECT `true`, lists every object), four leftover dashboard-template policies giving `anon` select/insert/update/delete on `images/public/*.jpg`, and `Users can upload any meet images` (any signed-in user could write anywhere). Fix: migration `20261005001000_scope_storage_policies.sql` drops those and adds `Users can upload own meet images` (bucket `images`, path `meetImages/<own uid>/…`). The table-policy targets for `meets`, `profiles` and `meet_attendees` were confirmed correct. Migration `20261005001100_revoke_unneeded_table_privileges.sql` also removes `TRUNCATE`/`TRIGGER`/`REFERENCES` from `anon`/`authenticated` (RLS does not cover TRUNCATE; the REST API cannot issue it, so defense in depth). **Both migrations applied and verified 2026-10-05** with the anon key: listing `images/meetImages` returns nothing, uploads to `images/` and `images/public/*.jpg` are rejected (403, RLS), public image URLs still serve (200), and an anonymous `PATCH` on another user's meet changes nothing. Signed-in flow confirmed in the UI: photos upload via meets and are removed from storage when the meet is deleted.

**Residual (non-blocking):** A reference snapshot of the live policies, constraints and grants is in `supabase/snapshots/2026-10-05-live-schema-reference.sql` (not a runnable migration; column defaults, `auth.users` triggers and other functions are not captured). Re-export with `supabase db pull` where Docker is available if a true baseline is needed. Re-run a short smoke checklist after any future policy change: anon JWT absent cannot write; user A cannot edit/delete user B’s meet; user A cannot update user B’s profile.

---

### 2. Auth is UI-only: no middleware; create/delete not hardened (Security / Reliability) — DONE

**Status (2026-09-23):** Fulfilled in application code.

| Requirement | Where |
|-------------|--------|
| Cookie sessions + middleware redirects for `/create`, `/profile`, `/user` → `/loginrequired?next=…` (effective only since the 2026-09-30 move to `src/`) | [`src/middleware.ts`](../src/middleware.ts), [`src/clients/supabase/`](../src/clients/supabase/) |
| `saveToDatabase` / `saveEditDatabase`: `getUser()`, force `organizerId` | [`src/models/meet.ts`](../src/models/meet.ts) |
| Delete: require user + assert organizer before storage/row delete | [`src/app/meet/[id]/page.tsx`](../src/app/meet/[id]/page.tsx) |
| Profile save: `getUser()`, `.eq('id', user.id)` | [`src/models/user.ts`](../src/models/user.ts) |
| Auth consolidation (`AuthProvider` + drop duplicate hook) | [`src/clients/authContext.tsx`](../src/clients/authContext.tsx); `useSupabaseUser` removed |

UI organizer gates remain for UX only; RLS (item 1) + write-path identity are the real controls.

---

### 3. No CI, no tests, lockfile gitignored (Reliability) — DONE

**Status (2026-10-04):** `package-lock.json` is tracked (no longer gitignored). [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs `npm ci`, `lint`, `typecheck`, `test` and `build` on every PR and on pushes to `main`/`dev`. Lint is clean of errors (the three blocking `set-state-in-effect` / `require()` errors were fixed; two config-file warnings remain). The broken `migrate:meet-images` script was removed. Tests use Node's built-in runner via `tsx` (`npm test`) and cover the image-limit helpers (extracted to `src/util/meetImageLimits.ts`), `safeNextPath`, and Photon search mapping/filtering/dedupe/retry. Writing them exposed and fixed a bug where `fetchPhoton` retried non-retryable 4xx errors. The `verify` check is now a required status check on `main` via the active ruleset "merge blocked by failed CI on main" (also blocks force pushes and branch deletion), so red CI blocks merges (verified 2026-10-05).

**Original concern (kept for history):**

`.gitignore` ignores `package-lock.json`, so installs on Vercel/CI are non-reproducible. There is no `.github/workflows`, no `*.test.*` / `*.spec.*`, and `npm run migrate:meet-images` points at a missing `scripts/migrate-meet-images.ts`. Past dependency/Vercel breakage is a predictable outcome of this setup. Regressions in RSVP, image limits, and auth gates have no automated net.

**Action item:** Stop ignoring `package-lock.json` and commit the current lockfile. Add a minimal GitHub Actions workflow on PRs: `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Fix or delete the broken migrate script so `package.json` scripts match the tree. Seed a small test suite where logic is already pure or easy to extract: `filesWithinMeetImageLimit` / `isMeetImageOverLimit`, California/location helpers once centralized, and meet date/time parsing. Block merges on red CI. This is the cheapest reliability lever after RLS.

**Alternatives:** If GitHub Actions is deferred, at least version the lockfile and run `next build` in Vercel with frozen installs. Skip e2e until unit/build gates exist.

---

### 4. Unbounded meet loads on map and list (Efficiency / Reliability) — DONE (pending migration)

**Status (2026-10-04):** Implemented, with one deploy step outstanding.
- **Map:** loads only upcoming meets (`date >= today`) and only the columns pins/popups use (`src/api/meets.ts`). No row cap handling by design: upcoming density is expected to stay far below Supabase's 1,000-row default.
- **List (`/seeAllMeets`):** infinite scroll in pages of 20, server-side date filter and ordering, "Show past meets" toggle. Sorts reduced to "Most recent" (posted date) and "Upcoming first" (soonest first, then past meets newest-first when the toggle is on). Paging plan is pure and unit tested (`src/util/meetPaging.ts`).
- **Attendee counts:** new SQL function `meet_attendee_summary` replaces downloading every `meet_attendees` row (used by the list and user pages). Migration: `supabase/migrations/20261004235000_meet_attendee_summary.sql`.
- **Behavior note:** "upcoming" is decided by date only, so a meet earlier today still counts as upcoming until midnight.
- **Deploy order:** apply the migration BEFORE deploying (it only adds a function). Until it exists, counts show 0 and "attending" is false on lists.
- **Not done:** viewport (bbox) map queries and lng/lat columns, intentionally deferred. User-page meet list is still unpaged (bounded to one organizer).

**Original concern (kept for history):**

The map does `supabase.from('meets').select('*')` with no filter (`src/app/map/page.tsx`). Browse does an ordered full-table `select()` (`src/app/seeAllMeets/page.tsx`). As the community grows, this becomes slow loads, large client memory, heavy GeoJSON, and possible mobile failure—before any feature work.

**Action item:** Paginate the list view (`range` + infinite scroll or “load more”), defaulting to upcoming meets by date. For the map, query by viewport bbox and an upcoming date window (store lng/lat columns or use PostGIS/`location` JSON operators). Stop selecting `*` for cards/markers—pull only fields needed for pins and card chrome; fetch full bodies on the detail route. Cap `.in('meet_id', …)` attendee batches (e.g. chunks of 100). Re-check MapLibre layer update effects so full rebinds are not paid on every meets array identity change.

**Alternatives:** A materialized “upcoming_meets” view or edge-cached public feed for anonymous browse. Overkill until pagination/bbox exist.

---

### 5. Fragmented auth/loading and false “not found” UX (Reliability) — PARTIAL

**Done since (2026-09-30):** `fetchUserByUID` now returns `null` on error (no more Postgrest error object treated as a profile); the meet detail page falls back to an “Unknown author” organizer so a missing profile no longer renders as “not found”; the expected “Auth session missing” result for guests is no longer logged as an error.

**Done with item 2:** Single auth source via `AuthProvider` (`getUser` + `onAuthStateChange`); `useSupabaseUser` removed; `useSupabaseUserMetadata` wraps `useAuth`; create no longer uses `user!` (middleware + guard).

**Still open:** Meet detail still has no explicit `loading` / `error` / `ready` split. RSVP toggles have no in-flight lock. ~~Username uniqueness is a client TOCTOU check~~ — the database already enforces it (`profiles_username_key` UNIQUE, verified 2026-10-05, no existing duplicates); the profile page now also handles the constraint error (23505) instead of silently closing the editor. The constraint is case-sensitive (`Nolan` ≠ `nolan`); a `lower(username)` unique index would close that if wanted. Duplicate RSVPs are likewise impossible already (`meet_attendees` primary key is `(profile_id, meet_id)`).

**Action item (remaining):** Split meet detail into `loading` / `error` / `ready`. Disable RSVP while a request is in flight.

---

## Honorable mentions

| Issue | Why it matters less *right now* |
|--------|----------------------------------|
| ~~Public Mapbox token in Search Box query strings~~ | **Resolved (2026-09-30):** Mapbox removed in favor of MapLibre + OpenFreeMap + Photon (no token). Old token rotated/revoked (2026-10-04). Photon's public endpoint has no SLA; consider a self-hosted/paid geocoder if search volume grows. |
| `/sandbox` routes | **Mitigated:** middleware returns 404 for `/sandbox*` when `NODE_ENV === 'production'`. |
| Dead code | **Culled (2026-09-23):** removed unused ThemeProvider, logoutButton, fetchUserByUsername, addEventMarkers, GoogleOAuthProvider/`@react-oauth/google`, and accidental `"npm"` dependency. |
| `encodeToGoogleMaps` puts coordinates in `query_place_id` | Broken/weak Maps deep links (`src/util/encodeToGoogleMaps.ts`) — quick fix after remaining P-items. |
| Client-only California substring check | Bypassable without server/RLS validation; product rule, not a vault. |
| ~~Public `email` on `profiles`~~ | **Resolved (2026-10-04):** app code selects only public columns (email only for the user's own profile), and migration `20260930230000_hide_profile_email_from_anon.sql` was applied after deploy, revoking anon access to `email`. Logged-out pages confirmed working afterward. |
| Hardcoded Formspree form id | Spam/lock-in surface on `/issue`. |
| Misleading `src/api/` name | Client MapLibre helper only (`src/api/map.ts`) — rename when cleaning structure. |
| Triplicated date/sort helpers across cards/list/user pages | Maintainability tax once features stabilize. |
| RLS SQL not in `supabase/migrations/` | **Partly addressed (2026-10-05):** live policies exported as a reference snapshot (`supabase/snapshots/`) and storage/grant fixes written as migrations. Still no runnable baseline migration. |

### Dead code inventory — CULLED (2026-09-23)

| Artifact | What it was | Why unused | Action taken |
|----------|-------------|------------|--------------|
| `src/clients/ThemeProvider.tsx` | Empty leftover from early theme work | Never imported; theming via CSS / HeroUI | Deleted |
| `src/components/logoutButton.tsx` | Standalone sign-out button | No imports; nav signs out inline | Deleted |
| `src/hooks/fetchUserbyUsername.ts` | Profile lookup by username | Zero call sites; app uses UID | Deleted |
| `addEventMarkers` in `src/api/mapbox.ts` | DOM markers + `Popup.setHTML` | Map only uses `initMap`; XSS risk if revived | Removed export |
| `GoogleOAuthProvider` / `@react-oauth/google` | Wrapped tree in `providers.tsx` | Auth is Supabase `signInWithOAuth` | Unwrapped; package uninstalled |
| `"npm"` in `package.json` dependencies | Accidental npm CLI package dep | Shell npm comes with Node; never imported | Uninstalled |

**Also:** removed unused `NEXT_PUBLIC_GOOGLE_CLIENT_ID` from local `.env` (Supabase dashboard Google provider unchanged).

---

## Suggested engineering order

1. ~~**Verify/fix Supabase RLS** and compartmentalize the service-role key.~~ **Done** (export migrations still nice-to-have).  
2. ~~**Middleware + harden create/delete/profile writes**~~ **Done.**  
3. ~~**Cull dead code**~~ **Done.**  
3b. ~~**Apply the profile-email migration**, then revoke the old Mapbox token.~~ **Done** (2026-10-04).  
4. ~~**Commit lockfile + add CI** (`lint` / `tsc` / `build`).~~ **Done** (2026-10-04); check required on `main` (2026-10-05).  
5. ~~**Paginate list + bbox/upcoming filter on map.**~~ **Done** (2026-10-04, no bbox); apply the attendee-summary migration before deploying.  
6. **Finish item 5 UX/reliability** (meet detail states, RSVP lock, username unique constraint); then Maps URL fix.

---

## Architecture reference (brief)

| Path | Role |
|------|------|
| `src/middleware.ts` | Session refresh, auth redirects, sandbox gate, security headers |
| `src/app/` | Routes: `/`, `/map`, `/seeAllMeets`, `/meet/[id]`, `/create`, `/profile`, `/user/[id]`, `/loginrequired`, `/issue`, `/auth/callback`, `/sandbox/*` |
| `src/clients/` | Browser/server Supabase helpers + `AuthProvider` |
| `src/models/` | `Meet` / `User` write + image upload helpers |
| `src/components/` | Nav, cards, popup, search, galleries |
| `src/hooks/` | Profile fetchers + metadata thin wrap of `useAuth` |
| `src/api/map.ts` | Client MapLibre init + dark theme overrides (not an HTTP API); search via `src/util/photon.ts` |
| `supabase/` | CLI `config.toml`; `migrations/` has the profile-email grant migration (applied) the attendee-summary function, and two 2026-10-05 hardening migrations (both applied 2026-10-05); `snapshots/` holds a non-runnable reference of live policies; `profiles` rows are created by a private trigger on `auth.users` (not in the repo) |

**Core tables (inferred):** `meets`, `profiles`, `meet_attendees`; storage bucket `images`.
