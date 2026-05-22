import { ArrowLeft, BatteryFull, Info, Signal } from 'lucide-react';
import Link from 'next/link';

type Card = {
  title: string;
  subtitle: string;
  options: Array<{ label: string; preview: string }>;
};

const CARDS: Card[] = [
  {
    title: '카드 ① 메인 화면의 hero',
    subtitle: '한 줄을 화면으로. 3가지 시안 중 하나.',
    options: [
      { label: '따뜻한 카드 + 큰 CTA', preview: 'hero-warm' },
      { label: '미니멀 + 보라 그라데이션', preview: 'hero-mini' },
      { label: '리스트 + 통계', preview: 'hero-list' },
    ],
  },
  {
    title: '카드 ② 두 번째 화면',
    subtitle: '자주 할 행동 하나를 화면으로.',
    options: [
      { label: '세션 진행 화면 (3분 호흡)', preview: 'screen-session' },
      { label: '기록 일지', preview: 'screen-journal' },
      { label: '주간 리포트', preview: 'screen-report' },
    ],
  },
  {
    title: '카드 ③ 정보 구조',
    subtitle: '탭 vs 스택. 인터뷰 5(빈도)·1(누구) 기반 추천.',
    options: [
      { label: '하단 탭 3개 (홈 / 기록 / 설정) — 추천', preview: 'nav-tabs' },
      { label: '스택만 (단일 흐름)', preview: 'nav-stack' },
      { label: '사이드 메뉴', preview: 'nav-side' },
    ],
  },
  {
    title: '카드 ④ 데이터',
    subtitle: '어디에 저장할까요?',
    options: [
      { label: '로컬 (디바이스 안에만)', preview: 'data-local' },
      { label: '계정 동기화 (클라우드) — 추천', preview: 'data-sync' },
      { label: '공개 공유 (링크)', preview: 'data-public' },
    ],
  },
  {
    title: '카드 ⑤ 통합',
    subtitle: '필요한 것만.',
    options: [
      { label: '알림 + 캘린더 — 추천', preview: 'int-notif' },
      { label: '알림만', preview: 'int-notif-only' },
      { label: '추가 안 함', preview: 'int-none' },
    ],
  },
  {
    title: '카드 ⑥ 디자인 토큰',
    subtitle: '컨텍스트 기반 자동 — microadjust만.',
    options: [
      { label: 'Warm orange + serif accent — 추천', preview: 'tok-warm' },
      { label: 'Calm violet + sans', preview: 'tok-calm' },
      { label: 'Mono + neutral', preview: 'tok-mono' },
    ],
  },
  {
    title: '카드 ⑦ 컨셉 / 이름 / 아이콘',
    subtitle: 'AI가 만든 후보 3개.',
    options: [
      { label: '아침 명상 · ☀️ — 추천', preview: 'name-1' },
      { label: '호흡 노트 · 🫁', preview: 'name-2' },
      { label: '고요 · 🌙', preview: 'name-3' },
    ],
  },
  {
    title: '카드 ⑧ 운영화',
    subtitle: '스토어 출시 결정.',
    options: [
      { label: 'TestFlight + Play Internal 동시 — 추천', preview: 'launch-both' },
      { label: 'Play Internal 먼저', preview: 'launch-android' },
      { label: '아직 안 함', preview: 'launch-none' },
    ],
  },
];

function clampIndex(raw: string | undefined): number {
  const n = raw ? Number.parseInt(raw, 10) : 1;
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(n, 1), CARDS.length);
}

