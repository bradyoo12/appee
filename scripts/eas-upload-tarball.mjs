import { readFile, stat, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// 5b.2 — tar templates/expo-base, PUT to EAS signed URL, verify upload.
// Run: node --env-file=.env.local scripts/eas-upload-tarball.mjs
// Outputs the bucketKey for use in 5b.3 (createAndroidBuild).
import { create } from 'tar';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const templateDir = join(repoRoot, 'templates', 'expo-base');
const archivePath = join(repoRoot, '.tmp-archive.tar.gz');

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
const EXCLUDE_FILE_SUFFIX = ['.tsbuildinfo'];

function shouldInclude(p) {
  // p is relative path like "./app/page.tsx" or "node_modules/foo"
  const parts = p.split(/[/\\]/);
  for (const part of parts) {
    if (EXCLUDE_DIRS.has(part)) return false;
  }
  for (const suf of EXCLUDE_FILE_SUFFIX) {
    if (p.endsWith(suf)) return false;
  }
  return true;
}

// Step 1: tar.gz
console.log('1. Creating tarball...');
console.log(`   cwd: ${templateDir}`);
await create(
  {
    gzip: true,
    file: archivePath,
    cwd: templateDir,
    filter: shouldInclude,
    portable: true,
  },
  ['.'],
);
const sz = (await stat(archivePath)).size;
console.log(`   archive: ${archivePath} (${(sz / 1024).toFixed(1)} KiB)`);

// Step 2: createUploadSession
console.log('\n2. createUploadSession...');
const sess = await gql(`
  mutation {
    uploadSession {
      createUploadSession(
        type: EAS_BUILD_GCS_PROJECT_SOURCES
        filename: "archive.tar.gz"
      )
    }
  }
`);
if (sess.errors) {
  console.error('   GraphQL errors:', sess.errors);
  process.exit(1);
}
const session = sess.data.uploadSession.createUploadSession;
console.log(`   bucketKey: ${session.bucketKey}`);
console.log(`   headers: ${JSON.stringify(session.headers)}`);

// Step 3: PUT
console.log('\n3. PUT to signed URL...');
const body = await readFile(archivePath);
const putRes = await fetch(session.url, {
  method: 'PUT',
  headers: session.headers,
  body,
});
console.log(`   HTTP ${putRes.status} ${putRes.statusText}`);
if (!putRes.ok) {
  console.error('   body:', (await putRes.text()).slice(0, 1000));
  process.exit(1);
}

console.log('\n✅ Upload succeeded');
console.log(`bucketKey for 5b.3: ${session.bucketKey}`);

// Cleanup
await unlink(archivePath);
