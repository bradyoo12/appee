// Quick enum + required-field probe for createAndroidBuild inputs.
const TOKEN = process.env.EXPO_TOKEN;
async function gql(query, variables = {}) {
  const r = await fetch('https://api.expo.dev/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return r.json();
}

const types = [
  'BuildMode',
  'BuildWorkflow',
  'BuildTrigger',
  'DistributionType',
  'AndroidBuildType',
  'AndroidBuilderEnvironmentInput',
  'AndroidJobSecretsInput',
  'BuildCacheInput',
  'AndroidJobVersionInput',
];
for (const name of types) {
  const r = await gql(
    `query Q($n: String!) {
      __type(name: $n) {
        kind
        enumValues { name }
        inputFields {
          name
          type {
            name kind
            ofType { name kind ofType { name kind } }
          }
        }
      }
    }`,
    { n: name },
  );
  const t = r.data?.__type;
  if (!t) {
    console.log(`${name}: NOT FOUND`);
    continue;
  }
  if (t.enumValues?.length) {
    console.log(`${name} (enum): ${t.enumValues.map((v) => v.name).join(', ')}`);
  }
  if (t.inputFields?.length) {
    console.log(`${name} (input):`);
    for (const f of t.inputFields) {
      const isNonNull = f.type.kind === 'NON_NULL';
      const tn = f.type.ofType?.name ?? f.type.name ?? f.type.kind;
      console.log(`  ${f.name}: ${tn}${isNonNull ? ' (required)' : ''}`);
    }
  }
}
