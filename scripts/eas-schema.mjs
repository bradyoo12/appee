// Unit 5b probe — introspect EAS GraphQL schema to find build-related mutations.
// Run: node --env-file=.env.local scripts/eas-schema.mjs

const TOKEN = process.env.EXPO_TOKEN;
if (!TOKEN) {
  console.error('ERROR: EXPO_TOKEN not set.');
  process.exit(1);
}

async function gql(query, variables = {}) {
  const res = await fetch('https://api.expo.dev/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

// 1. List all top-level mutations and find build-related ones.
console.log('=== Top-level Mutation fields ===\n');
const topMutations = await gql(`
  {
    __schema {
      mutationType {
        fields { name description type { name kind } }
      }
    }
  }
`);
const fields = topMutations.data?.__schema?.mutationType?.fields ?? [];
const buildRelated = fields.filter(
  (f) =>
    /build|asset|upload/i.test(f.name) ||
    /build|asset|upload/i.test(f.description ?? ''),
);
for (const f of buildRelated) {
  console.log(`${f.name} → ${f.type.name ?? f.type.kind}`);
  if (f.description) console.log(`  └─ ${f.description}`);
}

// 2. Drill into the type returned by the most build-ish mutation.
const candidates = [
  'BuildMutation',
  'AssetMutation',
  'UploadSessionMutation',
  'CreateBuildResult',
  'AndroidJobInput',
  'BuildMetadataInput',
  'BuildParamsInput',
];
for (const typeName of candidates) {
  console.log(`\n=== type ${typeName} ===\n`);
  const t = await gql(
    `
    query Probe($name: String!) {
      __type(name: $name) {
        name
        fields {
          name
          description
          args {
            name
            type {
              name
              kind
              ofType { name kind }
            }
          }
          type { name kind ofType { name kind } }
        }
      }
    }
  `,
    { name: typeName },
  );
  const tt = t.data?.__type;
  if (!tt) {
    console.log(`(type ${typeName} not found)`);
    continue;
  }
  // For Object/Interface types: list fields. For InputObject: list inputFields.
  const fieldsToShow = tt.fields ?? [];
  for (const f of fieldsToShow) {
    const argList = (f.args ?? [])
      .map((a) => {
        const tn =
          a.type.ofType?.name ?? a.type.name ?? `${a.type.kind}<${a.type.ofType?.kind ?? '?'}>`;
        return `${a.name}: ${tn}`;
      })
      .join(', ');
    const retName = f.type.ofType?.name ?? f.type.name ?? f.type.kind;
    console.log(`${f.name}(${argList}) → ${retName}`);
    if (f.description) console.log(`  └─ ${f.description}`);
  }

  // Also probe inputFields (for *Input types).
  const inputProbe = await gql(
    `query Probe($name: String!) {
      __type(name: $name) {
        inputFields {
          name
          type { name kind ofType { name kind } }
        }
      }
    }`,
    { name: typeName },
  );
  const inputFields = inputProbe.data?.__type?.inputFields;
  if (inputFields?.length) {
    console.log(`  -- inputFields:`);
    for (const f of inputFields) {
      const tn = f.type.ofType?.name ?? f.type.name ?? `${f.type.kind}<${f.type.ofType?.kind ?? '?'}>`;
      console.log(`    ${f.name}: ${tn}`);
    }
  }
}
