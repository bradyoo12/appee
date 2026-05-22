import { triggerEasAndroidBuild } from '@/lib/eas/createBuild';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const result = await triggerEasAndroidBuild();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
