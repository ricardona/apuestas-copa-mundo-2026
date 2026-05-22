# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

**Install dependencies:**
```bash
npm install
```

**Development server:**
```bash
npm run dev
```
Runs Vite dev server on http://localhost:5173.

**Build for production:**
```bash
npm run build
```
Runs TypeScript type-check (`tsc`) then Vite build. Output goes to `dist/`.

**Preview production build:**
```bash
npm run preview
```

## Project Overview

**Polla Mundialista** is a transparent, Git-based betting pool for World Cup predictions. It combines a Vite + React frontend (with vanilla TypeScript components) with Clerk authentication and a Cloudflare D1 database backend.

### Key Concept: GitOps for Bets

- Players commit their predictions (match scores, group standings, knockout outcomes) to `data/bets/{name}.json` and `data/bets/{name}.plus.json` **before** each match kick-off.
- Git history serves as immutable proof: no one can claim they bet differently after results are known.
- Results are managed in `data/results.json` and `data/plus_results.json`, with the dashboard recalculating scores in real-time.

## Architecture

### Tech Stack

- **Frontend:** React 19 + Vite 8 + vanilla TypeScript (vanilla JS components, not JSX for game logic)
- **Styling:** Vanilla CSS (no frameworks) with dark theme and semantic color variables in `:root`
- **Authentication:** Clerk (OAuth + managed user sessions)
- **Backend:** Cloudflare Workers (Pages Functions) + D1 SQLite
- **Deployment:** GitHub Actions → GitHub Pages (frontend assets) + Wrangler (Workers)
- **Visualization:** Chart.js for stats dashboard

### Directory Structure

```
├── src/
│   ├── App.tsx              # Clerk auth shell (SignedIn/SignedOut)
│   ├── main.ts              # App bootstrap: loads data, initializes components
│   ├── main.tsx             # React entry point
│   ├── state.ts             # Global state (PLAYERS, BETS, RESULTS, etc.)
│   ├── types.ts             # TypeScript interfaces (Bet, Result, PlusBet, etc.)
│   ├── scoring.ts           # Points calculation logic
│   ├── syncUser.ts          # Client → Worker: sync Clerk user to D1
│   ├── avatar.ts            # Avatar rendering utilities
│   ├── tabs.ts              # Tab navigation and routing
│   ├── style.css            # Main stylesheet
│   └── components/
│       ├── ranking.ts       # Build ranking table + player detail popups
│       ├── matches.ts       # Build match history and bet cards
│       ├── plus.ts          # Build Plus predictions section (groups, top4, etc.)
│       ├── stats.ts         # Build stats dashboard with Chart.js
│       ├── metrics.ts       # Build top KPIs row
│       └── mis-apuestas.ts  # Build "My Bets" editor (player selection + JSON UI)
│
├── functions/
│   ├── api/sync-user.ts     # POST /api/sync-user: Clerk-authenticated endpoint
│   └── tsconfig.json
│
├── sql/
│   └── schema.sql           # D1 schema: players table
│
├── data/
│   ├── players.json         # List of participant names
│   ├── results.json         # Match results (id, teams, scores, status, phase)
│   ├── settings.json        # Scoring rules (punto values, multipliers)
│   ├── plus_results.json    # Actual top4, group standings, advancing teams
│   ├── colombia_final.json  # Official 26-player Colombia squad
│   └── bets/
│       ├── {name}.json      # Player''s match predictions
│       └── {name}.plus.json # Player''s group/top4/knockout predictions
│
├── test_data/               # Parallel structure for testing without live data
├── wrangler.jsonc           # Cloudflare Workers config (D1 binding, compatibility_date)
├── vite.config.ts           # Vite: React plugin + static copy (data/, img/)
├── tsconfig.json            # Frontend TypeScript config
├── index.html               # Single-page app shell with Clerk root + tab structure
└── .github/workflows/
    └── deploy.yml           # Build + deploy dist/ to GitHub Pages
```

### Data Flow

1. **Player Data Load (Startup)**
   - `main.ts` fetches `data/players.json`, `data/results.json`, `data/settings.json`
   - Loads all player bets from `data/bets/{name}.json` and `.plus.json` in parallel
   - Loads optional `data/colombia_final.json`, `data/plus_results.json`
   - Stores in global `state` object

