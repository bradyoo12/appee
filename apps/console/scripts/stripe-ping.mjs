// Confirm STRIPE_SECRET_KEY works against the live Stripe API.
// Run: node --env-file=.env.local scripts/stripe-ping.mjs
import Stripe from 'stripe';

const apiKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey) {
  console.error('STRIPE_SECRET_KEY not set');
  process.exit(1);
}

const stripe = new Stripe(apiKey, { typescript: true });
try {
  const acct = await stripe.accounts.retrieve();
  console.log(`ok — account ${acct.id} (${acct.email ?? 'no email'})`);
  console.log(`  livemode: ${apiKey.startsWith('sk_live_')}`);
  console.log(`  country: ${acct.country}, default_currency: ${acct.default_currency}`);
} catch (e) {
  console.error('failed:', e.message);
  process.exit(1);
}
