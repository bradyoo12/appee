// Unit 5a — verify EAS API auth + read-only build fetch via GraphQL.
// Run: node --env-file=.env.local scripts/eas-test.mjs

const PROJECT_ID = '5deac01b-4fdd-4b39-87eb-aad5f8b0130d'; // appee-hello-base (ADR 0004)
const BUILD_ID = '9866e401-0a52-46aa-b715-3072225fad3d'; // walking-skeleton validated build

const TOKEN = process.env.EXPO_TOKEN;
if (!TOKEN) {
  console.error('ERROR: EXPO_TOKEN not set.');
  console.error('Run with: node --env-file=.env.local scripts/eas-test.mjs');
  process.exit(1);
}

const ENDPOINT = 'https://api.expo.dev/graphql';

async function gql(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  return { status: res.status, body: await res.json() };
}

// Step 1: who am I (auth check)
console.log('--- Step 1: viewer (auth check) ---');
const me = await gql(`
  query Me {
    meActor {
      __typename
      ... on User { id username }
      ... on Robot { id firstName }
    }
  }
`);
console.log(`HTTP ${me.status}`);
console.log(JSON.stringify(me.body, null, 2));

if (me.body.errors || !me.body.data?.meActor) {
  console.error('\nAuth failed — stop here.');
  process.exit(1);
}

// Step 2: read our validated build
console.log('\n--- Step 2: get validated build ---');
const buildQ = await gql(
  `
  query GetBuild($id: ID!) {
    builds {
      byId(buildId: $id) {
        id
        status
        platform
        createdAt
        completedAt
        artifacts { buildUrl }
        project {
          ... on App { id name slug }
        }
      }
    }
  }
`,
  { id: BUILD_ID },
);
console.log(`HTTP ${buildQ.status}`);
console.log(JSON.stringify(buildQ.body, null, 2));