2. **User Authentication**
   - `App.tsx` wraps app in Clerk''s `<ClerkProvider>` (configured in `index.html`)
   - On sign-in, `AuthenticatedApp` calls `syncUser()` → POST to `/api/sync-user`
   - Backend validates JWT, upserts player record to D1
   - Sync failures are non-fatal; app continues offline

3. **Player Identification**
   - `App.tsx` resolves logged-in user to a player name (identifier) in order:
     1. Clerk username (set in Clerk dashboard)
     2. Email local-part (e.g., `john@example.com` → `john`)
     3. Undefined (shows all players, none pre-selected in "Mis Apuestas")
   - Passed to `startApp(identifier)` → stored in `state.CURRENT_PLAYER`

4. **Component Rendering**
   - `main.ts` calls builder functions: `buildRanking()`, `buildMatches()`, `buildPlus()`, `buildStats()`, `buildMisApuestas()`
   - Each reads from `state` and renders into its container (e.g., `#ranking-body`, `#matches-list`)
   - All scoring and aggregation happens client-side (vanilla JS, no re-renders)

5. **Routing**
   - `tabs.ts` handles tab clicks and hash-based routing (`#/ranking`, `#/partidos`, `#/plus`, `#/estadisticas`, `#/mis-apuestas`)
   - No framework routing; simple DOM manipulation and URL hash updates

### Scoring Logic (`scoring.ts`)

**Match Points:**
- **Exact score:** 3 pts (e.g., bet 2–1, result 2–1)
- **Trend correct:** 1 pt (e.g., bet 2–0, result 3–0 — both wins)
- **Miss:** 0 pts

**Multipliers** (applied per match type `tipo: ''N'' | ''E'' | ''X''`):
- `N` (Normal): ×1
- `E` (Special): ×2
- `X` (Super): ×3

**Plus Points** (one-time, long-term predictions):
- **Colombia squad:** 1 pt per correct player (max 26)
- **Group standings:** 2 pts per team in correct position (4 teams/group × 12 groups = up to 96 pts)
- **Top 4:** Champion (8), Runner-up (5), 3rd (4), 4th (3) pts
- **Knockout advancing teams:** 2 pts per correct prediction

**Key Functions:**
- `calcMatchScore(bet, result)` → `{ pts, type }` or `null` if match not finished
- `calcPlusScore(playerName)` → total Plus points for player
- `calcularPuntosConvocatoria()` → Colombia squad points using normalized player names
- `getStats(playerName)` → aggregated `PlayerStats` (total, match, plus, convocatoria, trend, misses, streak)

### State Shape (`state.ts`)

```typescript
{
  RESULTS: Result[],         // All matches (id, teams, scores, status, phase, type)
  PLAYERS: string[],         // Participant names
  BETS: { [name]: Bet[] },   // Player → match predictions
  PLUS_BETS: { [name]: PlusBet },  // Player → long-term predictions
  PLUS_RESULTS: PlusResults | null,    // Actual top4/groups/advances
  COLOMBIA_FINAL: ColombiaFinal | null,  // Official Colombia squad
  SETTINGS: Settings,        // Point values, multipliers, match types
  CURRENT_PLAYER: string | null  // Clerk-authenticated player identifier
}
```

### Component Responsibilities

| Component | Purpose | Inputs | Output |
|-----------|---------|--------|--------|
| `ranking.ts` | Leaderboard + player detail popups | `state.*` | HTML → `#ranking-body` |
| `matches.ts` | Match history, bets, results | `state.RESULTS`, `state.BETS` | HTML → `#matches-list` |
| `plus.ts` | Group standings, top4, knockout bets | `state.PLUS_BETS`, `state.PLUS_RESULTS` | HTML → `#plus-content` |
| `stats.ts` | Chart.js graph + achievement cards | `state.*` | Canvas + HTML → `#stats-grid` |
| `metrics.ts` | Top KPIs (matches played, total points) | `state.*` | HTML → `#metrics-row` |
| `mis-apuestas.ts` | Player selector + bet JSON editor | `state.CURRENT_PLAYER`, basePath | HTML → `#mis-apuestas-content` |

## Backend (Cloudflare Workers)

### POST `/api/sync-user`

**Purpose:** Upsert Clerk user to D1 database.

**Request:**
```json
{
  "id": "user_xxx",
  "username": "santiago",
  "email": "santiago@example.com",
  "avatar_url": "https://..."
}
```

