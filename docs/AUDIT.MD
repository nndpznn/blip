# Blip — Big-Picture Audit

**Date:** 2026-09-23  
**Updated:** 2026-09-23 (items 1–2 status)  
**Repo:** `/Users/nndpznn/Desktop/CMSI/personal/blip`  
**Constraint (original):** Report only — no application code changes. Secret values are not printed.

---

## Snapshot

Blip is a California-focused car/coffee meet discovery app (map + list, RSVP, create/edit, profiles). Stack: **Next.js 16.1.6** App Router, **React 19**, TypeScript, **Supabase** (auth + Postgres + storage), Mapbox GL, HeroUI, Tailwind 4. Hosted on Vercel.

**Auth boundary (current):** Cookie-backed `@supabase/ssr` clients, root [`middleware.ts`](../middleware.ts) (session refresh, `/create` + `/profile` gates, prod `/sandbox` block, security headers), and `/auth/callback` for OAuth. Client screens still talk to Supabase with the anon key; **RLS on the Supabase project is the data-authorization boundary**. Product maturity is pre-1.0 (`package.json` version `0.5.0`).

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

**Residual (non-blocking):** Policies are not yet exported into `supabase/migrations/` for PR review. Export when convenient so dashboard drift is visible in git. Re-run a short smoke checklist after any future policy change: anon JWT absent cannot write; user A cannot edit/delete user B’s meet; user A cannot update user B’s profile.

---

### 2. Auth is UI-only: no middleware; create/delete not hardened (Security / Reliability) — DONE

**Status (2026-09-23):** Fulfilled in application code.

| Requirement | Where |
|-------------|--------|
| Cookie sessions + middleware redirects for `/create`, `/profile` → `/loginrequired?next=…` | [`middleware.ts`](../middleware.ts), [`src/clients/supabase/`](../src/clients/supabase/) |
| `saveToDatabase` / `saveEditDatabase`: `getUser()`, force `organizerId` | [`src/models/meet.ts`](../src/models/meet.ts) |
| Delete: require user + assert organizer before storage/row delete | [`src/app/meet/[id]/page.tsx`](../src/app/meet/[id]/page.tsx) |
| Profile save: `getUser()`, `.eq('id', user.id)` | [`src/models/user.ts`](../src/models/user.ts) |
| Auth consolidation (`AuthProvider` + drop duplicate hook) | [`src/clients/authContext.tsx`](../src/clients/authContext.tsx); `useSupabaseUser` removed |

UI organizer gates remain for UX only; RLS (item 1) + write-path identity are the real controls.

---

### 3. No CI, no tests, lockfile gitignored (Reliability)

`.gitignore` ignores `package-lock.json`, so installs on Vercel/CI are non-reproducible. There is no `.github/workflows`, no `*.test.*` / `*.spec.*`, and `npm run migrate:meet-images` points at a missing `scripts/migrate-meet-images.ts`. Past dependency/Vercel breakage is a predictable outcome of this setup. Regressions in RSVP, image limits, and auth gates have no automated net.

