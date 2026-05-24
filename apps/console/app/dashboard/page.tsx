import Link from 'next/link';
import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { Download, Loader2, RefreshCcw, TriangleAlert, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { apps, type App, type AppStatus } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

const STATUS_META: Record<AppStatus, { label: string; klass: string }> = {
  preparing: { label: 'preparing', klass: 'bg-zinc-100 text-zinc-700' },
  in_progress: { label: 'building', klass: 'bg-brand-100 text-brand-800' },
  ready: { label: 'ready', klass: 'bg-emerald-100 text-emerald-800' },
  build_failed: { label: 'failed', klass: 'bg-red-100 text-red-800' },
  canceled: { label: 'canceled', klass: 'bg-zinc-200 text-zinc-700' },
};

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return `${s}s 전`;
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
}

function destinationFor(a: App): string | null {
  if (a.status === 'ready' && a.easBuildId) return `/install?id=${a.easBuildId}`;
  if (a.status === 'in_progress' && a.easBuildId) return `/build?id=${a.easBuildId}`;
  if (a.status === 'preparing' && a.easBuildId) return `/build?id=${a.easBuildId}`;
  return null;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const myApps = await db
    .select()
    .from(apps)
    .where(eq(apps.userId, user.id))
    .orderBy(desc(apps.createdAt))
    .limit(50);

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-brand-700">my apps</p>
          <h1 className="text-2xl font-bold tracking-tight mt-1">내가 빌드한 앱들</h1>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-btn px-4 py-2 shadow-warm transition-transform duration-200 hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" /> 새 앱
        </Link>
      </header>

      <div className="mt-6 space-y-3">
        {myApps.length === 0 ? (
          <div className="rounded-card border border-dashed border-zinc-300 bg-zinc-50/60 p-8 text-center text-sm text-zinc-600">
            아직 만든 앱이 없어요.{' '}
            <Link href="/" className="text-brand-700 hover:underline">
              첫 앱 만들기
            </Link>
          </div>
        ) : (
          myApps.map((a) => {
            const meta = STATUS_META[a.status];
            const dest = destinationFor(a);
            const card = (
              <article className="rounded-card bg-white border border-zinc-100 shadow-soft-sm p-5 hover:shadow-soft-md transition-shadow">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold truncate flex-1">{a.appName}</p>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full ${meta.klass}`}
                  >
                    {a.status === 'in_progress' && <Loader2 className="w-3 h-3 animate-spin" />}
                    {a.status === 'preparing' && <RefreshCcw className="w-3 h-3" />}
                    {a.status === 'ready' && <Download className="w-3 h-3" />}
                    {a.status === 'build_failed' && <TriangleAlert className="w-3 h-3" />}
                    {meta.label}
                  </span>
                </div>
                <p className="text-sm text-zinc-600 mt-1 line-clamp-2">{a.headline}</p>
                <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span>{a.packageName}</span>
                  <span>{timeAgo(a.createdAt)}</span>
                </div>
                {a.status === 'build_failed' && a.errorMessage && (
                  <p className="mt-2 text-xs text-red-600 break-words">{a.errorMessage}</p>
                )}
              </article>
            );
            return dest ? (
              <Link key={a.id} href={dest} className="block">
                {card}
              </Link>
            ) : (
              <div key={a.id}>{card}</div>
            );
          })
        )}
      </div>
    </main>
  );
}
