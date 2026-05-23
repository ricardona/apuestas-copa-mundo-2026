import { createClerkClient } from '@clerk/backend';

interface Env {
  mundial2026db: D1Database;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
}

interface SyncUserBody {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname !== '/api/sync-user') {
      return new Response('Not Found', { status: 404 });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    try {
      const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY, publishableKey: env.CLERK_PUBLISHABLE_KEY });
      const state = await clerk.authenticateRequest(request);

      if (!state.isAuthenticated) {
        return json({ error: 'Unauthorized' }, 401);
      }

      const { userId } = state.toAuth();
      const body = (await request.json()) as SyncUserBody;

      if (body.id !== userId) {
        return json({ error: 'Forbidden' }, 403);
      }

      await env.mundial2026db
        .prepare(
          `INSERT INTO players (id, username, email, avatar_url, updated_at)
           VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)
           ON CONFLICT(id) DO UPDATE SET
             username   = excluded.username,
             email      = excluded.email,
             avatar_url = excluded.avatar_url,
             updated_at = CURRENT_TIMESTAMP`,
        )
        .bind(body.id, body.username, body.email, body.avatar_url)
        .run();

      return json({ ok: true });
    } catch (err) {
      console.error('sync-user:', err);
      return json({ error: 'Internal server error', details: err instanceof Error ? err.message : String(err) }, 500);
    }
  },
};
