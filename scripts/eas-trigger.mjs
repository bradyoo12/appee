import { readFile, stat, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// 5b.3 — end-to-end EAS build trigger via GraphQL.
// Run: node --env-file=.env.local scripts/eas-trigger.mjs
//
// Steps: tar → uploadSession → PUT to GCS → createAndroidBuild mutation.
// Cost: consumes one EAS Build credit on success.
import { create } from 'tar';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const templateDir = join(repoRoot, 'templates', 'expo-base');
const archivePath = join(repoRoot, '.tmp-archive.tar.gz');

const APP_ID = '5deac01b-4fdd-4b39-87eb-aad5f8b0130d'; // appee-hello-base (ADR 0004)
const TOKEN = process.env.EXPO_TOKEN;
if (!TOKEN) {
  console.error('EXPO_TOKEN not set');
  process.exit(1);
}

async function gql(query, variables = {}) {
  const r = await fetch('https://api.expo.dev/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return r.json();
}

const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.next',
  '.expo',
  '.expo-shared',
  '.turbo',
  'dist',
  'build',
  'ios',
  'android',
]);
function shouldInclude(p) {
  const parts = p.split(/[/\\]/);
  for (const part of parts) if (EXCLUDE_DIRS.has(part)) return false;
  if (p.endsWith('.tsbuildinfo')) return false;
  return true;
}

console.log('1. tar.gz templates/expo-base ...');
await create(
  { gzip: true, file: archivePath, cwd: templateDir, filter: shouldInclude, portable: true },
  ['.'],
);
const sz = (await stat(archivePath)).size;
console.log(`   ${(sz / 1024).toFixed(1)} KiB`);

console.log('2. createUploadSession ...');
const sess = await gql(`
  mutation { uploadSession {
    createUploadSession(type: EAS_BUILD_GCS_PROJECT_SOURCES, filename: "archive.tar.gz")
  } }
`);
if (sess.errors) throw new Error(JSON.stringify(sess.errors));
const upload = sess.data.uploadSession.createUploadSession;
console.log(`   bucketKey: ${upload.bucketKey}`);

console.log('3. PUT to GCS ...');
const putRes = await fetch(upload.url, {
  method: 'PUT',
  headers: upload.headers,
  body: await readFile(archivePath),
});
console.log(`   HTTP ${putRes.status}`);
if (!putRes.ok) throw new Error(`upload failed: ${await putRes.text()}`);

console.log('4. createAndroidBuild mutation ...');
const buildRes = await gql(
  `
  mutation Create(
    $appId: ID!
    $job: AndroidJobInput!
    $metadata: BuildMetadataInput!
    $buildParams: BuildParamsInput
  ) {
    build {
      createAndroidBuild(
        appId: $appId
        job: $job
        metadata: $metadata
        buildParams: $buildParams
      ) {
        build {
          id
          status
          platform
          createdAt
        }
        deprecationInfo {
          type
          message
        }
      }
    }
  }
`,
  {
    appId: APP_ID,
    job: {
      mode: 'BUILD',
      type: 'MANAGED',
      triggeredBy: 'EAS_CLI',
      projectArchive: { type: 'GCS', bucketKey: upload.bucketKey },
      projectRootDirectory: '.',
      buildProfile: 'preview',
      buildType: 'APK',
      version: { versionCode: '1' },
    },
    metadata: {
      distribution: 'INTERNAL',
      buildProfile: 'preview',
      workflow: 'MANAGED',
      sdkVersion: '52.0.0',
      expoPackageVersion: '52.0.49',
      appVersion: '0.1.0',
      appBuildVersion: '1',
      appName: 'appee Hello',
      appIdentifier: 'app.appee.hellobase',
    },
    buildParams: {
      resourceClass: 'ANDROID_MEDIUM',
    },
  },
);

await unlink(archivePath).catch(() => {});

if (buildRes.errors) {
  console.error('   GraphQL errors:');
  console.error(JSON.stringify(buildRes.errors, null, 2));
  process.exit(1);
}

const result = buildRes.data.build.createAndroidBuild;
console.log('\n✅ Build queued');
console.log(`   id: ${result.build.id}`);
console.log(`   status: ${result.build.status}`);
console.log(`   created: ${result.build.createdAt}`);
console.log(
  `   dashboard: https://expo.dev/accounts/bradyoo12/projects/appee-hello-base/builds/${result.build.id}`,
);
if (result.deprecationInfo)
  console.log(`   deprecation: ${JSON.stringify(result.deprecationInfo)}`);
