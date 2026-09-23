# Blip — Big-Picture Audit

**Date:** 2026-09-23  
**Repo:** `/Users/nndpznn/Desktop/CMSI/personal/blip`  
**Constraint:** Report only — no application code changes. Secret values are not printed.

---

## Snapshot

Blip is a California-focused car/coffee meet discovery app (map + list, RSVP, create/edit, profiles). Stack: **Next.js 16.1.6** App Router, **React 19**, TypeScript, **Supabase** (auth + Postgres + storage), Mapbox GL, HeroUI, Tailwind 4. Hosted on Vercel.

There is **no** first-party API layer (`middleware.ts`, Route Handlers, or SQL/RLS in-repo). Nearly every screen is `'use client'`; the browser talks to Supabase with the anon key (`src/clients/supabaseClient.ts`). Product maturity is pre-1.0 (`package.json` version `0.5.0`).

**Highest failure risk:** data integrity and authorization rest entirely on Supabase RLS that cannot be verified from this repository. UI gates are not a security boundary.

---

## Ranked action items

Priority order used: **security → reliability → efficiency → organization**.

### 1. Unverified Supabase RLS + unused service-role key (Security — P0)

All reads and writes (meets, profiles, attendees, storage) go through the browser anon client. RLS is only mentioned in comments (`src/models/meet.ts`, meet detail page); **no policies or migrations live in the repo**. Local `.env` also contains `SUPABASE_SERVICE_ROLE_KEY` (unused in app code). If tables/storage are open—or that key ever ships to a client or public Vercel env—any holder of the anon key can forge meets, overwrite profiles, wipe RSVPs, or abuse storage.

**Action item:** Treat the Supabase project as the real backend and audit it like production infra. In the dashboard (or via exported SQL checked into the repo), confirm policies for `meets`, `profiles`, `meet_attendees`, and the `images` bucket. Practical targets: authenticated `INSERT` on meets only with `organizerId = auth.uid()`; `UPDATE`/`DELETE` only when `organizerId = auth.uid()`; profile `UPDATE` only on `id = auth.uid()`; attendees insert/delete only for `profile_id = auth.uid()`; storage writes limited to `meetImages/{auth.uid()}/…` (and deletes similarly scoped). Export those policies into something like `supabase/migrations/` so they are reviewable in PRs. Remove `SUPABASE_SERVICE_ROLE_KEY` from day-to-day frontend `.env` copies; if a one-off migration needs it, keep it in a server-only secret store and never prefix it `NEXT_PUBLIC_`. Add a short smoke checklist run after every policy change: anon JWT absent cannot write; user A cannot delete or edit user B’s meet; user A cannot update user B’s profile.

**Alternatives:** Introduce Next.js Route Handlers (or Server Actions) that use a user-scoped server client (`@supabase/ssr` is already a dependency but unused) and keep the anon key read-mostly. That raises effort but makes the trust boundary obvious in this repo. Either way, RLS remains mandatory—server routes alone are not enough if the anon key can still hit the tables.

---

### 2. Auth is UI-only: no middleware; create/delete not hardened (Security / Reliability)

There is no `middleware.ts`. `/create` uses `user!.id` from `useAuth` with no redirect if signed out (`src/app/create/page.tsx`). `Meet.saveToDatabase()` inserts without a session check, while `saveEditDatabase()` only calls `getSession()` (`src/models/meet.ts`). Meet delete runs a storage remove + `meets.delete()` with no re-auth or organizer assert in the handler—protection is “only show the dropdown if `meet.organizerId == uid`” (`src/app/meet/[id]/page.tsx`). Profile saves trust the client-supplied `this.id`. Without solid RLS (item 1), these are trivially bypassable; with RLS, users still hit confusing crashes and false errors.

**Action item:** Add Next middleware (or authenticated server layouts) that redirect unauthenticated users away from `/create` and `/profile` to `/loginrequired`. In `saveToDatabase`, call `supabase.auth.getUser()` (not only `getSession()`), abort if missing, and **force** `organizerId` from that user—never from a caller-controlled field. Mirror the same pattern on delete: load the meet, assert organizer matches `auth.uid()`, then delete; surface a clear error if RLS denies. On profile save, always `.eq('id', sessionUser.id)` using the authenticated id, not a free-form constructor argument. Keep the UI organizer gates for UX, but treat them as decoration on top of RLS + write-path identity.

