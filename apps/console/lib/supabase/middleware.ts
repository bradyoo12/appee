import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Called from middleware.ts on every request. Refreshes the auth session if
// needed and sets updated cookies on the response. Without this, server
// components see stale auth state after token expiry.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Touch the user — triggers token refresh if needed.
  await supabase.auth.getUser();

  return response;
}
