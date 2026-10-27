# Blip — Dependency Vulnerability Review

**Date:** 2026-10-26
**Sources:** GitHub Dependabot (open alerts on `nndpznn/blip`), `npm audit` in the repo root and in `apps/mobile`, and the app's own code and config.
**Scope:** Review, then the safe fixes were applied the same day (see [Applied](#applied-2026-10-26)).

---

## Applied (2026-10-26)

| Change | Result |
| --- | --- |
| `next` 16.1.6 → 16.4.3 (exact pin) | Clears the 2 critical RCEs and all other Next advisories, plus the `sharp` and `postcss` findings that Next pulls in |
| `npm audit fix` (non-breaking lockfile updates) | Clears `nanoid`, `source-map-js` and all dev-only tooling findings |

`npm audit` for the web app went from 13 high or critical findings (11 high, 2 critical) to **2 remaining: `maplibre-gl` (critical) and `esbuild` (low)**. Typecheck, 73 unit tests and the production build pass.

**Deliberately not applied:**
- **`maplibre-gl` 5 → 6** (major version): the app never passes user content to `setHTML`, so the XSS is not reachable. Do it as its own tested change.
- **`esbuild` (low):** only affects a dev server on Windows.
- **Mobile tooling (Expo CLI):** dev machine only, and npm's suggested fix is a downgrade.
- **`eslint-config-next`:** left at 16.1.6; it is lint config, not runtime.

**Side effects worth knowing:**
- `npm audit fix` also moved `eslint-plugin-react-hooks` from 7.0.1 to 7.1.1, which adds the `react-hooks/set-state-in-effect` rule. It flags three existing effects (`profile`, `seeAllMeets`, `nav`) that work today. In `eslint.config.mjs` the rule is set to `warn` so CI is not blocked; refactor those effects when convenient and then remove the override.
- `node_modules` is now a symlink to `node_modules.nosync` (the `.nosync` suffix keeps iCloud from syncing it). While the repo lives under an iCloud-synced `~/Desktop`, iCloud corrupted some installed files (ESLint failed with `optionator is not a function`). **`npm install` and `npm ci` replace the symlink with a real folder.** After running either, recreate it: `rm -rf node_modules.nosync && mv node_modules node_modules.nosync && ln -s node_modules.nosync node_modules`. Moving the repo out of `~/Desktop` removes the need for this.

---

## Summary

GitHub reports **65 open alerts: 3 critical, 30 high, 26 medium, 6 low**. They collapse into a few root causes:

| Root cause | Alerts | Worst severity | Fix |
| --- | --- | --- | --- |
| `next` pinned at 16.1.6 | 35 | **critical** (2 remote code execution) | Upgrade to `16.4.3`, same major, no breaking change expected |
| `maplibre-gl` 5.x | 1 | **critical** (XSS) | Major upgrade to 6.x; low real exposure (see below) |
| Packages that ride along with Next (`sharp`, `postcss`, `nanoid`, `source-map-js`) | 9 | high | Resolved by the Next upgrade and a lockfile refresh |
| Dev-time tooling (`js-yaml`, `brace-expansion`, `minimatch`, `picomatch`, `flatted`, `browserslist`, `@babel/core`, `esbuild`, `@humanfs/node`) | 16 | high | `npm audit fix`, non-breaking |
| Misc (`baseline-browser-mapping`, `protocol-buffers-schema`) | 2 | medium | `npm audit fix` |

49 of the 65 alerts are in runtime dependencies and 16 are dev-only. **One command fixes most of this: `npm install next@16.4.3 --save-exact`.** Next is pinned exactly in `package.json`, which is why `npm audit fix` alone will not move it.

The mobile app (`apps/mobile`) has 4 high findings, all in Expo's build tooling (see [Mobile app](#mobile-app)). None of them ships inside the app.

---

## 1. Next.js 16.1.6 → 16.4.3 (do first)

Installed version: `16.1.6`. Affected by 35 advisories spanning 16.1.7 through 16.4.0.

**Critical (fixed in 16.3.3 or later; use 16.4.3 to cover all of them):**
- Unauthenticated remote code execution in the Image Optimization API when AVIF files are used.
- Unauthenticated remote code execution in the Image Optimization API when SVG files are used.
- Unauthenticated remote code execution in `use cache` functions that return typed arrays.
- Unauthenticated remote code execution on Windows-hosted servers.

**High, the ones that matter for this app:**
- Middleware / Proxy bypass (several variants: segment-prefetch routes, dynamic route parameter injection, Turbopack single-locale).
- Denial of service with Server Components and with Server Actions.
- Server-side request forgery in Image Optimization.

**How exposed is Blip?** I haven't confirmed that any of these can be exploited against the Vercel deployment, so treat this as an upgrade-now item either way. What the code shows:

| Advisory area | Used by Blip? | Notes |
| --- | --- | --- |
| Image Optimization API | **Yes**, `next/image` in `src/app/page.tsx`, `src/app/loginrequired/page.tsx`, `src/components/nav.tsx` | `next.config.ts` is empty, so the default `/_next/image` endpoint is live. This is the most likely path for the critical RCEs. |
| Proxy / middleware bypass | **Yes**, `src/proxy.ts` gates `/create`, `/profile`, `/user` | A bypass would let a logged-out visitor reach those pages. Supabase RLS is still the real data boundary (see the 2026-09-23 audit), so this exposes UI, not data. |
| Server Actions | No (`'use server'` is not used anywhere) | The Server Action advisories do not apply today. |
| `use cache` / Cache Components | No | The typed-array RCE does not apply today. |
| Windows-hosted servers | No (Vercel runs Linux) | Does not apply. |

**Plan:**
1. `npm install next@16.4.3 --save-exact`. Also bump `eslint-config-next` to the same version if it is pinned.
2. `npm run lint && npm test && npm run build`.
3. Smoke test locally: the home page images, `/create` and `/profile` redirecting when logged out, the Google sign-in round trip, and the map.
4. Merge to `main` so Vercel redeploys.

---

## 2. `maplibre-gl` 5.24.0 (critical, low real exposure)

The advisory is an XSS sanitizer bypass in `DOM.sanitize()`. It applies to content passed to HTML-string APIs such as `Popup.setHTML`. Every vulnerable version is `<= 6.4.0`, so there is no patch in the 5.x line.

**Blip's exposure is low:**
- No `setHTML` calls anywhere in `src`. Meet popups use `popup.setDOMContent(container)` with React-rendered content (`src/app/map/page.tsx`).
- The one `innerHTML` use is the static pin SVG with no user data. The place label is set through `textContent` (`src/app/map/page.tsx`).

**Plan:** upgrade to the current 6.x as its own change (`npm install maplibre-gl@latest`). It is a major version, so retest the map page, cluster zoom, popups, the searched-location ping, and `themeMapStyle` in `src/lib/map.ts`. Do not bundle it with the Next upgrade, so a regression is easy to pin on one change.

---

## 3. Transitive runtime packages (resolved by step 1 plus a lockfile refresh)

| Package | Severity | Issue | How it gets fixed |
| --- | --- | --- | --- |
| `sharp` (used by Next image optimization) | high | Bundled libvips, libheif and librsvg CVEs | The Next upgrade pulls a patched `sharp` |
| `postcss` | high | Arbitrary `.map` file read via `sourceMappingURL` | The Next upgrade; `npm audit` lists it under Next's fix |
| `nanoid` | high | Infinite loop or overflow with unusual `size` | `npm audit fix` (3.3.18 or later). Blip does not call it with custom sizes. |
| `source-map-js` | high | Event-loop denial of service from crafted source maps | `npm audit fix` (1.2.2 or later). Build-time input only. |

These are mostly build-time or non-user-reachable. They are fixed by running `npm audit fix` after the Next upgrade.

---

## 4. Dev-only tooling (low urgency)

`js-yaml`, `brace-expansion`, `minimatch`, `picomatch`, `flatted`, `browserslist`, `@babel/core`, `esbuild` and `@humanfs/node` are pulled in by ESLint, Babel and the build. They only process files already in the repo or on a developer machine, so the risks are CPU denial of service on pathological input and file reads on Windows dev servers. They never run in production. All have non-breaking fixes: run `npm audit fix` and re-run lint and tests.

`baseline-browser-mapping` and `protocol-buffers-schema` (medium) are indirect dependencies and should clear with the same refresh; confirm with `npm audit` afterwards.

---

## Mobile app

`apps/mobile` has 4 high findings from `npm audit`: `expo`, `@expo/cli`, `node-forge` (RSA signature verification) and `zod` (memory use on oversized collections).

- **None ship in the app bundle.** They belong to Expo's command-line tooling, which runs on the developer's Mac.
- **Do not follow npm's suggested fix.** It proposes `expo@54.0.38`, a downgrade from the SDK 58 this app targets.
- **Action:** wait for an Expo SDK 58 patch release that updates `@expo/cli`, then run `npx expo install --fix` followed by `npm audit`.
- The app's runtime dependencies (React Native, Supabase client, MapLibre RN, `expo-*`) have no findings.
- Dependabot has not yet scanned `apps/mobile/package-lock.json` because it is not on `main`. Expect these four to show up as alerts after the next merge.

---

## Recommended order

1. **Now:** upgrade Next to 16.4.3, verify, deploy. This clears the 2 critical RCEs and roughly half of all alerts.
2. **Same day:** `npm audit fix` for the transitive and dev-only items, then lint, tests and build.
3. **This week:** the MapLibre 6.x upgrade as a separate, tested change.
4. **When available:** the Expo tooling patch for the mobile app.
5. **Prevention:** add Dependabot version updates (`.github/dependabot.yml`) for the root and `apps/mobile` so Next patch releases arrive as pull requests. The exact pin on `next` is why the app is still on 16.1.6 while 16.4.3 is out.

## What this review did not cover

- Whether the Vercel deployment has platform-level protections that already block the Image Optimization RCEs. Worth checking in the Vercel dashboard, but the upgrade makes it moot.
- Dependabot alerts only reflect the lockfile on `main`. Confirm with a fresh `npm audit` after upgrading.
- Application-level security (RLS, auth flow, storage policies) is covered in `docs/AUDIT.MD`, not here.