export default async function ReversePage({
  searchParams,
}: {
  searchParams: Promise<{ card?: string }>;
}) {
  const { card } = await searchParams;
  const idx = clampIndex(card);
  const current = CARDS[idx - 1] as Card;
  const cIdx = idx - 1;

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_320px] gap-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-brand-700">Step 7 · reverse fill</p>
              <h2 className="text-2xl font-bold tracking-tight mt-1">다음에 채울 것</h2>
              <p className="text-xs text-zinc-500 mt-1">한 번에 한 카드. 적용은 즉시 폰에 반영돼요.</p>
            </div>
            <div className="text-xs font-mono text-zinc-500">
              <span>{idx}</span> / {CARDS.length}
            </div>
          </div>

          <div className="flex items-center gap-1.5 mb-5">
            {CARDS.map((_, i) => {
              const isActive = i === cIdx;
              const isDone = i < cIdx;
              const bg = isActive ? 'bg-brand-500' : isDone ? 'bg-emerald-400' : 'bg-zinc-200';
              return (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${bg}`}
                  style={{ width: isActive ? 24 : 14 }}
                />
              );
            })}
          </div>

          <div className="rounded-card bg-white border border-zinc-100 shadow-soft-md p-6">
            <p className="text-[10px] font-mono uppercase tracking-widest text-brand-700">Recommended next</p>
            <h3 className="text-2xl font-bold tracking-tight mt-1.5">{current.title}</h3>
            <p className="text-sm text-zinc-600 mt-1">{current.subtitle}</p>

            <div className="mt-5 grid sm:grid-cols-3 gap-3">
              {current.options.map((o, i) => (
                <button
                  key={o.preview}
                  type="button"
                  className={`text-left rounded-card border p-3 transition-transform duration-200 hover:-translate-y-0.5 ${
                    i === 0 ? 'border-brand-400 bg-brand-50/30' : 'border-zinc-200 hover:border-zinc-300 bg-white'
                  }`}
                >
                  <div className="aspect-[3/4] rounded-md bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center text-xs text-zinc-500 font-mono">
                    {o.preview}
                  </div>
                  <p className="mt-2 text-sm font-medium">{o.label}</p>
                  {i === 0 ? (
                    <p className="text-[10px] font-mono uppercase tracking-widest text-brand-700 mt-1">recommended</p>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="mt-5 text-xs text-zinc-500 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              적용은 즉시 폰에 반영됩니다. <span className="font-mono">EAS Update</span> (JS) 또는{' '}
              <span className="font-mono">EAS Build</span> (네이티브 변경 시).
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            {idx > 1 ? (
              <Link
                href={`/reverse?card=${idx - 1}`}
                className="text-sm text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> 이전 카드
              </Link>
            ) : (
              <span className="text-sm text-zinc-300 inline-flex items-center gap-1 cursor-default select-none">
                <ArrowLeft className="w-3.5 h-3.5" /> 이전 카드
              </span>
            )}
            {idx < CARDS.length ? (
              <Link
                href={`/reverse?card=${idx + 1}`}
                className="text-sm text-zinc-500 hover:text-zinc-900"
              >
                건너뛰기 →
              </Link>
            ) : (
              <span className="text-sm text-zinc-300 cursor-default select-none">건너뛰기 →</span>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 self-start">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-2 text-center">
            your phone · live mirror
          </p>
          <div className="phone mx-auto">
            <div className="phone-screen">
              <div className="phone-statusbar">
                <span>14:23</span>
                <span className="flex items-center gap-1">
                  <Signal className="w-3 h-3" />
                  <BatteryFull className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="phone-content">
                <div className="p-5 flex flex-col h-full">
                  <h3 className="text-lg font-bold">아침 명상</h3>
                  <p className="text-xs text-zinc-500">오늘의 호흡 · 7:00 AM</p>
                  <div className="mt-5 rounded-card bg-gradient-to-br from-brand-500 to-accent-500 text-white p-5 shadow-warm">
                    <p className="text-xs opacity-90 uppercase tracking-widest font-mono">Today</p>
                    <p className="text-3xl font-bold mt-1">호흡 4-7-8</p>
                    <p className="text-sm opacity-90 mt-2">3분이면 충분해요.</p>
                    <button
                      type="button"
                      className="mt-4 bg-white/95 text-brand-700 text-sm font-semibold rounded-btn px-3.5 py-2"
                    >
                      시작하기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
