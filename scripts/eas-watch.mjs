// Stream build status changes for a given buildId until terminal state.
// Run: node --env-file=.env.local scripts/eas-watch.mjs <buildId>
const id = process.argv[2];
if (!id) {
  console.error('usage: node scripts/eas-watch.mjs <buildId>');
  process.exit(1);
}
const TOKEN = process.env.EXPO_TOKEN;
if (!TOKEN) {
  console.error('EXPO_TOKEN not set');
  process.exit(1);
}

let prev = null;
const t0 = Date.now();
while (true) {
  const r = await fetch('https://api.expo.dev/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { builds { byId(buildId: "${id}") { status artifacts { buildUrl } } } }`,
    }),
  });
  const body = await r.json();
  const data = body.data?.builds?.byId;
  const s = data?.status ?? 'UNKNOWN';
  const elapsed = Math.floor((Date.now() - t0) / 1000);

  if (s !== prev) {
    const url = data?.artifacts?.buildUrl ?? '';
    console.log(`+${String(elapsed).padStart(4)}s  ${s}  ${url}`);
    prev = s;
  }
  if (['FINISHED', 'ERRORED', 'CANCELED'].includes(s)) break;
  await new Promise((r) => setTimeout(r, 30000));
}