**Alternatives:** Rely solely on correct RLS and accept broken UX for anonymous `/create` hits. That protects data but not product quality. A fuller migration to cookie-based `@supabase/ssr` sessions would also unlock SSR-aware guards later.

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

### 5. Fragmented auth/loading and false “not found” UX (Reliability)

`AuthProvider` (`getSession` + `onAuthStateChange`) coexists with `useSupabaseUser` (`getUser` + its own listener). Create assumes `user!`; meet detail renders “Meet data not found” whenever `!meet || !organizer`—including while still loading (`src/app/meet/[id]/page.tsx`). `fetchUserByUID` can return a Postgrest **error object** as if it were a profile (`src/hooks/fetchUserbyUID.ts`). RSVP toggles have no in-flight lock. Username uniqueness is a client TOCTOU check (`src/app/profile/page.tsx`).

**Action item:** Pick one auth source (prefer extending `AuthProvider`) and delete or thin-wrap the duplicate hook. Replace non-null assertions with explicit signed-out UI. Split meet detail into `loading` / `error` / `ready` states so organizers still fetching do not look like missing meets. Fix `fetchUserByUID` to return `null` on error and never leak error objects into UI. Disable RSVP buttons while a request is in flight; add a unique DB constraint on `profiles.username` so races cannot create duplicates.

**Alternatives:** Move session to `@supabase/ssr` cookies and drive redirects from middleware (pairs well with item 2). Larger change; consolidate client auth first if time is short.

---

## Honorable mentions

| Issue | Why it matters less *right now* |
|--------|----------------------------------|
| Public Mapbox token in Search Box query strings | Expected for GL; still restrict token URLs/scopes in Mapbox dashboard and consider a rate-limited proxy later (cost/abuse). |
| `/sandbox` routes shipped in production builds | Low data risk; remove or `NODE_ENV === 'development'` gate. |
| Dead code: empty `ThemeProvider.tsx`, unused `logoutButton`, `fetchUserByUsername`, `addEventMarkers`, unused `@supabase/ssr` / Google OAuth provider path, `"npm"` dependency | Noise and XSS footgun if `setHTML` markers are reused (`src/api/mapbox.ts`). |
| `encodeToGoogleMaps` puts coordinates in `query_place_id` | Broken/weak Maps deep links (`src/util/encodeToGoogleMaps.ts`) — quick fix after P0–P2. |
| Client-only California substring check | Bypassable without server/RLS validation; product rule, not a vault. |
| Possible public `email` on profile `select('*')` | Confirm column grants / RLS so public user pages do not leak emails. |
| Hardcoded Formspree form id | Spam/lock-in surface on `/issue`. |
| Misleading `src/api/` name | Client Mapbox helpers only — rename when cleaning structure. |
| Triplicated date/sort helpers across cards/list/user pages | Maintainability tax once features stabilize. |

---

## Suggested engineering order

1. **Verify/fix Supabase RLS** and compartmentalize the service-role key.  
2. **Middleware + harden create/delete/profile writes** (`getUser()`, force organizer id).  
3. **Commit lockfile + add CI** (`lint` / `tsc` / `build`).  
4. **Paginate list + bbox/upcoming filter on map.**  
5. **Consolidate auth and loading/error states**; then sandbox/dead-code cleanup and Maps URL fix.

---

## Architecture reference (brief)

| Path | Role |
|------|------|
| `src/app/` | Routes: `/`, `/map`, `/seeAllMeets`, `/meet/[id]`, `/create`, `/profile`, `/user/[id]`, `/loginrequired`, `/issue`, `/sandbox/*` |
| `src/clients/` | Supabase singleton + `AuthProvider` |
| `src/models/` | `Meet` / `User` write + image upload helpers |
| `src/components/` | Nav, cards, popup, search, galleries |
| `src/hooks/` | Auth helpers + profile fetchers (some misnamed) |
| `src/api/mapbox.ts` | Client Mapbox init (not an HTTP API) |

**Core tables (inferred):** `meets`, `profiles`, `meet_attendees`; storage bucket `images`.
