# Public tournament website

Read-only spectator site: tournament directory, tournament pages (matches, standings, bracket, teams) and live match pages.
React 19 + TypeScript + Vite + Tailwind 3 + React Router + TanStack Query.

```bash
npm install
cp .env.example .env        # VITE_API_BASE_URL=http://127.0.0.1:8000
npm run dev                 # http://localhost:5173
npm run build
npm test                    # vitest + Testing Library
```

Routes: `/public-tournaments`, `/public-tournaments/:slug`, `/matches/:publicId`.

* The API client can only issue `GET` requests; there is no login, no editing, and **no PDF code or links of any kind** (a test scans the
  source to keep it that way).
* Live match pages use a WebSocket (`/ws/matches/<id>/`). Stale revisions are ignored, reconnects get a fresh snapshot, and after repeated
  failures the page falls back to slow polling.
* Social previews: the *Share* buttons copy `<API>/share/t/<slug>/` and `<API>/share/m/<id>/`, small server-rendered pages with
  OpenGraph tags that redirect people to this site.

Deploy on Vercel: root directory `frontend`, framework Vite, env `VITE_API_BASE_URL`. `vercel.json` provides the SPA rewrite.
