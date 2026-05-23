import { triggerEasAndroidBuild } from '@/lib/eas/createBuild';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
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
