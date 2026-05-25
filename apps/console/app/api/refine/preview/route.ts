import { db } from '@/lib/db/client';
import { apps } from '@/lib/db/schema';
import { PATTERN_KEYS, type PatternKey } from '@/lib/refine/anthropic';
import { type PreviewMessage, runRefinePreview } from '@/lib/refine/preview';
import { REFINE_DAILY_LIMIT, incrementAndGetCount, quotaFromCount } from '@/lib/refine/rateLimit';
import { createClient } from '@/lib/supabase/server';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MESSAGES = 40;
const MAX_CONTENT_CHARS = 4000;
const MAX_REVISION_CHARS = 1000;
const MAX_PREVIOUS_HTML_CHARS = 20000;

type Body = {
  appId?: string;
  pickedPattern?: string;
  summary?: string;
  messages?: unknown;
  revisionRequest?: string;
  previousMockupHtml?: string;
  previousPlanMarkdown?: string;
};

function parseMessages(raw: unknown): PreviewMessage[] | null {
  if (!Array.isArray(raw)) return null;
  const out: PreviewMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== 'user' && role !== 'assistant') return null;
    if (typeof content !== 'string' || content.length === 0) return null;
    out.push({ role, content: content.slice(0, MAX_CONTENT_CHARS) });
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
  const messages = parseMessages(body.messages);
  if (!messages || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return NextResponse.json({ error: 'invalid_messages' }, { status: 400 });
  }

  const rows = await db
    .select({ appName: apps.appName, headline: apps.headline })
    .from(apps)
    .where(and(eq(apps.id, body.appId), eq(apps.userId, user.id)))
    .limit(1);
  const app = rows[0];
  if (!app) {
    return NextResponse.json({ error: 'app_not_found' }, { status: 404 });
  }

  const count = await incrementAndGetCount(user.id);
  if (count > REFINE_DAILY_LIMIT) {
    const quota = quotaFromCount(count);
    return NextResponse.json(
      {
        error: 'rate_limited',
        used: quota.used,
        limit: quota.limit,
        resets_at: quota.resetsAt,
      },
      { status: 429 },
    );
  }

  try {
    const result = await runRefinePreview({
      appName: app.appName,
      appHeadline: app.headline,
      pickedPattern: body.pickedPattern as PatternKey,
      summary: body.summary,
      messages,
      revisionRequest:
        typeof body.revisionRequest === 'string'
          ? body.revisionRequest.slice(0, MAX_REVISION_CHARS)
          : undefined,
      previousMockupHtml:
        typeof body.previousMockupHtml === 'string'
          ? body.previousMockupHtml.slice(0, MAX_PREVIOUS_HTML_CHARS)
          : undefined,
      previousPlanMarkdown:
        typeof body.previousPlanMarkdown === 'string'
          ? body.previousPlanMarkdown.slice(0, MAX_PREVIOUS_HTML_CHARS)
          : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'upstream_failed', message }, { status: 502 });
  }
}
