'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const STEPS = [
  {
    title: 'Setup workspace',
    detail: (
      <>
        Cloning <span className="font-mono">templates/expo-base</span>, substituting{' '}
        <span className="font-mono">{'{{HEADLINE}}'}</span>
      </>
    ),
  },
  { title: 'Bundle JavaScript', detail: 'Metro · 124 modules · NativeWind compile' },
  { title: 'Compile native (Android)', detail: 'Gradle assembleRelease · cached deps' },
  { title: 'Sign & package APK', detail: 'Internal distribution · QR-installable' },
  { title: 'Done — 폰으로 보내기', detail: 'QR + install_url 발급' },
] as const;

const FIXTURE_BUILD_ID = '9866e401-0a52-46aa-b715-3072225fad3d';
const POLL_INTERVAL_MS = 3000;
const FINISH_GRACE_MS = 1500;

type BuildStatus = 'NEW' | 'IN_QUEUE' | 'IN_PROGRESS' | 'FINISHED' | 'ERRORED' | 'CANCELED';

function statusToActiveIndex(status: BuildStatus): number {
  switch (status) {
    case 'NEW':
    case 'IN_QUEUE':
      return 0;
    case 'IN_PROGRESS':
      return 2;
    case 'FINISHED':
      return STEPS.length;
    case 'ERRORED':
    case 'CANCELED':
      return -1;
  }
}

function BuildPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const buildId = searchParams.get('id') ?? FIXTURE_BUILD_ID;

  const [status, setStatus] = useState<BuildStatus>('NEW');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/builds/${buildId}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { status: BuildStatus };
        if (cancelled) return;
        setStatus(data.status);

        if (data.status === 'FINISHED') {
          setTimeout(() => {
            if (!cancelled) router.push(`/install?id=${buildId}`);
          }, FINISH_GRACE_MS);
          return;
        }
        if (data.status === 'ERRORED' || data.status === 'CANCELED') return;

        timer = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'unknown');
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [buildId, router]);

  const activeIndex = statusToActiveIndex(status);
  const progressPct = status === 'FINISHED' ? 100 : Math.min(100, (activeIndex + 1) * 20);

  return (
    <main className="min-h-screen flex items-start justify-center px-6 py-16">
      <div className="max-w-2xl w-full">
        <div className="rounded-card bg-white border border-zinc-100 shadow-soft-sm p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono uppercase tracking-widest text-brand-700">Step 4 · build</p>
            <span className="text-[11px] font-mono text-zinc-400">
              eas-build · {buildId.slice(0, 8)} · {status.toLowerCase()}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-3">앱을 빚는 중...</h1>
          <p className="text-sm text-zinc-600 mt-1">
            {error
              ? `EAS 연결 실패: ${error}`
              : '평균 7–12분. 그동안 인터뷰부터 시작할게요.'}
          </p>

          <ol className="mt-6 space-y-4">
            {STEPS.map((step, i) => {
              const state: 'done' | 'active' | 'pending' =
                i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending';
              const dotClass =
                state === 'active'
                  ? 'bg-brand-500 ring-[5px] ring-brand-500/15'
                  : state === 'done'
                    ? 'bg-emerald-500'
                    : 'bg-zinc-200';
              return (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 block rounded-full flex-shrink-0 transition-all duration-200 ${dotClass}`}
                    style={{ width: 10, height: 10 }}
                  />
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="text-xs text-zinc-500">{step.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 h-[3px] bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-accent-500 transition-[width] duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function BuildPage() {
  return (
    <Suspense>
      <BuildPageInner />
    </Suspense>
  );
}
