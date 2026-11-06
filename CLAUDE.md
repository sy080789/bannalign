# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**bannalign** is a household app for two people (Stephen and Amanda) at 6 Bannatyne. It's an installable mobile web app (PWA) used on iPhones from the home screen. It's not in the App Store. Everything has to stay on free tiers (Vercel, Supabase, GitHub). The owner isn't technical, and Claude owns the code end to end.

Roadmap: Lists (groceries + household, **done**) → Recipes (**done**) → House maintenance (seasonal checklist with completion log, plus "issues" with photo timelines) → Plants (watering schedule) → read-only Google Calendar. Push notifications come with Maintenance/Plants. HomeHub (github.com/ThomasRooyakkers/HomeHub, MIT) is a design reference only, not a fork.

## Commands

On this Windows machine, Node and Git may be missing from PATH in a fresh shell. In PowerShell, run this first: `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`

- Dev server: `npm run dev` (Vite, port 5173). `.env.local` points at the **real** Supabase project, so the app asks for a login. For UI testing, use **local-only mode**: no Supabase, no login, data only in IndexedDB. Start it with `$env:VITE_LOCAL_ONLY='1'; npm run dev`. Claude must not sign in to the real project.
- Build and type-check: `npm run build` (`tsc -b && vite build`, which also generates the service worker)
- Lint: `npm run lint` (oxlint)
- Tests: `npx vitest run`. Single file: `npx vitest run src/features/lists/logic.test.ts`. Single test: add `-t "name"`.
- Regenerate PWA icons from `public/icon.svg`: `npx pwa-assets-generator`
- Deploy: push to `main` on `github.com/sy080789/bannalign`. Vercel auto-deploys. `vercel.json` rewrites app routes to `index.html`, excluding `/api/`.
- Schema changes: edit `supabase/schema.sql`, which must stay idempotent, then ask Stephen to re-run it in the Supabase SQL Editor.

## Architecture

**Offline-first, local DB is the source of truth.** The UI reads only from Dexie (IndexedDB, `src/db.ts`) via `useLiveQuery`. It never reads from Supabase directly.

**Every write goes through `save(table, row)` in `src/sync.ts`.** It stamps `updated_at`, writes the row locally and puts it in `outbox`. The outbox is keyed `table:id`, so repeated edits to one row merge into one entry. Never call `db.<table>.put` directly for synced data, or the change will never reach the server.

**Sync loop (`syncOnce`).** First it pushes the outbox with an upsert per table. Then it pulls each table where `synced_at > cursor`; cursors are kept in the `meta` table. A pulled row is skipped if that row still has a pending local edit. Sync runs on startup, when the app returns to the foreground (`visibilitychange`), when the network comes back (`online`), on sign-in, and on Supabase Realtime events. iOS doesn't sync in the background, so don't depend on realtime alone.

**Server side (`supabase/schema.sql`, pasted by hand into the Supabase SQL Editor; there are no migrations tooling).**
- The `lww()` trigger drops any update older than the stored row (last write wins) and stamps the server-side `synced_at`, which the pull cursor depends on.
- Rows are soft-deleted with `deleted`, never hard-deleted.
- Access is controlled by RLS through `is_member()`, which checks the signed-in user's email against the `members` table. There's no `household_id`; the whole deployment is one household.
- Public sign-up is turned off. Users are created by hand in the Supabase dashboard. Login is email and password (`Login.tsx`); iOS Keychain fills it in.

**Adding a synced table** takes four changes: add it to `db.version(...)` in `db.ts` (bump the version number if the schema changes), to `TableName` and to `TABLES` in `sync.ts`, then add it in `schema.sql`. The schema part is the table plus the `updated_at`/`deleted`/`synced_at` columns, the `lww` trigger, the RLS policy and the realtime publication. Fixed ids (like the `groceries`/`household` lists) stop the two phones from each creating duplicates of seeded rows.

