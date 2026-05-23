'use client';
import { useState, useTransition } from 'react';
import { Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-sm w-full">
        <p className="text-xs font-mono uppercase tracking-widest text-brand-700">step 1 · sign in</p>
        <h1 className="text-3xl font-bold tracking-tight mt-3">
          <span className="font-display italic text-brand-500">appee</span>에 들어가기
        </h1>
        <p className="text-sm text-zinc-600 mt-3">
          이메일을 적으면 매직 링크를 보내드려요. 비밀번호 없음.
        </p>

        {sent ? (
          <div className="mt-8 rounded-card bg-emerald-50 border border-emerald-200 p-5 text-sm text-emerald-900 text-left">
            <p className="font-medium">메일함을 확인해주세요.</p>
            <p className="mt-1 text-emerald-700">
              <span className="font-mono">{email}</span>으로 매직 링크를 보냈어요. 링크를 누르면 로그인 완료.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col items-stretch gap-3">
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
            {error && <p className="text-xs text-red-600 text-left">{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
