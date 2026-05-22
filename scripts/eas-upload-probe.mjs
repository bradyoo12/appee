// 5b.1 — call createUploadSession to discover the actual response shape.
// Run: node --env-file=.env.local scripts/eas-upload-probe.mjs

const TOKEN = process.env.EXPO_TOKEN;
if (!TOKEN) {
  console.error('EXPO_TOKEN not set');
  process.exit(1);
}

async function gql(query, variables = {}) {
  const res = await fetch('https://api.expo.dev/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

const r = await gql(`
  mutation Probe {
    uploadSession {
      createUploadSession(
        type: EAS_BUILD_GCS_PROJECT_SOURCES
        filename: "archive.tar.gz"
      )
    }
  }
`);

console.log(JSON.stringify(r, null, 2));
