import 'server-only';
import Stripe from 'stripe';

let cached: Stripe | null = null;

function getStripe(): Stripe {
  if (cached) return cached;
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY not set. See apps/console/.env.local.example');
  }
  // apiVersion is pinned by the installed SDK; not overriding so library
  // upgrades are the one place we move forward.
  cached = new Stripe(apiKey, { typescript: true });
  return cached;
}

// Lazy proxy: identical call surface to a real Stripe instance, but the
// constructor + env check are deferred until first runtime use. Same pattern
// as lib/db/client.ts (PR #93) — Vercel injects STRIPE_SECRET_KEY at runtime,
// not at build time, so `next build`'s "Collecting page data" phase must be
// able to import this module without env present.
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver);
  },
});
