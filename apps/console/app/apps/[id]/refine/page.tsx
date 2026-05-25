import { db } from '@/lib/db/client';
import { apps } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';
import { and, eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { RefineChat } from './RefineChat';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function RefinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const rows = await db
    .select()
    .from(apps)
    .where(and(eq(apps.id, id), eq(apps.userId, user.id)))
    .limit(1);
  const app = rows[0];
  if (!app) notFound();

  return (
    <main
      data-testid="refine-chat-shell"
      className="min-h-screen px-6 py-10 max-w-3xl mx-auto flex flex-col"
    >
      <Link
        href={`/apps/${app.id}`}
        className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 font-mono uppercase tracking-widest"
      >
        <ArrowLeft className="w-3 h-3" /> 앱 상세
      </Link>

      <header className="mt-4">
        <p className="text-xs font-mono uppercase tracking-widest text-brand-700">
          refine · dialog
        </p>
        <h1 className="text-2xl font-bold tracking-tight mt-1 truncate">{app.appName}</h1>
        <p className="text-sm text-zinc-600 mt-1">
          이 앱을 어떻게 다듬을지 대화로 결정해요. 화면 형태 · 기능 · 디자인을 함께 짚어가며 가장 잘
          맞는 방향을 같이 골라봅니다.
        </p>
      </header>

      <RefineChat appId={app.id} />
    </main>
  );
}
