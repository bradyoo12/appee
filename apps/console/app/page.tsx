import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { triggerEasAndroidBuild } from '@/lib/eas/createBuild';

async function deploy(formData: FormData) {
  'use server';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const raw = formData.get('headline');
  const headline = (typeof raw === 'string' && raw.trim()) || 'Hello, appee';
  const { buildId } = await triggerEasAndroidBuild({
    headline,
    userId: user.id,
    userEmail: user.email ?? null,
  });
  redirect(`/build?id=${buildId}`);
}

async function signOut() {
  'use server';
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen flex items-center justify-center px-6 relative">
      {user && (
        <div className="absolute top-4 right-4 flex items-center gap-3 text-xs text-zinc-500">
          <span className="font-mono">{user.email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900 cursor-pointer"
            >
              <LogOut className="w-3 h-3" /> sign out
            </button>
          </form>
        </div>
      )}

      <div className="text-center max-w-xl w-full">
        <p className="text-xs font-mono uppercase tracking-widest text-brand-700">step 0 · deploy</p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mt-3">
          당신의 첫 앱을 <span className="font-display italic text-brand-500">5분</span>에.
        </h1>
        <p className="text-sm text-zinc-600 mt-3">
          한 줄을 적으면 폰 화면 가운데에 그대로 떠요. 클릭하면 실제 EAS 빌드 한 개가 큐잉됩니다.
        </p>

        {user ? (
          <form action={deploy} className="mt-8 flex flex-col items-center gap-4">
            <textarea
              name="headline"
              rows={2}
              maxLength={120}
              defaultValue="매일 아침 부드럽게 명상을 알려주는 앱"
              placeholder="예: 매일 아침 부드럽게 명상을 알려주는 앱"
              className="block w-full max-w-md rounded-btn border border-zinc-200 bg-white p-3 text-sm shadow-soft-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-btn px-6 py-3 shadow-warm transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer"
            >
              Deploy hello world <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="mt-8">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-btn px-6 py-3 shadow-warm transition-transform duration-200 hover:-translate-y-0.5"
            >
              로그인하고 시작 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
