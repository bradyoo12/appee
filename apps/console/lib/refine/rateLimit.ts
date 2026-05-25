import 'server-only';
import { db } from '@/lib/db/client';
import { refineUsage } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

// Soft daily cap on refine chat messages per user. Sized to be invisible
// to real usage (a heavy session is ~20–30 messages); only abuse trips it.
export const REFINE_DAILY_LIMIT = 300;

export type RefineQuota = {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: Date;
};

function startOfTomorrowUTC(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

function todayDateString(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Atomic increment + read. Returns the post-increment count, so the caller
// can reject if it now exceeds the limit (the row write is fine — it just
// means subsequent calls keep hitting the limit until the day rolls over).
export async function incrementAndGetCount(userId: string): Promise<number> {
  const day = todayDateString();
  const rows = await db
    .insert(refineUsage)
    .values({ userId, day, count: 1 })
    .onConflictDoUpdate({
      target: [refineUsage.userId, refineUsage.day],
      set: { count: sql`${refineUsage.count} + 1` },
    })
    .returning({ count: refineUsage.count });
  return rows[0]?.count ?? 1;
}

export function quotaFromCount(count: number): RefineQuota {
  return {
    used: count,
    limit: REFINE_DAILY_LIMIT,
    remaining: Math.max(0, REFINE_DAILY_LIMIT - count),
    resetsAt: startOfTomorrowUTC(),
  };
}
