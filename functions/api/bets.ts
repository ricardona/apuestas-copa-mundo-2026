interface Env {
  mundial2026db: D1Database;
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

export async function handleGetBets(_request: Request, env: Env): Promise<Response> {
  try {
    const rows = await env.mundial2026db
      .prepare(
        `SELECT p.username, pb.bets, pb.plus_bets
         FROM player_bets pb
         INNER JOIN players p ON p.id = pb.player_id`,
      )
      .all<{ username: string; bets: string; plus_bets: string | null }>();

    const bets: Record<string, unknown> = {};
    const plus: Record<string, unknown> = {};

    for (const row of rows.results) {
      try { bets[row.username] = JSON.parse(row.bets); } catch { bets[row.username] = []; }
      if (row.plus_bets) {
        try { plus[row.username] = JSON.parse(row.plus_bets); } catch { /* skip */ }
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
