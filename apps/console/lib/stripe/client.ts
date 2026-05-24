import 'server-only';
import Stripe from 'stripe';

const apiKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey) {
  throw new Error('STRIPE_SECRET_KEY not set. See apps/console/.env.local.example');
}

// apiVersion is pinned by the installed SDK; not overriding so library
// upgrades are the one place we move forward.
export const stripe = new Stripe(apiKey, { typescript: true });
