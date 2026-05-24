import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { apps, buildUsage } from '@/lib/db/schema';

// EAS Build webhook landing point. EAS POSTs here when a build hits a
// terminal state (FINISHED / ERRORED / CANCELED). We:
//   - HMAC-SHA1 verify expo-signature against EAS_WEBHOOK_SECRET
//   - Update the matching apps row (status / install_url / error)
//   - On FINISHED only: idempotent insert into build_usage (billing meter)
//
// EAS retries with exponential backoff on non-2xx, so the handler is
// idempotent: build_usage uses eas_build_id unique constraint +
// onConflictDoNothing, apps update is naturally idempotent.

// Body shape per https://docs.expo.dev/eas/webhooks/#payload — fields we
// actually read; .passthrough so unknown fields don't fail parsing.
const EasWebhookPayload = z
  .object({
    id: z.string(),
    status: z.enum(['finished', 'errored', 'canceled']),
    artifacts: z
      .object({
        buildUrl: z.string().url().optional(),
      })
      .nullish(),
    error: z
      .object({
        message: z.string().optional(),
      })
      .nullish(),
    metrics: z
      .object({
        buildEndTimestamp: z.number().optional(),
        buildStartTimestamp: z.number().optional(),
      })
      .nullish(),
  })
  .passthrough();

function verifySignature(body: string, sigHeader: string | null, secret: string): boolean {
  if (!sigHeader) return false;
  // expo-signature is of the form "sha1=<hex>"
  const match = /^sha1=([a-f0-9]+)$/i.exec(sigHeader);
  const hex = match?.[1];
  if (!hex) return false;
  const provided = Buffer.from(hex, 'hex');
  const computed = createHmac('sha1', secret).update(body).digest();
  if (provided.length !== computed.length) return false;
  return timingSafeEqual(provided, computed);
}

export async function POST(req: Request) {
  const secret = process.env.EAS_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'EAS_WEBHOOK_SECRET not set' }, { status: 500 });
  }

  const raw = await req.text();
  const sig = req.headers.get('expo-signature');
  if (!verifySignature(raw, sig, secret)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const parsed = EasWebhookPayload.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid payload', issues: parsed.error.issues }, { status: 400 });
  }
  const ev = parsed.data;

  // Look up the apps row by eas_build_id.
  const [app] = await db.select().from(apps).where(eq(apps.easBuildId, ev.id)).limit(1);
  if (!app) {
    // Orphan webhook — build was triggered outside this console, or the
    // apps row was deleted. Log + 200 so EAS doesn't retry forever.
    console.warn(`EAS webhook for unknown build ${ev.id}`);
    return NextResponse.json({ received: true, note: 'orphan' });
  }

  if (ev.status === 'finished') {
    const installUrl = ev.artifacts?.buildUrl ?? null;
    await db
      .update(apps)
      .set({ status: 'ready', installUrl, updatedAt: new Date() })
      .where(eq(apps.id, app.id));

    const duration =
      ev.metrics?.buildEndTimestamp && ev.metrics?.buildStartTimestamp
        ? Math.floor((ev.metrics.buildEndTimestamp - ev.metrics.buildStartTimestamp) / 1000)
        : null;
    await db
      .insert(buildUsage)
      .values({
        userId: app.userId,
        appId: app.id,
        easBuildId: ev.id,
        buildDurationSeconds: duration ?? undefined,
      })
      .onConflictDoNothing({ target: buildUsage.easBuildId });
  } else if (ev.status === 'errored') {
    await db
      .update(apps)
      .set({
        status: 'build_failed',
        errorMessage: ev.error?.message ?? null,
        updatedAt: new Date(),
      })
      .where(eq(apps.id, app.id));
  } else if (ev.status === 'canceled') {
    await db
      .update(apps)
      .set({ status: 'canceled', updatedAt: new Date() })
      .where(eq(apps.id, app.id));
  }

  return NextResponse.json({ received: true });
}