**Auth:** Clerk JWT in `Authorization: Bearer <token>` header.

**Response:** `{ ok: true }` (200) or `{ error: "..." }` (401/403/500).

**Implementation:** `functions/api/sync-user.ts`
- Validates token using `@clerk/backend` client
- Verifies `body.id` matches JWT subject (prevents user spoofing)
- Upserts to `players` table (id, username, email, avatar_url, updated_at)

## Deployment

### Frontend (GitHub Pages)

Trigger: Push to `main` branch.

**Workflow** (`.github/workflows/deploy.yml`):
1. Checkout repo
2. Install Node 20
3. Run `npm ci` (clean install)
4. Run `npm run build` (TypeScript → Vite → dist/)
5. Upload `dist/` to GitHub Pages artifact
6. Deploy to GitHub Pages (auto-published)

### Backend (Cloudflare Workers)

Deployment is manual or via `wrangler deploy`:
```bash
wrangler deploy --name polla-mundial
```
Deploys `functions/api/*.ts` to Cloudflare edge.

**Config** (`wrangler.jsonc`):
- `d1_databases`: D1 binding name `DB`, database ID `mundial2026db`
- `assets.directory`: `./dist` (served static files)
- `compatibility_date`: `2026-05-22`

## Data File Formats

### `data/players.json`
```json
{
  "participantes": ["santiago", "mauro", "juan"]
}
```

### `data/results.json`
```json
[
  {
    "id": 1,
    "local": "Argentina",
    "visita": "Brasil",
    "gL": 2,
    "gV": 1,
    "status": "finalizado",
    "fase": "Grupos",
    "grupo": "A",
    "tipo": "N"
  }
]
```

### `data/bets/{name}.json`
```json
[
  { "matchId": 1, "gL": 2, "gV": 0 },
  { "matchId": 2, "gL": 1, "gV": 1 }
]
```

### `data/bets/{name}.plus.json`
```json
{
  "posicionesGrupos": {
    "A": ["Brasil", "Argentina", "Uruguay", "Chile"]
  },
  "top4": {
    "campeon": "Brasil",
    "subcampeon": "Argentina",
    "tercero": "Francia",
    "cuarto": "España"
  },
  "goOn": [
    { "matchId": 49, "equipo": "Argentina" }
  ],
  "convocatoriaColombia": [
    "Jugador 1",
    "Jugador 2",
    "..."
  ]
}
```

## Important Conventions

1. **Player name normalization:** Scoring uses `normalizePlayerName()` to handle case and whitespace in Colombia squad matching.
2. **Match status check:** Always verify `result.status === ''finalizado''` before scoring.
3. **Multiplier application:** Applied **after** calculating base points (exact or trend).
4. **Plus predictions immutability:** Once submitted (committed to Git), they cannot be edited mid-tournament.
5. **Component isolation:** Components read from global `state` and render to their own DOM containers. No inter-component messaging.
6. **Error resilience:** Failed data loads (e.g., missing `.plus.json` files) default to empty arrays/objects; app doesn''t crash.

## Development Tips

- **Run with test data:** `?test` query param in URL or `?data=test_data` loads from `test_data/` folder instead of `data/`.
- **Component updates:** Edit component function and refresh page; Vite HMR will reload.
- **Styling:** CSS variables in `:root` are theme-wide (colors, fonts); component-specific styles use BEM naming.
- **Clerk config:** Users without a set username will fall back to email local-part; verify in Clerk dashboard if routing to wrong player.

## Scoring Achievements

The dashboard auto-calculates and displays achievement badges based on player statistics:

- **El Vidente:** Most exact scores
- **Racha de Fuego:** Longest streak of exact predictions
- **El Apostador:** Most points from special matches
- **El Tronco:** Most 0-point matches
- **Nostradamus:** Most Plus points
- **Convocatoria Colombia:** Most correct Colombia squad players
- **Al Palo:** Most trend-correct predictions (without exact score)
- **El Conservador:** Most tie predictions
- **Caballo de Arranque:** Best relative performance in group stage vs. knockout stage
- **Tortuga Ninja:** Best relative performance in knockout stage vs. group stage
- **Montaña Rusa:** Most inconsistent (highest transitions between scoring/not scoring)
- **La Oveja Negra:** Lowest total points

These are computed dynamically in `stats.ts` and `scoring.ts` based on match data and player bets.
