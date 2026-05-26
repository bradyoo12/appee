import { getBuild } from '@/lib/eas/queries';
import { Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const FIXTURE_BUILD_ID = '9866e401-0a52-46aa-b715-3072225fad3d';

export default async function InstallPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const buildId = id ?? FIXTURE_BUILD_ID;

  let installUrl: string;
  let label: string;
  try {
    const build = await getBuild(buildId);
    installUrl = build.artifacts?.buildUrl ?? `https://expo.dev/builds/${buildId}`;
    label = installUrl.replace(/^https?:\/\//, '');
  } catch {
    installUrl = `https://expo.dev/builds/${buildId}`;
    label = `EAS 조회 실패 — fallback: ${buildId.slice(0, 8)}...`;
  }

  return (
    <main className="min-h-screen flex items-start justify-center px-6 py-16">
      <div className="max-w-3xl w-full text-center">
        <p className="text-xs font-mono uppercase tracking-widest text-emerald-700">
          Step 5 · install
        </p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-2">
          폰으로 가져갈 시간이에요.
        </h1>
        <p className="text-sm text-zinc-600 mt-2">
          Android 폰의 카메라로 QR을 스캔하면 APK가 바로 설치됩니다.
          <br />
          iOS는 Slice 5에서 TestFlight로 지원돼요.
        </p>

        <div className="mt-8 grid md:grid-cols-[auto_1fr] gap-8 items-center justify-items-center">
          <div className="bg-white border border-zinc-200 rounded-card p-6 shadow-soft-md inline-flex flex-col items-center gap-3 max-w-[248px]">
            <QRCodeSVG value={installUrl} size={200} />
            <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 break-all text-center">
              {label}
            </p>
          </div>

          <ol className="text-left text-sm text-zinc-700 space-y-3 max-w-sm">
            {[
              '폰 카메라로 왼쪽 QR을 스캔합니다.',
              '"알 수 없는 출처 허용"을 한 번 켜고 APK를 다운로드합니다.',
              '앱이 깔리면 한 번 열어서 첫 사용량을 기록합니다.',
            ].map((text, i) => (
              <li key={text} className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
        </div>

        <button
          type="button"
          className="mt-10 inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-btn px-5 py-3 transition-transform duration-200 hover:-translate-y-0.5"
        >
          <Check className="w-4 h-4" /> 설치 완료했어요
        </button>
      </div>
    </main>
  );
}
