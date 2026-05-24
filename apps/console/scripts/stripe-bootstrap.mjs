// Idempotent: creates "appee Pro" product + monthly price if not present.
// Run: node --env-file=.env.local scripts/stripe-bootstrap.mjs
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { typescript: true });

const TAG = 'appee-pro';
const NAME = 'appee Pro';
const DESCRIPTION = '월 EAS Build 30개, 트라이얼 7일';
const UNIT_AMOUNT = 900; // $9.00 in cents
const CURRENCY = 'usd';
const INTERVAL = 'month';

// 1. Find or create product (lookup_key isn't available on products; metadata.tag is the convention).
const allProducts = await stripe.products.list({ limit: 100, active: true });
let product = allProducts.data.find((p) => p.metadata?.tag === TAG);
if (product) {
  console.log(`product exists: ${product.id} (${product.name})`);
} else {
  product = await stripe.products.create({
    name: NAME,
    description: DESCRIPTION,
    metadata: { tag: TAG },
  });
  console.log(`created product: ${product.id}`);
}

// 2. Find or create matching price (currency + interval + unit_amount must all match).
const allPrices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
let price = allPrices.data.find(
  (p) =>
    p.currency === CURRENCY &&
    p.recurring?.interval === INTERVAL &&
    p.unit_amount === UNIT_AMOUNT,
);
if (price) {
  console.log(`price exists: ${price.id} (${price.unit_amount}c ${price.currency}/${INTERVAL})`);
} else {
  price = await stripe.prices.create({
    product: product.id,
    unit_amount: UNIT_AMOUNT,
    currency: CURRENCY,
    recurring: { interval: INTERVAL },
    lookup_key: 'appee_pro_monthly',
  });
  console.log(`created price: ${price.id}`);
}

console.log('\nAdd to .env.local:');
console.log(`STRIPE_PRICE_ID=${price.id}`);
