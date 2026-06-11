import type { Bet, PlusBet } from '../../src/types';
import resultsData from '../../data/results.json';
import settingsData from '../../data/settings.json';

interface Env {
  mundial2026db: D1Database;
}

// ─── Anti-copy filtering ────────────────────────────────────────────────────
// Bets that are still editable (their betting window is open) must not be sent
// to other players, otherwise the raw values leak in the /api/bets JSON and can
// be copied. We reveal a prediction only once it is locked:
//   · match score → match is 'finalizado'
//   · Plus phase  → its mostrar* flag is false (betting for that phase closed)
//
// While a prediction is hidden we don't drop it: we replace its value with a
// sentinel so the frontend still distinguishes "already submitted (hidden)"
// from "not submitted yet". The frontend renders any non-empty hidden value as
// '?' and an empty one as '–', so a filled-in field stays visible as '?'.

const HIDDEN = '?'; // sentinel for a submitted-but-locked prediction value

/** Empty string stays empty (not submitted); any value becomes the sentinel. */
function maskValue(value: string): string {
  return value ? HIDDEN : '';
}

const FINALIZED_MATCH_IDS = new Set<number>(
  (resultsData as Array<{ id: number; status: string }>)
    .filter(r => r.status === 'finalizado' || r.status === 'jugando')
    .map(r => r.id),
);

const flags = settingsData as {
  mostrarConvocados?: boolean;
  mostrarCuadrodeHonor?: boolean;
  mostrarPosicionesGrupos?: boolean;
};
const CONVOCATORIA_OPEN = flags.mostrarConvocados === true;
const CUADRO_HONOR_OPEN = flags.mostrarCuadrodeHonor === true;
const POSICIONES_GRUPOS_OPEN = flags.mostrarPosicionesGrupos === true;

/** Mask score predictions for matches that are not yet finalized (still copyable). */
function sanitizeMatchBets(bets: Bet[]): Bet[] {
  return bets.map(b =>
    FINALIZED_MATCH_IDS.has(b.matchId) ? b : { matchId: b.matchId, gL: 0, gV: 0 },
  );
}

/** Mask Plus predictions whose betting window is still open (still copyable),
 *  keeping the submitted/not-submitted signal via the HIDDEN sentinel. */
function sanitizePlus(plus: PlusBet): PlusBet {
  const top4 = plus.top4 ?? { campeon: '', subcampeon: '', tercero: '', cuarto: '' };
  const groups = plus.posicionesGrupos ?? {};
  const convocatoria = plus.convocatoriaColombia ?? [];

  return {
    convocatoriaColombia: CONVOCATORIA_OPEN ? convocatoria.map(maskValue) : convocatoria,
    top4: CUADRO_HONOR_OPEN
      ? {
          campeon: maskValue(top4.campeon),
          subcampeon: maskValue(top4.subcampeon),
          tercero: maskValue(top4.tercero),
          cuarto: maskValue(top4.cuarto),
        }
      : top4,
    posicionesGrupos: POSICIONES_GRUPOS_OPEN
      ? Object.fromEntries(
          Object.entries(groups).map(([grp, positions]) => [grp, (positions ?? []).map(maskValue)]),
        )
      : groups,
    // goOn locks per match: reveal finalized matches, mask the rest (keeps the
    // "predicted" signal without leaking which team they chose).
    goOn: Array.isArray(plus.goOn)
      ? plus.goOn.map(g =>
          FINALIZED_MATCH_IDS.has(g.matchId) ? g : { matchId: g.matchId, equipo: maskValue(g.equipo) },
        )
      : [],
  };
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export async function handleGetPlayers(_request: Request, env: Env): Promise<Response> {
  const rows = await env.mundial2026db
    .prepare(`SELECT username, avatar_url FROM players ORDER BY username`)
    .all<{ username: string; avatar_url: string | null }>();
  const avatars: Record<string, string> = {};
  for (const r of rows.results) {
    if (r.avatar_url) avatars[r.username] = r.avatar_url;
  }
  return json({ participantes: rows.results.map(r => r.username), avatars });
}

export async function handleGetBets(_request: Request, env: Env, userId: string): Promise<Response> {
  try {
    const rows = await env.mundial2026db
      .prepare(
        `SELECT p.id, p.username, pb.bets, pb.plus_bets
         FROM player_bets pb
         INNER JOIN players p ON p.id = pb.player_id`,
      )
      .all<{ id: string; username: string; bets: string; plus_bets: string | null }>();

    const bets: Record<string, unknown> = {};
    const plus: Record<string, unknown> = {};

    for (const row of rows.results) {
      // The requesting user always sees their own bets in full; everyone else's
      // open (still-editable) predictions are filtered out to prevent copying.
      const reveal = row.id === userId;

      let parsedBets: Bet[] = [];
      try {
        const value = JSON.parse(row.bets);
        if (Array.isArray(value)) parsedBets = value;
      } catch { /* keep [] */ }
      bets[row.username] = reveal ? parsedBets : sanitizeMatchBets(parsedBets);

      if (row.plus_bets) {
        try {
          const parsedPlus = JSON.parse(row.plus_bets) as PlusBet;
          plus[row.username] = reveal ? parsedPlus : sanitizePlus(parsedPlus);
        } catch { /* skip */ }
      }
    }

    return json({ bets, plus });
  } catch (err) {
    console.error('GET /api/bets:', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

export async function handleGetMyBets(_request: Request, env: Env, userId: string): Promise<Response> {
  try {
    const row = await env.mundial2026db
      .prepare(`SELECT bets, plus_bets, updated_at FROM player_bets WHERE player_id = ?1`)
      .bind(userId)
      .first<{ bets: string; plus_bets: string | null; updated_at: string | null }>();

    return json({
      bets: row?.bets ? JSON.parse(row.bets) : [],
      plus_bets: row?.plus_bets ? JSON.parse(row.plus_bets) : null,
      updated_at: row?.updated_at ?? null,
    });
  } catch (err) {
    console.error('GET /api/bets/me:', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

export async function handlePostBets(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    const body = (await request.json()) as { bets?: unknown; plus_bets?: unknown; updated_at?: string };

    if (body.updated_at) {
      const current = await env.mundial2026db
        .prepare(`SELECT updated_at FROM player_bets WHERE player_id = ?1`)
        .bind(userId)
        .first<{ updated_at: string }>();
      if (current && current.updated_at > body.updated_at) {
        return json({ error: 'conflict' }, 409);
      }
    }

    await env.mundial2026db
      .prepare(
        `INSERT INTO player_bets (player_id, bets, plus_bets, updated_at)
         VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)
         ON CONFLICT(player_id) DO UPDATE SET
           bets       = excluded.bets,
           plus_bets  = excluded.plus_bets,
           updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(
        userId,
        JSON.stringify(body.bets ?? []),
        body.plus_bets != null ? JSON.stringify(body.plus_bets) : null,
      )
      .run();

    const saved = await env.mundial2026db
      .prepare(`SELECT updated_at FROM player_bets WHERE player_id = ?1`)
      .bind(userId)
      .first<{ updated_at: string }>();

    return json({ ok: true, updated_at: saved?.updated_at ?? null });
  } catch (err) {
    console.error('POST /api/bets:', err);
    return json({ error: 'Internal server error', details: err instanceof Error ? err.message : String(err) }, 500);
  }
}
