import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-xl">
        <p className="text-xs font-mono uppercase tracking-widest text-brand-700">step 0 · deploy</p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mt-3">
          당신의 첫 앱을 <span className="font-display italic text-brand-500">5분</span>에.
        </h1>
        <p className="text-sm text-zinc-600 mt-3">
          hello world 템플릿을 EAS Build에 보내서 폰에 설치할 수 있는 APK로 만듭니다.
          <br />
          이 단계는 아직 mockup — 실제 EAS 트리거는 다음 슬라이스에서 연결됩니다.
        </p>
        <Link
          href="/build"
          className="mt-8 inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-btn px-6 py-3 shadow-warm transition-transform duration-200 hover:-translate-y-0.5"
        >
          Deploy hello world <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </main>
  );
}
