# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
npm install
npm run dev        # Vite dev server → http://localhost:5173 (frontend only, no /api/*)
npm run build      # tsc type-check then Vite build → dist/
npm run preview    # Preview production build
```

Full local stack (Worker + D1 + assets) — required to exercise `/api/*`:
```bash
npm run build && npx wrangler dev    # → http://localhost:8787
```
Do **not** use `wrangler pages dev` — this is a Workers + Assets project with a single entry point, not Pages Functions; it will fail with "No routes found". Local secrets (`CLERK_SECRET_KEY`) go in `.dev.vars`.

Apply/modify the D1 schema:
```bash
npx wrangler d1 execute mundial2026db --file=sql/schema.sql --local    # local dev
npx wrangler d1 execute mundial2026db --file=sql/schema.sql --remote   # production
```

There are no automated tests (`npm test` exits 1). Verification is manual via the dev server.

## Project Overview

**Polla Mundialista** is a World Cup betting pool. Players submit predictions through the web UI; scores are calculated client-side in real time. The frontend is React (auth shell only) + vanilla TypeScript components; bets and player data live in Cloudflare D1.

### Key Concept

Bets are stored in D1 (`player_bets` table) and locked by tournament logic via the match status lifecycle: `pendiente` (future) → `siguiente` (open for betting, shown in editor) → `jugando` (live, locked, shown as "EN VIVO") → `finalizado` (scored). The dashboard recalculates all scores on every page load from data fetched via API.

### Anti-Copy Masking (`functions/api/bets.ts`)

`GET /api/bets` returns every player's bets, but predictions that are still editable are **masked server-side** so they can't be copied from the JSON. The requesting user always sees their own bets in full; for everyone else:

- Match scores are replaced with `{ gL: 0, gV: 0 }` unless the match is `finalizado` or `jugando`.
- Plus predictions (convocatoria, top4, posicionesGrupos) are masked with the `'?'` sentinel while their `mostrar*` flag is `true` (betting window open). Empty stays empty, so the frontend can still render "submitted (`?`)" vs "not submitted (`–`)".
- `goOn` picks are masked per match the same way.

**Critical gotcha:** `bets.ts` imports `data/results.json` and `data/settings.json` at build time. Changing a match status or a `mostrar*` flag only takes effect in the API masking after `npm run build && npx wrangler deploy` — editing the JSON alone is not enough.

## Architecture

### Tech Stack

- **Frontend:** React 19 + Vite 8 + vanilla TypeScript (React/JSX only in the auth shell: `App.tsx`, `main.tsx`, `components/LandingPage.tsx`, `components/InstructionsModal.tsx`; all game-logic components are plain TS DOM builders)
- **Styling:** Vanilla CSS — dark theme, semantic color variables in `:root`, BEM naming for component styles
- **Authentication:** Clerk (OAuth + JWT)
- **Backend:** Cloudflare Worker (single `functions/api/sync-user.ts` entry point) + D1 SQLite
- **Deployment:** Cloudflare Workers + Assets (single deploy serves both API and SPA) + D1

### Directory Structure

```
src/
  App.tsx              # Clerk auth shell — resolves current player, calls startApp()
  main.ts              # Bootstrap: fetch data via APIs, call component builders
  main.tsx             # React entry point
  state.ts             # Shared mutable app state (RESULTS, PLAYERS, BETS, etc.)
  types.ts             # TypeScript interfaces
  scoring.ts           # All points calculation
  syncUser.ts          # POST /api/sync-user on sign-in
  avatar.ts            # Avatar HTML helpers (img or initials fallback)
  tabs.ts              # Hash-based tab routing
  style.css
  components/
    LandingPage.tsx    # Signed-out landing (React)
    InstructionsModal.tsx  # Rules modal, opened via window.openInstrucciones (React)
    ranking.ts         # Leaderboard + player detail popups → #ranking-body
    matches.ts         # Match history and bet cards → #matches-list
    plus.ts            # Group standings, top4, knockout bets → #plus-content
    stats.ts           # Chart.js graph + achievement cards → #stats-grid
    metrics.ts         # Top KPIs row → #metrics-row
    mis-apuestas.ts    # Live bet editor — loads/saves via API → #mis-apuestas-content

functions/
  api/
    sync-user.ts       # Cloudflare Worker entry: routes all /api/* requests
    bets.ts            # Handlers for players/bets endpoints + anti-copy masking

sql/
  schema.sql           # D1 schema: players + player_bets tables

data/
  results.json         # Match results (static, Git-managed)
  settings.json        # Scoring rules and display flags
  plus_results.json    # Actual top4/group standings (optional)
  colombia_final.json  # Official Colombia squad (optional)

wrangler.jsonc         # Worker config: D1 binding, SPA asset serving, run_worker_first
.dev.vars              # Local Worker secrets (CLERK_SECRET_KEY) — not committed
```

### Data Flow

1. **Bootstrap** (`main.ts → startApp()`):
   - Fetches `results.json` and `settings.json` (static files, path controlled by `?data=` param)
   - Fetches `/api/players` → D1 `players` table → `state.PLAYERS` + `state.AVATARS`
   - Fetches `/api/bets` → D1 `player_bets` table → `state.BETS` + `state.PLUS_BETS`
   - Fetches optional `plus_results.json` and `colombia_final.json`
   - Calls all component builder functions in sequence

2. **Authentication** (`App.tsx`):
   - Wraps app in Clerk `<ClerkProvider>`
   - On sign-in, calls `syncUser()` → POST `/api/sync-user` (non-fatal if fails)
   - Resolves player identifier from Clerk username → email local-part → undefined
   - Passes `currentPlayer` and `getToken` to `startApp()`

3. **Bet Editing** (`mis-apuestas.ts`):
   - Loads current user's bets from `GET /api/bets/me` (JWT-authenticated)
   - Saves to `POST /api/bets` with `updated_at` for optimistic conflict detection (409 on stale write)
   - Editor lists only matches with status `siguiente`; `finalizado`/`jugando` matches are locked
   - The `mostrar*` flags in `Settings` mean "betting window open for that Plus phase": `true` shows the editing panel (and the API masks those bets from other players); `false` closes betting (and the API reveals them)
   - Top4 panel is locked once any match is `finalizado`

4. **Routing**: `tabs.ts` handles hash-based routing (`#/ranking`, `#/partidos`, `#/plus`, `#/estadisticas`, `#/mis-apuestas`) — plain DOM, no framework router.

### State Shape (`state.ts`)

```typescript
{
  RESULTS: Result[];          // Matches with id, teams, scores, status, phase, type
  PLAYERS: string[];          // Participant names from D1
  AVATARS: Record<string, string>;  // name → Clerk avatar URL (may be empty)
  BETS: Record<string, Bet[]>;
  PLUS_BETS: Record<string, PlusBet>;
  PLUS_RESULTS: PlusResults | null;
  COLOMBIA_FINAL: ColombiaFinal | null;
  SETTINGS: Settings;         // Includes display flags: mostrarConvocados, mostrarCuadrodeHonor, mostrarPosicionesGrupos
  CURRENT_PLAYER: string | null;
}
```

### Scoring Logic (`scoring.ts`)

**Match Points** (per `tipo` multiplier: N=×1, E=×2, X=×3):
- Exact score: 3 pts × multiplier
- Correct trend (win/draw/loss): 1 pt × multiplier

**Plus Points** (long-term predictions, one-time):
- Colombia squad: 1 pt/correct player (max 26)
- Group standings: 2 pts/team in correct position
- Top 4: Campeon 8 / Subcampeon 5 / Tercero 4 / Cuarto 3 pts
- Knockout advancing: 2 pts/correct

Key functions: `calcMatchScore(bet, result)`, `calcPlusScore(playerName)`, `getStats(playerName)`.

## Backend API

All routes are handled by a single Cloudflare Worker (`functions/api/sync-user.ts`). All routes require a valid Clerk JWT in `Authorization: Bearer <token>`.

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/api/players` | Yes | Returns `{ participantes, avatars }` from D1 `players` |
| GET | `/api/bets` | Yes | Returns `{ bets, plus }` for all players from D1 |
| GET | `/api/bets/me` | Yes | Returns `{ bets, plus_bets, updated_at }` for current user |
| POST | `/api/bets` | Yes | Saves `{ bets, plus_bets, updated_at }` — returns 409 on stale write |
| POST | `/api/sync-user` | Yes | Upserts `{ id, username, email, avatar_url }` to `players` |

### D1 Schema

```sql
CREATE TABLE players (
  id TEXT PRIMARY KEY, username TEXT, email TEXT, avatar_url TEXT, updated_at TIMESTAMP
);
CREATE TABLE player_bets (
  player_id TEXT PRIMARY KEY REFERENCES players(id),
  bets TEXT NOT NULL DEFAULT '[]',   -- JSON: Bet[]
  plus_bets TEXT,                    -- JSON: PlusBet
  updated_at TIMESTAMP
);
```

## Deployment

Manual, single command (deploys Worker + `dist/` assets):
```bash
npm run build && npx wrangler deploy
```
Worker config (`wrangler.jsonc`): name `polla-mundial`, `run_worker_first: ["/api/*"]`, assets served as SPA, D1 binding `mundial2026db`. Production secrets (`CLERK_SECRET_KEY`) are set in the Cloudflare dashboard.

Remember: any edit to `data/results.json` or `data/settings.json` requires a build + deploy, both for the static assets and for the masking logic baked into the Worker.

## Data File Formats

`data/results.json` — match results (static):
```json
[{ "id": 1, "local": "Argentina", "visita": "Brasil", "gL": 2, "gV": 1, "status": "finalizado", "fase": "Grupos", "grupo": "A", "tipo": "N", "fecha": "2026-06-11T19:00:00Z" }]
```

Status values: `"pendiente"` (future) | `"siguiente"` (open for betting, shown in editor) | `"jugando"` (live — bets locked and revealed, rendered "EN VIVO") | `"finalizado"` (scored). `fecha` is the ISO 8601 kickoff time in UTC, optional.

`data/settings.json`:
```json
{
  "puntos": { "score": 3, "result": 1, "groupPlus": 2, "firstPlus": 8, "secondPlus": 5, "thirdPlus": 4, "fourthPlus": 3, "goOnPlus": 2 },
  "multiplicadores": { "N": 1, "E": 2, "X": 3 },
  "tiposPartido": { "N": "Normal", "E": "Especial", "X": "Super Especial" },
  "mostrarConvocados": true,
  "mostrarCuadrodeHonor": true,
  "mostrarPosicionesGrupos": true
}
```

## Important Conventions

- **Naming convention:** All identifiers (variables, functions, classes, files, CSS classes) must be in English. UI-facing strings (labels, placeholders, messages) remain in Spanish.
- **Match status:** Always check `result.status === 'finalizado'` before scoring.
- **Player name normalization:** `normalizePlayerName()` in `scoring.ts` handles case/whitespace for Colombia squad matching.
- **Component isolation:** Each component reads from global `state` and writes to its own DOM container. No inter-component communication.
- **Error resilience:** Missing optional data (plus_results, colombia_final) defaults to `null`; app never crashes on fetch failure.
- **Test data:** `?test` or `?data=<folder>` in the URL switches the static-data folder (e.g. `?data=test_data`). No `test_data/` folder currently exists in the repo — create one mirroring `data/` if needed. This only affects static files, not the API (which bakes in `data/` at build time).
- **XSS hygiene:** All user-visible strings go through `esc()` in `mis-apuestas.ts` before insertion into innerHTML.
- **Hidden-bet rendering:** Masked Plus values arrive from the API as the `'?'` sentinel; the frontend shows `?` for "submitted but hidden" and `–` for "not submitted". Don't treat `'?'` as a real prediction.

## Scoring Achievements (`stats.ts`)

El Vidente (most exact), Racha de Fuego (longest exact streak), El Apostador (most pts from special matches), El Tronco (most 0-pt matches), Nostradamus (most Plus pts), Convocatoria Colombia, Al Palo (most trend-correct without exact), El Conservador (most tie predictions), Caballo de Arranque (best group-stage relative performance), Tortuga Ninja (best knockout relative performance), Montaña Rusa (most inconsistent), La Oveja Negra (lowest total pts).
