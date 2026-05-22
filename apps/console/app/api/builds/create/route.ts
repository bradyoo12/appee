import { triggerEasAndroidBuild } from '@/lib/eas/createBuild';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { headline?: string };
    const headline = body.headline?.trim() || 'Hello, appee';
    const result = await triggerEasAndroidBuild({ headline });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
