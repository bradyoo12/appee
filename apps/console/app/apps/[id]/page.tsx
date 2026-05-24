import { db } from '@/lib/db/client';
import { type AppStatus, apps } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';
import { and, eq } from 'drizzle-orm';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Loader2,
  Pencil,
  RefreshCcw,
  TriangleAlert,
} from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { updateHeadline } from './actions';

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

// Basic UUID v4-ish validation. Drizzle's uuid() column will reject malformed
// IDs at query time, but we short-circuit obvious 404s without a DB roundtrip.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AppDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { edit } = await searchParams;
  const isEditingHeadline = edit === 'headline';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Application-layer ownership check in addition to RLS — defense in depth.
  const rows = await db
    .select()
    .from(apps)
    .where(and(eq(apps.id, id), eq(apps.userId, user.id)))
    .limit(1);
  const app = rows[0];
  if (!app) notFound();

  const meta = STATUS_META[app.status];

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 font-mono uppercase tracking-widest"
      >
        <ArrowLeft className="w-3 h-3" /> 모든 앱
      </Link>

      <header className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-mono uppercase tracking-widest text-brand-700">
            my app · project
          </p>
          <h1 className="text-2xl font-bold tracking-tight mt-1 truncate">{app.appName}</h1>
          {isEditingHeadline ? (
            <form
              action={updateHeadline}
              className="mt-1 flex items-start gap-2"
              data-testid="headline-edit-form"
            >
              <input type="hidden" name="appId" value={app.id} />
              <textarea
                name="headline"
                rows={2}
                maxLength={120}
                defaultValue={app.headline}
                required
                aria-label="headline"
                className="flex-1 text-sm rounded-btn border border-brand-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
              />
              <div className="flex flex-col gap-1.5">
                <button
                  type="submit"
                  className="text-xs font-semibold rounded-btn bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 cursor-pointer"
                >
                  저장
                </button>
                <Link
                  href={`/apps/${app.id}`}
                  className="text-xs text-center rounded-btn border border-zinc-200 text-zinc-700 px-3 py-1.5 hover:bg-zinc-50"
                >
                  취소
                </Link>
              </div>
            </form>
          ) : (
            <div className="mt-1 flex items-start gap-2">
              <p className="text-sm text-zinc-600 line-clamp-2 flex-1">{app.headline}</p>
              <Link
                href={`/apps/${app.id}?edit=headline`}
                aria-label="headline 편집"
                data-testid="headline-edit-button"
                className="text-zinc-400 hover:text-zinc-900 p-1 rounded-btn hover:bg-zinc-100 flex-shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-full ${meta.klass} flex-shrink-0`}
        >
          {app.status === 'in_progress' && <Loader2 className="w-3 h-3 animate-spin" />}
          {app.status === 'preparing' && <RefreshCcw className="w-3 h-3" />}
          {app.status === 'ready' && <Download className="w-3 h-3" />}
          {app.status === 'build_failed' && <TriangleAlert className="w-3 h-3" />}
          {meta.label}
        </span>
      </header>

      <dl className="mt-6 grid grid-cols-3 gap-4 rounded-card border border-zinc-100 bg-zinc-50/60 p-4">
        <div className="min-w-0">
          <dt className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">package</dt>
          <dd className="font-mono text-[11px] text-zinc-700 mt-1 truncate">{app.packageName}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">created</dt>
          <dd className="font-mono text-[11px] text-zinc-700 mt-1">{timeAgo(app.createdAt)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">build</dt>
          <dd className="font-mono text-[11px] text-zinc-700 mt-1 truncate">
            {app.easBuildId ? `eas ${app.easBuildId.slice(0, 8)}` : '—'}
          </dd>
        </div>
      </dl>

      {app.status === 'build_failed' && app.errorMessage && (
        <p className="mt-3 rounded-card border border-red-200 bg-red-50 p-3 text-xs text-red-700 break-words">
          {app.errorMessage}
        </p>
      )}

      {app.heroVariant && (
        <p
          data-testid="hero-variant-badge"
          className="mt-3 inline-flex items-center gap-2 text-[11px] font-mono rounded-full bg-brand-50 text-brand-800 px-2.5 py-1"
        >
          hero: {app.heroVariant}
        </p>
      )}

      <Link
        href={`/reverse?card=1&appId=${app.id}`}
        className="mt-5 block rounded-card bg-gradient-to-br from-brand-500 to-accent-500 text-white p-5 shadow-warm transition-transform duration-200 hover:-translate-y-0.5"
      >
        <p className="text-[10px] font-mono uppercase tracking-widest text-white/80">next</p>
        <p className="text-lg font-bold mt-1">이 앱을 계속 다듬어볼까요?</p>
        <p className="text-sm text-white/90 mt-1">
          화면 · 기능 · 디자인을 한 카드씩 채워나갑니다. 매 변경은 즉시 폰에 반영돼요.
        </p>
        <span className="mt-4 inline-flex items-center gap-2 bg-white/95 text-brand-700 text-sm font-semibold rounded-btn px-4 py-2 shadow-sm">
          이 앱 계속 다듬기 <ArrowRight className="w-4 h-4" />
        </span>
      </Link>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {app.status === 'ready' && app.easBuildId ? (
          <Link
            href={`/install?id=${app.easBuildId}`}
            className="rounded-card border border-zinc-200 bg-white p-4 hover:border-zinc-300"
          >
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">install</p>
            <p className="text-sm font-medium mt-1">폰으로 가져가기 (QR)</p>
          </Link>
        ) : (
          <div className="rounded-card border border-dashed border-zinc-200 bg-zinc-50/50 p-4 opacity-60">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">install</p>
            <p className="text-sm text-zinc-500 mt-1">빌드 완료 시 활성화</p>
          </div>
        )}
        {app.easBuildId ? (
          <Link
            href={`/build?id=${app.easBuildId}`}
            className="rounded-card border border-zinc-200 bg-white p-4 hover:border-zinc-300"
          >
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              build log
            </p>
            <p className="text-sm font-medium mt-1">EAS 빌드 상세</p>
          </Link>
        ) : (
          <div className="rounded-card border border-dashed border-zinc-200 bg-zinc-50/50 p-4 opacity-60">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              build log
            </p>
            <p className="text-sm text-zinc-500 mt-1">EAS 큐잉 후 활성화</p>
          </div>
        )}
      </div>
    </main>
  );
}
