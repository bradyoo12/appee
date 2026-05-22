import { ArrowLeft, BatteryFull, Info, Signal } from 'lucide-react';

const CARD_ONE = {
  title: '카드 ① 메인 화면의 hero',
  subtitle: '한 줄을 화면으로. 3가지 시안 중 하나.',
  options: [
    { label: '따뜻한 카드 + 큰 CTA', preview: 'hero-warm' },
    { label: '미니멀 + 보라 그라데이션', preview: 'hero-mini' },
    { label: '리스트 + 통계', preview: 'hero-list' },
  ],
};

const TOTAL_CARDS = 8;

export default function ReversePage() {
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
              <span>1</span> / {TOTAL_CARDS}
            </div>
          </div>

          <div className="flex items-center gap-1.5 mb-5">
            {Array.from({ length: TOTAL_CARDS }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === 0 ? 'bg-brand-500' : 'bg-zinc-200'
                }`}
                style={{ width: i === 0 ? 24 : 14 }}
              />
            ))}
          </div>

          <div className="rounded-card bg-white border border-zinc-100 shadow-soft-md p-6">
            <p className="text-[10px] font-mono uppercase tracking-widest text-brand-700">Recommended next</p>
            <h3 className="text-2xl font-bold tracking-tight mt-1.5">{CARD_ONE.title}</h3>
            <p className="text-sm text-zinc-600 mt-1">{CARD_ONE.subtitle}</p>

            <div className="mt-5 grid sm:grid-cols-3 gap-3">
              {CARD_ONE.options.map((o, i) => (
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
            <button
              type="button"
              className="text-sm text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> 이전 카드
            </button>
            <button type="button" className="text-sm text-zinc-500 hover:text-zinc-900">
              건너뛰기 →
            </button>
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
