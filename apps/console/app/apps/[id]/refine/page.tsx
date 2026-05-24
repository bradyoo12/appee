import { db } from '@/lib/db/client';
import { apps } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';
import { and, eq } from 'drizzle-orm';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

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
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto flex flex-col">
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

      <section
        data-testid="refine-chat-shell"
        className="mt-6 flex-1 min-h-[320px] rounded-card border border-dashed border-zinc-200 bg-zinc-50/60 p-6 flex flex-col items-center justify-center text-center"
      >
        <MessageCircle className="w-8 h-8 text-zinc-300" />
        <p className="mt-3 text-sm font-medium text-zinc-700">대화 흐름 준비 중</p>
        <p className="mt-1 text-xs text-zinc-500 max-w-sm">
          곧 이 자리에서 질문을 주고받으며 화면 형태(리스트 · 그리드 · 카드 · 시트 등) 중 가장 잘
          맞는 옵션을 함께 골라드려요.
        </p>
      </section>

      <div className="mt-4">
        <input
          type="text"
          disabled
          placeholder="곧 사용 가능 — 메시지를 입력할 수 있어요"
          aria-label="message"
          className="w-full rounded-btn border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500 placeholder:text-zinc-400 cursor-not-allowed"
        />
      </div>
    </main>
  );
}
