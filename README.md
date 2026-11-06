# bannalign

The household app for 6 Bannatyne: a mobile web app (PWA) for groceries and household lists, with recipes, house maintenance and plants coming next.

- **Stack:** Vite + React + TypeScript, Dexie (offline-first local DB), Supabase (Postgres, auth, realtime), hosted on Vercel.
- **Run locally:** `npm install`, then `npm run dev`. Without `.env.local` it runs in local-only mode with no sign-in.
- **Tests:** `npx vitest run`
- **Database:** `supabase/schema.sql` (paste into the Supabase SQL Editor).

Inspired by [HomeHub by Thomas Rooyakkers](https://github.com/ThomasRooyakkers/HomeHub) (MIT).
