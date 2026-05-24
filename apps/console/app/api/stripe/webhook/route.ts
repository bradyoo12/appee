import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import { db } from '@/lib/db/client';
import { subscriptions, type SubscriptionStatus } from '@/lib/db/schema';

// Stripe webhook handler. Subscriptions table is updated here and
// only here — Server Actions read from it but never write.
//
// Required env: STRIPE_WEBHOOK_SECRET (set by `stripe listen` or
// `stripe webhook` for prod).

function toDate(unixSeconds: number | null | undefined): Date | null {
  return unixSeconds ? new Date(unixSeconds * 1000) : null;
}

async function upsertSubscription(sub: Stripe.Subscription) {
  const userId = sub.metadata?.user_id;
  if (!userId) {
    console.warn(`subscription ${sub.id} has no metadata.user_id — skipping`);
    return;
  }
  const stripeCustomerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  // As of Stripe API 2025-08+, current_period_end moved from the subscription
  // to each subscription_item. We use the first item (single-plan subs only).
  const firstItem = sub.items.data[0];
  if (!firstItem) {
    console.warn(`subscription ${sub.id} has no line items — skipping`);
    return;
  }
  const stripePriceId = firstItem.price.id;

  // SDK types still expect this on Subscription; the API moved it to
  // SubscriptionItem in 2025-08+. Fall back to either location.
  const periodEndSeconds =
    (firstItem as unknown as { current_period_end?: number }).current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;
  const periodEnd = toDate(periodEndSeconds);
  if (!periodEnd) {
    console.warn(`subscription ${sub.id} has no current_period_end — skipping`);
    return;
  }

  await db
    .insert(subscriptions)
    .values({
      userId,
      stripeCustomerId,
      stripeSubscriptionId: sub.id,
      stripePriceId,
      status: sub.status as SubscriptionStatus,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: toDate(sub.cancel_at),
      trialEnd: toDate(sub.trial_end),
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        stripeCustomerId,
        stripeSubscriptionId: sub.id,
        stripePriceId,
        status: sub.status as SubscriptionStatus,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: toDate(sub.cancel_at),
        trialEnd: toDate(sub.trial_end),
        updatedAt: new Date(),
      },
    });
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET not set' }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'missing stripe-signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid signature';
    return NextResponse.json({ error: `signature verification failed: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await upsertSubscription(event.data.object);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await db
          .update(subscriptions)
          .set({ status: 'canceled', updatedAt: new Date() })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));
        break;
      }
      default:
        // Other events (checkout.session.completed, invoice.*, etc.)
        // are observable in dashboard but don't drive our state.
        break;
    }
  } catch (err) {
    console.error(`error handling ${event.type}:`, err);
    return NextResponse.json({ error: 'handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
