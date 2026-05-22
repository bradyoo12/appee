'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

const STEP_DURATION_MS = 2000;
const NAVIGATE_DELAY_MS = 800;

export default function BuildPage() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (activeIndex >= STEPS.length) {
      const t = setTimeout(() => router.push('/install'), NAVIGATE_DELAY_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setActiveIndex((i) => i + 1), STEP_DURATION_MS);
    return () => clearTimeout(t);
  }, [activeIndex, router]);

  const progressPct =
    activeIndex >= STEPS.length ? 100 : Math.min(100, (activeIndex + 1) * 20);

  return (
    <main className="min-h-screen flex items-start justify-center px-6 py-16">
      <div className="max-w-2xl w-full">
        <div className="rounded-card bg-white border border-zinc-100 shadow-soft-sm p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono uppercase tracking-widest text-brand-700">Step 4 · build</p>
            <span className="text-[11px] font-mono text-zinc-400">eas-build · profile: preview · android · apk</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-3">앱을 빚는 중...</h1>
          <p className="text-sm text-zinc-600 mt-1">평균 1–3분. 그동안 인터뷰부터 시작할게요.</p>

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
