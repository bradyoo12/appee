import { triggerEasAndroidBuild } from '@/lib/eas/createBuild';
import { createClient } from '@/lib/supabase/server';
import { getMonthlyQuota } from '@/lib/billing/quota';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const quota = await getMonthlyQuota(user.id);
  if (quota.tier === null) {
    return NextResponse.json({ error: 'subscription_required' }, { status: 402 });
  }
  if (quota.remaining === 0) {
    return NextResponse.json(
      { error: 'quota_exceeded', used: quota.used, limit: quota.limit, resets_at: quota.resetsAt },
      { status: 429 },
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { headline?: string };
    const headline = body.headline?.trim() || 'Hello, appee';
    const result = await triggerEasAndroidBuild({
      headline,
      userId: user.id,
      userEmail: user.email ?? null,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
