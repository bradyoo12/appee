import { db } from '@/lib/db/client';
import { apps } from '@/lib/db/schema';
import { PATTERN_KEYS, type PatternKey } from '@/lib/refine/anthropic';
import { createGithubIssue, isEmitError } from '@/lib/refine/emit';
import { createClient } from '@/lib/supabase/server';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SUMMARY = 4000;
const MAX_HTML = 40000;
const MAX_PLAN = 20000;
const MAX_RECOMMENDED = 5;

type Body = {
  appId?: string;
  pickedPattern?: string;
  summary?: string;
  recommendedPatterns?: unknown;
  mockupHtml?: string;
  planMarkdown?: string;
};

function parseRecommended(raw: unknown): PatternKey[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0 || raw.length > MAX_RECOMMENDED) return null;
  const out: PatternKey[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') return null;
    if (!(PATTERN_KEYS as readonly string[]).includes(item)) return null;
    out.push(item as PatternKey);
  }
  return out;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;

  if (!body.appId || !UUID_RE.test(body.appId)) {
    return NextResponse.json({ error: 'invalid_app_id' }, { status: 400 });
  }
  if (
    typeof body.pickedPattern !== 'string' ||
    !(PATTERN_KEYS as readonly string[]).includes(body.pickedPattern)
  ) {
    return NextResponse.json({ error: 'invalid_picked_pattern' }, { status: 400 });
  }
  if (typeof body.summary !== 'string' || body.summary.length === 0) {
    return NextResponse.json({ error: 'invalid_summary' }, { status: 400 });
  }
  const recommended = parseRecommended(body.recommendedPatterns);
  if (!recommended) {
    return NextResponse.json({ error: 'invalid_recommended_patterns' }, { status: 400 });
  }

  const rows = await db
    .select({
      id: apps.id,
      appName: apps.appName,
      headline: apps.headline,
      refineIssueNumber: apps.refineIssueNumber,
    })
    .from(apps)
    .where(and(eq(apps.id, body.appId), eq(apps.userId, user.id)))
    .limit(1);
  const app = rows[0];
  if (!app) {
    return NextResponse.json({ error: 'app_not_found' }, { status: 404 });
  }

  const repo = process.env.APPEE_CODEGEN_REPO;
  if (!repo || !process.env.APPEE_GITHUB_TOKEN) {
    return NextResponse.json({ error: 'misconfigured' }, { status: 503 });
  }

  // Already emitted — return existing issue URL idempotently (handles
  // double-click + retry without minting duplicates).
  if (typeof app.refineIssueNumber === 'number') {
    return NextResponse.json({
      issueNumber: app.refineIssueNumber,
      issueUrl: `https://github.com/${repo}/issues/${app.refineIssueNumber}`,
      reused: true,
    });
  }

  try {
    const result = await createGithubIssue({
      appId: app.id,
      appName: app.appName,
      headline: app.headline,
      pickedPattern: body.pickedPattern as PatternKey,
      summary: body.summary.slice(0, MAX_SUMMARY),
      recommendedPatterns: recommended,
      emittedBy: user.email ?? user.id,
      mockupHtml: typeof body.mockupHtml === 'string' ? body.mockupHtml.slice(0, MAX_HTML) : null,
      planMarkdown:
        typeof body.planMarkdown === 'string' ? body.planMarkdown.slice(0, MAX_PLAN) : null,
    });

    await db
      .update(apps)
      .set({ refineIssueNumber: result.issueNumber, updatedAt: new Date() })
      .where(eq(apps.id, app.id));

    return NextResponse.json(result);
  } catch (err) {
    if (isEmitError(err)) {
      if (err.kind === 'misconfigured') {
        return NextResponse.json({ error: 'misconfigured' }, { status: 503 });
      }
      if (err.kind === 'auth_failed') {
        return NextResponse.json({ error: 'github_auth_failed' }, { status: 502 });
      }
      return NextResponse.json({ error: 'github_failed', message: err.message }, { status: 502 });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'upstream_failed', message }, { status: 502 });
  }
}
