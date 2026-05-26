import 'server-only';
import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server-side Supabase client for use in RSC, Server Actions, and Route Handlers.
// Reads/writes cookies via Next.js's cookies() helper.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // RSCs can't mutate cookies — middleware handles refresh.
          }
        },
      },
    },
  );
}
