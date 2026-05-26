'use client';
import { createClient } from '@/lib/supabase/client';
import { Mail } from 'lucide-react';
import { useState, useTransition } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setError(error.message);
      else setSent(true);
    });
  }

  function handleGoogle() {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setError(error.message);
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-sm w-full">
        <p className="text-xs font-mono uppercase tracking-widest text-brand-700">
          step 1 · sign in
        </p>
        <h1 className="text-3xl font-bold tracking-tight mt-3">
          <span className="font-display italic text-brand-500">appee</span>에 들어가기
        </h1>
        <p className="text-sm text-zinc-600 mt-3">한 번 누르면 로그인 끝.</p>

        <div className="mt-8 flex flex-col items-stretch gap-3">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-zinc-50 disabled:bg-zinc-100 border border-zinc-300 text-zinc-900 font-semibold rounded-btn px-6 py-3 shadow-soft-sm transition-transform duration-200 hover:-translate-y-0.5 disabled:hover:translate-y-0 cursor-pointer disabled:cursor-not-allowed"
          >
            <GoogleG /> Google로 계속하기
          </button>
        </div>

        {sent ? (
          <div className="mt-6 rounded-card bg-emerald-50 border border-emerald-200 p-5 text-sm text-emerald-900 text-left">
            <p className="font-medium">메일함을 확인해주세요.</p>
            <p className="mt-1 text-emerald-700">
              <span className="font-mono">{email}</span>으로 매직 링크를 보냈어요.
            </p>
          </div>
        ) : (
          <>
            <div className="my-6 flex items-center gap-3 text-xs text-zinc-400">
              <span className="flex-1 h-px bg-zinc-200" />
              <span className="font-mono uppercase tracking-widest">or email</span>
              <span className="flex-1 h-px bg-zinc-200" />
            </div>
            <form onSubmit={handleEmailSubmit} className="flex flex-col items-stretch gap-3">
              <input
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="rounded-btn border border-zinc-200 bg-white px-3 py-3 text-sm shadow-soft-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:bg-zinc-400 text-white font-semibold rounded-btn px-6 py-3 shadow-warm transition-transform duration-200 hover:-translate-y-0.5 disabled:hover:translate-y-0 cursor-pointer disabled:cursor-not-allowed"
              >
                <Mail className="w-4 h-4" /> {isPending ? '보내는 중...' : '매직 링크 보내기'}
              </button>
              <p className="text-[11px] text-zinc-500">
                outlook.com 같은 메일에선 pre-fetch 때문에 깨질 수 있어요. Google 로그인 권장.
              </p>
            </form>
          </>
        )}

        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
      </div>
    </main>
  );
}

function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" role="img" aria-label="Google">
      <title>Google</title>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.5-5.9 7.7-11.3 7.7-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 2.9l5.7-5.7C34.2 6.5 29.4 4.6 24 4.6 12.9 4.6 4 13.5 4 24.6S12.9 44.6 24 44.6c11 0 20-8.9 20-20 0-1.3-.1-2.7-.4-4.1z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13.6 24 13.6c3 0 5.8 1.1 7.9 2.9l5.7-5.7C34.2 6.5 29.4 4.6 24 4.6c-7.7 0-14.4 4.3-17.7 10.6z"
      />
      <path
        fill="#4CAF50"
        d="M24 44.6c5.3 0 10.1-1.8 13.8-4.9l-6.4-5.4c-2.1 1.4-4.7 2.3-7.4 2.3-5.4 0-9.9-3.1-11.4-7.7l-6.5 5C9.4 40.1 16.1 44.6 24 44.6z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.3l6.4 5.4C40.5 35 44 30 44 24.6c0-1.3-.1-2.7-.4-4.1z"
      />
    </svg>
  );
}
