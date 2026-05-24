import { getMonthlyQuota } from '@/lib/billing/quota';
import { triggerEasAndroidBuild } from '@/lib/eas/createBuild';
import { createClient } from '@/lib/supabase/server';
import { ArrowRight, LogOut } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DeployForm } from './_components/DeployForm';

async function deploy(formData: FormData) {
  'use server';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const quota = await getMonthlyQuota(user.id);
  if (quota.tier === null) redirect('/billing');
  if (quota.remaining === 0) redirect('/billing?quota=exhausted');

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
        <p className="text-xs font-mono uppercase tracking-widest text-brand-700">
          step 0 · deploy
        </p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mt-3">
          당신의 첫 앱을 <span className="font-display italic text-brand-500">5분</span>에.
        </h1>
        <p className="text-sm text-zinc-600 mt-3">
          한 줄을 적으면 폰 화면 가운데에 그대로 떠요. 클릭하면 실제 EAS 빌드 한 개가 큐잉됩니다.
        </p>

        {user ? (
          <DeployForm action={deploy} />
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