**Action item:** Stop ignoring `package-lock.json` and commit the current lockfile. Add a minimal GitHub Actions workflow on PRs: `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Fix or delete the broken migrate script so `package.json` scripts match the tree. Seed a small test suite where logic is already pure or easy to extract: `filesWithinMeetImageLimit` / `isMeetImageOverLimit`, California/location helpers once centralized, and meet date/time parsing. Block merges on red CI. This is the cheapest reliability lever after RLS.

**Alternatives:** If GitHub Actions is deferred, at least version the lockfile and run `next build` in Vercel with frozen installs. Skip e2e until unit/build gates exist.

---

### 4. Unbounded meet loads on map and list (Efficiency / Reliability)

The map does `supabase.from('meets').select('*')` with no filter (`src/app/map/page.tsx`). Browse does an ordered full-table `select()` (`src/app/seeAllMeets/page.tsx`). As the community grows, this becomes slow loads, large client memory, heavy GeoJSON, and possible mobile failure—before any feature work.

**Action item:** Paginate the list view (`range` + infinite scroll or “load more”), defaulting to upcoming meets by date. For the map, query by viewport bbox and an upcoming date window (store lng/lat columns or use PostGIS/`location` JSON operators). Stop selecting `*` for cards/markers—pull only fields needed for pins and card chrome; fetch full bodies on the detail route. Cap `.in('meet_id', …)` attendee batches (e.g. chunks of 100). Re-check Mapbox layer update effects so full rebinds are not paid on every meets array identity change.

**Alternatives:** A materialized “upcoming_meets” view or edge-cached public feed for anonymous browse. Overkill until pagination/bbox exist.

---

### 5. Fragmented auth/loading and false “not found” UX (Reliability) — PARTIAL

**Done with item 2:** Single auth source via `AuthProvider` (`getUser` + `onAuthStateChange`); `useSupabaseUser` removed; `useSupabaseUserMetadata` wraps `useAuth`; create no longer uses `user!` (middleware + guard).

**Still open:** Meet detail still conflates loading with “not found” (`!meet || !organizer`). `fetchUserByUID` can return a Postgrest error object as if it were a profile. RSVP toggles have no in-flight lock. Username uniqueness is a client TOCTOU check (add a unique DB constraint on `profiles.username`).

**Action item (remaining):** Split meet detail into `loading` / `error` / `ready`. Fix `fetchUserByUID` to return `null` on error. Disable RSVP while a request is in flight; enforce username uniqueness in the database.

---

## Honorable mentions

| Issue | Why it matters less *right now* |
|--------|----------------------------------|
| Public Mapbox token in Search Box query strings | Expected for GL; still restrict token URLs/scopes in Mapbox dashboard and consider a rate-limited proxy later (cost/abuse). |
| `/sandbox` routes | **Mitigated:** middleware returns 404 for `/sandbox*` when `NODE_ENV === 'production'`. |
| Dead code | **Culled (2026-09-23):** removed unused ThemeProvider, logoutButton, fetchUserByUsername, addEventMarkers, GoogleOAuthProvider/`@react-oauth/google`, and accidental `"npm"` dependency. |
| `encodeToGoogleMaps` puts coordinates in `query_place_id` | Broken/weak Maps deep links (`src/util/encodeToGoogleMaps.ts`) — quick fix after remaining P-items. |
| Client-only California substring check | Bypassable without server/RLS validation; product rule, not a vault. |
| Possible public `email` on profile `select('*')` | Confirm column grants / RLS so public user pages do not leak emails. |
| Hardcoded Formspree form id | Spam/lock-in surface on `/issue`. |
| Misleading `src/api/` name | Client Mapbox helpers only — rename when cleaning structure. |
| Triplicated date/sort helpers across cards/list/user pages | Maintainability tax once features stabilize. |
| RLS SQL not in `supabase/migrations/` | Residual from item 1 — export for reviewability, not a live auth hole if dashboard policies stay correct. |

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
4. **Commit lockfile + add CI** (`lint` / `tsc` / `build`).  
5. **Paginate list + bbox/upcoming filter on map.**  
6. **Finish item 5 UX/reliability** (meet detail states, `fetchUserByUID`, RSVP lock, username unique constraint); then Maps URL fix.

---

## Architecture reference (brief)

| Path | Role |
|------|------|
| `middleware.ts` | Session refresh, auth redirects, sandbox gate, security headers |
| `src/app/` | Routes: `/`, `/map`, `/seeAllMeets`, `/meet/[id]`, `/create`, `/profile`, `/user/[id]`, `/loginrequired`, `/issue`, `/auth/callback`, `/sandbox/*` |
| `src/clients/` | Browser/server Supabase helpers + `AuthProvider` |
| `src/models/` | `Meet` / `User` write + image upload helpers |
| `src/components/` | Nav, cards, popup, search, galleries |
| `src/hooks/` | Profile fetchers + metadata thin wrap of `useAuth` |
| `src/api/mapbox.ts` | Client Mapbox init (not an HTTP API) |
| `supabase/` | CLI `config.toml` (migrations folder still empty) |

**Core tables (inferred):** `meets`, `profiles`, `meet_attendees`; storage bucket `images`.