**Features.** Each area is a folder under `src/features/<name>/` plus one entry in `src/features.tsx`, which drives both the bottom tab bar and the routes in `App.tsx`. `ready: false` shows a "Coming soon" page. The Today screen (`features/today`) is the home screen: quick-add, a "Needs attention" area for due/overdue cards from future features, and list summaries.

**Lists data model.** Everything lives in the single `items` table, and the flags decide where an item shows:
- `in_list` = on the list now; `checked` = in the cart.
- `staple && !in_list` = shown in the "Usuals" drawer.
- `!staple && !in_list` = history, used only for suggestions.
- "Clear checked" sets `in_list` and `checked` back to false.
- Adding by name reuses an existing row rather than creating a duplicate (`addByName` in `logic.ts`).
- Aisle grouping uses a keyword map with the longest keyword matched first (`categories.ts`).

Keep pure logic in `logic.ts`-style modules so Vitest can test it without a browser.

**Recipes and server functions.**
- `api/*.ts` are Vercel functions using the Web signature (`export async function GET(req: Request)`).
- In dev, the `devApi` plugin in `vite.config.ts` serves them through `ssrLoadModule`.
- Their relative imports **must use `.js` extensions**. Vercel runs them as native ESM, and `tsconfig.node.json` (nodenext) type-checks `api/` to enforce this.
- `api/_lib/guard.ts` handles:
  - the Supabase-token auth check (skipped when the Supabase env vars are missing, e.g. local dev)
  - SSRF protection (blocks private IPs and re-checks every redirect)
  - size and time limits
- `/api/scrape` reads schema.org Recipe JSON-LD (`src/features/recipes/extract.ts`, pure code), falling back to `og:` tags. `/api/image` proxies images.
- The scraper identifies itself honestly. Many sites (AllRecipes, Serious Eats, Budget Bytes) answer with 403. The app then fills in the name from the URL and asks the user to paste the ingredients. **Don't add bot-check evasion** (spoofed browser UAs, crawler UAs, scraping proxies).
- Recipe ingredients are stored as their original lines. `ingredients.ts` parses them only in `AddToListSheet`, which reuses `addByName` and sets `items.source` to the recipe name (shown as "for X"). `source` is cleared by "Clear checked" and by hand entry in `QuickAdd`.
- Photos: `photo.ts` resizes to WebP (with a JPEG fallback) and uploads to the public Supabase Storage bucket `photos` under a random UUID name. Workbox caches them for offline use. In local-only mode they're stored as data URLs.

**PWA.** `vite-plugin-pwa` uses `registerType: 'prompt'`. `UpdateBanner` checks for a new version each time the app comes to the foreground and shows "tap to update", because installed iOS web apps otherwise hold on to old versions.

## Design and iOS constraints

- Warm and minimal: beige and sage, with terracotta only for overdue/danger. All colours are CSS variables in `src/index.css`, and dark mode overrides them under `prefers-color-scheme` (Stephen uses dark, Amanda light). There's no UI library; plain CSS classes in `index.css`.
- Inputs must be at least 16px (smaller makes iOS zoom in). Touch targets are at least 44px. Respect `env(safe-area-inset-*)`.
- Don't use the native `<datalist>`. On iOS, Return picks the suggestion instead of submitting. `QuickAdd` renders its own tappable suggestion chips.
- Don't use magic links. They open in Safari, not the installed app, so the sign-in session never reaches the app.
- Destructive actions use an Undo toast (`useToast`) rather than a confirm dialog.
- Check UI changes at iPhone width (375×812) in both light and dark mode.

## Keeping this file current

Update this file in the same commit as any change that would otherwise make it wrong or incomplete:
- a new feature folder or synced table
- a change to sync, auth or schema behaviour
- a new iOS gotcha you discovered
- the roadmap moving forward (e.g. "Recipes, **done**")

Keep it lean, because it costs tokens on every session. Record decisions and things that are easy to break, not facts that are obvious from reading one file. Remove anything that no longer holds rather than adding caveats around it.
