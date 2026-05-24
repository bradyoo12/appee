'use server';
import { db } from '@/lib/db/client';
import { apps } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const heroVariantSchema = z.enum(['warm', 'mini', 'list']);
const appIdSchema = z.string().uuid();

// Round-trip target for reverse-fill card 1 (#97). Validates ownership,
// writes the chosen variant onto the apps row, then sends the user back
// to the detail page where the badge reflects the change.
//
// Phone reflection (EAS Update) is intentionally NOT here — Slice 3+.
export async function updateHeroVariant(formData: FormData): Promise<void> {
  const appIdRaw = formData.get('appId');
  const variantRaw = formData.get('variant');

  const appId = appIdSchema.parse(appIdRaw);
  const variant = heroVariantSchema.parse(variantRaw);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Ownership guard — application-layer defense alongside RLS.
  // Affected-rows == 0 means the row isn't ours (or doesn't exist).
  const updated = await db
    .update(apps)
    .set({ heroVariant: variant, updatedAt: new Date() })
    .where(and(eq(apps.id, appId), eq(apps.userId, user.id)))
    .returning({ id: apps.id });

  if (updated.length === 0) {
    // Not the user's row; treat as 404 to avoid leaking existence.
    redirect('/dashboard');
  }

  revalidatePath(`/apps/${appId}`);
  redirect(`/apps/${appId}`);
}
