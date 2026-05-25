import { test as base, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

// Playwright fixture that provisions a real Supabase user, seeds an `apps`
// row owned by that user, and injects the session cookie into the page so
// RSC/middleware see an authenticated session — without touching the magic
// link flow.
//
// First introduced by #97. Reuse for any e2e that needs a logged-in user +
// a row to act on. When `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL` are
// unset, the fixture skips the test instead of failing — keeps CI quiet
// when secrets aren't wired (current Slice 0 reality).

type SeededApp = {
  id: string;
  userId: string;
  appName: string;
  headline: string;
  packageName: string;
};

type AuthFixtures = {
  seededApp: SeededApp;
};

function projectRefFrom(url: string): string {
  // https://<ref>.supabase.co → <ref>
  const m = url.match(/^https?:\/\/([^.]+)\.supabase\./);
  if (!m) throw new Error(`Cannot derive Supabase project ref from URL: ${url}`);
  return m[1] as string;
}

export const test = base.extend<AuthFixtures>({
  seededApp: async ({ context }, use) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dbUrl = process.env.DATABASE_URL;

    if (!supabaseUrl || !serviceKey || !dbUrl) {
      test.skip(
        true,
        'auth fixture requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + DATABASE_URL (set in apps/console/.env.local for local; CI skips by design).',
      );
      return;
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) Create a throwaway user via admin API.
    const email = `pw-${Date.now()}-${Math.floor(Math.random() * 1e6)}@appee.test`;
    const password = `pw-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      throw new Error(`admin.createUser failed: ${createErr?.message}`);
    }
    const userId = created.user.id;

    // 2) Sign in to get a real session (access + refresh tokens) using a
    //    plain anon client — only way to get the SSR cookie shape Next.js
    //    middleware expects.
    const anon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '', {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: signed, error: signErr } = await anon.auth.signInWithPassword({
      email,
      password,
    });
    if (signErr || !signed.session) {
      throw new Error(`anon signInWithPassword failed: ${signErr?.message}`);
    }
    const session = signed.session;

    // 3) Seed an apps row owned by the test user.
    const sql = postgres(dbUrl, { prepare: false });
    let appRow: SeededApp;
    try {
      const shortId = Math.random().toString(36).slice(2, 10);
      const inserted = await sql<
        Array<{ id: string; app_name: string; headline: string; package_name: string }>
      >`
        INSERT INTO apps (user_id, short_id, package_name, slug, app_name, headline, status)
        VALUES (${userId}, ${shortId}, ${`app.appee.u${shortId}`}, ${`u-${shortId}`}, ${'테스트 앱'}, ${'reverse-fill e2e fixture row'}, 'preparing')
        RETURNING id, app_name, headline, package_name
      `;
      const row = inserted[0];
      if (!row) throw new Error('apps insert returned no row');
      appRow = {
        id: row.id,
        userId,
        appName: row.app_name,
        headline: row.headline,
        packageName: row.package_name,
      };
    } finally {
      // Don't await close on the happy path — postgres lib leaves the pool
      // for reuse. For test isolation we end it explicitly after seed.
    }

    // 4) Inject the Supabase auth cookie on the browser context.
    //    @supabase/ssr v0.5 stores the full Session as JSON, then writes
    //    it base64url-encoded with a `base64-` prefix. If the encoded value
    //    exceeds MAX_CHUNK_SIZE (3180 chars after URI-encoding), it is split
    //    into `sb-<ref>-auth-token.0`, `.1`, ... chunks.
    const ref = projectRefFrom(supabaseUrl);
    const cookieName = `sb-${ref}-auth-token`;
    const sessionJson = JSON.stringify(session);
    const encoded = `base64-${Buffer.from(sessionJson, 'utf-8').toString('base64url')}`;
    const MAX_CHUNK_SIZE = 3180;

    const baseUrlRaw =
      process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${process.env.LOCAL_PORT ?? '3000'}`;
    const baseUrl = new URL(baseUrlRaw);
    const cookieDefaults = {
      domain: baseUrl.hostname,
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
    };

    // Chunk based on URI-encoded length, matching @supabase/ssr's chunker.
    const cookies: { name: string; value: string }[] = [];
    if (encodeURIComponent(encoded).length <= MAX_CHUNK_SIZE) {
      cookies.push({ name: cookieName, value: encoded });
    } else {
      let remaining = encoded;
      let idx = 0;
      while (remaining.length > 0) {
        let head = remaining;
        while (encodeURIComponent(head).length > MAX_CHUNK_SIZE) {
          head = head.slice(0, head.length - 32);
        }
        cookies.push({ name: `${cookieName}.${idx}`, value: head });
        remaining = remaining.slice(head.length);
        idx += 1;
      }
    }
    await context.addCookies(cookies.map((c) => ({ ...c, ...cookieDefaults })));

    // Hand the seeded app off to the test.
    await use(appRow);

    // 5) Cleanup — delete row first (FK-clean), then drop the test user.
    try {
      await sql`DELETE FROM apps WHERE id = ${appRow.id}`;
    } catch {
      // Swallow — best effort. Failed cleanup leaves a single row + user
      // behind; pw-* test emails are easy to grep later.
    }
    await sql.end({ timeout: 2 });
    try {
      await admin.auth.admin.deleteUser(userId);
    } catch {
      // Same — best effort cleanup.
    }
  },
});

export { expect };
