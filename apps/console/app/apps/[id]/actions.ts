'use server';
import { deriveAppName } from '@/lib/apps/derive';
import { db } from '@/lib/db/client';
import { apps } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

// 120 matches the textarea maxLength on / (HomePage) — keep both in sync if
// either changes. Lower bound is "trim() length >= 1" so users can't
// accidentally blank the headline.
const headlineSchema = z
  .string()
  .trim()
  .min(1, 'headline cannot be empty')
  .max(120, 'headline too long');
const appIdSchema = z.string().uuid();

export async function updateHeadline(formData: FormData): Promise<void> {
  const appId = appIdSchema.parse(formData.get('appId'));
  const headline = headlineSchema.parse(formData.get('headline'));
  const appName = deriveAppName(headline);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Ownership guard — affected rows == 0 means the row isn't ours.
  // Treat as 404 to avoid leaking existence (same pattern as #97).
  const updated = await db
    .update(apps)
    .set({ headline, appName, updatedAt: new Date() })
    .where(and(eq(apps.id, appId), eq(apps.userId, user.id)))
    .returning({ id: apps.id });

  if (updated.length === 0) {
    redirect('/dashboard');
  }

  revalidatePath(`/apps/${appId}`);
  redirect(`/apps/${appId}`);
}
