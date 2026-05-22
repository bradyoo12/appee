// Drill into specific types needed for createAndroidBuild.
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

// First, find what type uploadSession returns.
const mutType = await gql(`
  query {
    __type(name: "RootMutation") {
      fields {
        name
        type {
          kind
          name
          ofType { kind name }
        }
      }
    }
  }
`);
const uploadSessionField = (mutType.data?.__type?.fields ?? []).find((f) => f.name === 'uploadSession');
console.log('uploadSession field type:', JSON.stringify(uploadSessionField, null, 2));

const types = [
  'ProjectArchiveSourceInput',
  'UploadSessionMutation',
  'UploadSessionType',
  'ProjectArchiveSourceType',
];

for (const name of types) {
  const t = await gql(
    `query Probe($n: String!) {
      __type(name: $n) {
        name
        kind
        description
        fields {
          name
          description
          args { name type { name kind ofType { name kind } } }
          type { name kind ofType { name kind } }
        }
        inputFields {
          name
          description
          type { name kind ofType { name kind } }
        }
        enumValues { name description }
      }
    }`,
    { n: name },
  );
  const tt = t.data?.__type;
  console.log(`\n=== ${name} ===`);
  if (!tt) {
    console.log('(not found)');
    continue;
  }
  console.log(`kind: ${tt.kind}`);
  if (tt.description) console.log(`desc: ${tt.description}`);
  if (tt.fields?.length) {
    console.log('fields:');
    for (const f of tt.fields) {
      const argList = (f.args ?? [])
        .map(
          (a) => `${a.name}: ${a.type.ofType?.name ?? a.type.name ?? a.type.kind}`,
        )
        .join(', ');
      const retName = f.type.ofType?.name ?? f.type.name ?? f.type.kind;
      console.log(`  ${f.name}(${argList}) → ${retName}`);
      if (f.description) console.log(`    └─ ${f.description}`);
    }
  }
  if (tt.inputFields?.length) {
    console.log('inputFields:');
    for (const f of tt.inputFields) {
      const tn = f.type.ofType?.name ?? f.type.name ?? f.type.kind;
      console.log(`  ${f.name}: ${tn}`);
      if (f.description) console.log(`    └─ ${f.description}`);
    }
  }
  if (tt.enumValues?.length) {
    console.log('enumValues:');
    for (const v of tt.enumValues) console.log(`  ${v.name}`);
  }
}
