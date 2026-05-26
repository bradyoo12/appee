import 'server-only';
import { db } from '@/lib/db/client';
import { type SubscriptionStatus, buildUsage, subscriptions } from '@/lib/db/schema';
import { and, count, eq, gte } from 'drizzle-orm';

// Per-month EAS build quota by subscription status. Anything not in this
// map (no row, past_due, canceled, etc.) is 0 — gating up the stack
// blocks the trigger entirely.
const LIMITS: Partial<Record<SubscriptionStatus, number>> = {
  trialing: 5,
  active: 30,
};

export type Quota = {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: Date; // first day of next calendar month, UTC
  tier: SubscriptionStatus | null;
};

function startOfCurrentMonthUTC(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function startOfNextMonthUTC(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export async function getMonthlyQuota(userId: string): Promise<Quota> {
  const [sub] = await db
    .select({ status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  const tier = sub?.status ?? null;
  const limit = tier ? (LIMITS[tier] ?? 0) : 0;

  const since = startOfCurrentMonthUTC();
  const [row] = await db
    .select({ c: count() })
    .from(buildUsage)
    .where(and(eq(buildUsage.userId, userId), gte(buildUsage.succeededAt, since)));
  const used = row?.c ?? 0;

  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    resetsAt: startOfNextMonthUTC(),
    tier,
  };
}

// Convenience for the gating call sites that don't need the breakdown.
export async function canBuild(userId: string): Promise<boolean> {
  const q = await getMonthlyQuota(userId);
  return q.remaining > 0;
}
