const id = process.argv[2];
if (!id) { console.error('usage: fetch-build-log.mjs <buildId> [grep]'); process.exit(1); }
const grep = process.argv[3];
const TOKEN = process.env.EXPO_TOKEN;

const meta = await (await fetch('https://api.expo.dev/graphql', {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: `query { builds { byId(buildId: "${id}") { logFiles } } }` }),
})).json();
const url = meta.data?.builds?.byId?.logFiles?.[0];
if (!url) { console.error('no log url:', JSON.stringify(meta)); process.exit(1); }

const txt = await (await fetch(url)).text();

// Each line is a JSON log record. Extract the msg field.
const msgs = [];
for (const line of txt.split('\n')) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.msg) msgs.push(obj.msg);
  } catch {
    msgs.push(line);
  }
}

if (grep) {
  const re = new RegExp(grep, 'i');
  for (const m of msgs) if (re.test(m)) console.log(m);
} else {
  console.log(msgs.slice(-80).join('\n'));
}
