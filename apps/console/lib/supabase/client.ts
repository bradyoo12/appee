'use client';
import { createBrowserClient } from '@supabase/ssr';

// Browser-side Supabase client for use in client components and form handlers.
// Cookies sync automatically with the server via @supabase/ssr.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  );
}
