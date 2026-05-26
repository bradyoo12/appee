import { db } from '@/lib/db/client';
import { type Subscription, subscriptions } from '@/lib/db/schema';
import { stripe } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';
import { eq } from 'drizzle-orm';
import { ArrowRight, Check, CreditCard } from 'lucide-react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function startTrial() {
  'use server';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const h = await headers();
  const host = h.get('host') ?? 'localhost:3001';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const origin = `${proto}://${host}`;

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) throw new Error('STRIPE_PRICE_ID not set');

  // client_reference_id links the checkout session back to our user in
  // the webhook handler. customer_email pre-fills the form and helps
  // Stripe re-attach to an existing customer on returning checkouts.
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 7,
      metadata: { user_id: user.id },
    },
    customer_email: user.email ?? undefined,
    client_reference_id: user.id,
    allow_promotion_codes: true,
    success_url: `${origin}/billing?success=1`,
    cancel_url: `${origin}/billing`,
  });

  if (!session.url) throw new Error('Checkout session created without url');
  redirect(session.url);
}

function isUsable(sub: Subscription | undefined): boolean {
  if (!sub) return false;
  return sub.status === 'trialing' || sub.status === 'active';
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .limit(1);

  const { success } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="max-w-md w-full">
        <p className="text-xs font-mono uppercase tracking-widest text-brand-700 text-center">
          step · billing
        </p>
        <h1 className="text-3xl font-bold tracking-tight mt-2 text-center">
          <span className="font-display italic text-brand-500">appee</span> Pro
        </h1>

        {success === '1' && (
          <div className="mt-6 rounded-card bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-900 text-center">
            트라이얼 시작! 카드 등록만 되어 있어요 — 7일간 무료.
          </div>
        )}

        <div className="mt-8 rounded-card bg-white border border-zinc-100 shadow-soft-sm p-6">
          <p className="text-3xl font-bold tracking-tight">
            $9<span className="text-base font-normal text-zinc-500">/month</span>
          </p>
          <p className="text-xs text-zinc-500 mt-1">USD · 첫 7일 무료</p>
          <ul className="mt-5 space-y-2 text-sm text-zinc-700">
            {['EAS Build 월 30개', '무제한 디바이스 설치', '취소 언제든'].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" /> {t}
              </li>
            ))}
          </ul>

          {isUsable(sub) ? (
            <div className="mt-6 rounded-btn bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-900">
              <p className="font-semibold">
                {sub?.status === 'trialing' ? '트라이얼 중' : '활성 구독'}
              </p>
              <p className="text-xs mt-1 text-emerald-700">
                다음 결제: {sub?.currentPeriodEnd.toLocaleDateString('ko-KR')}
              </p>
              <Link
                href="/dashboard"
                className="mt-3 inline-flex items-center gap-1 text-emerald-900 hover:underline"
              >
                대시보드로 <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <form action={startTrial} className="mt-6">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-btn px-6 py-3 shadow-warm transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer"
              >
                <CreditCard className="w-4 h-4" /> 7일 무료로 시작
              </button>
              <p className="text-[11px] text-zinc-400 mt-2 text-center">
                Stripe Checkout으로 안전하게 결제. 테스트 카드: 4242 4242 4242 4242
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
