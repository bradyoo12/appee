import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { subscriptions } from '@/lib/db/schema';

// Returns true if the user has a subscription row whose status is one
// the rest of the app treats as "billable / usable". Single source of
// truth — both the Server Action (page.tsx) and the API route
// (api/builds/create) call this before reaching createAndroidBuild.
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const [sub] = await db
    .select({ status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return sub?.status === 'trialing' || sub?.status === 'active';
}
