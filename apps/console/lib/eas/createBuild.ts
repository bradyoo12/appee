import 'server-only';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import * as tar from 'tar';
import { customAlphabet } from 'nanoid';
import { easGraphQL } from './client';

// appee-hello-base (ADR 0004). Slice 0 uses one shared EAS project (ADR 0005);
// per-build isolation comes from Android package name, not project.
const APP_ID = '5deac01b-4fdd-4b39-87eb-aad5f8b0130d';

// Workspace root template — dev cwd is apps/console; reach across two levels.
// Vercel bundle path will need outputFileTracingIncludes (E3-8 #90) before prod.
const TEMPLATE_DIR = join(process.cwd(), '..', '..', 'templates', 'expo-base');

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
function shouldInclude(p: string): boolean {
  for (const part of p.split(/[/\\]/)) {
    if (EXCLUDE_DIRS.has(part)) return false;
  }
  if (p.endsWith('.tsbuildinfo')) return false;
  return true;
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks);
}

// Android package name allowed chars: lowercase letters, digits, underscores per segment.
// We use 8-char alphanumeric (lowercase) so it fits both Android package and Expo slug rules.
const shortId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);

type AppIdentity = {
  shortId: string;
  androidPackage: string; // app.appee.u{shortId}
  slug: string; // u-{shortId}
  appName: string; // first ~10 chars of headline, fallback "내 앱"
};

function deriveIdentity(headline: string): AppIdentity {
  const sid = shortId();
  return {
    shortId: sid,
    androidPackage: `app.appee.u${sid}`,
    slug: `u-${sid}`,
    appName: headline.slice(0, 10).trim() || '내 앱',
  };
}

/** Copy templates/expo-base to a scratch dir and substitute placeholders. */
function makeSubstitutedDir(headline: string, identity: AppIdentity): string {
  const dir = mkdtempSync(join(tmpdir(), 'appee-build-'));
  cpSync(TEMPLATE_DIR, dir, { recursive: true });

  // 1. {{HEADLINE}} in the on-phone screen.
  const indexPath = join(dir, 'app', 'index.tsx');
  const indexSrc = readFileSync(indexPath, 'utf-8');
  writeFileSync(indexPath, indexSrc.replaceAll('{{HEADLINE}}', headline), 'utf-8');

  // 2. {{APP_NAME}} / {{SLUG}} / {{ANDROID_PACKAGE}} in app.json — per-user identity.
  const appJsonPath = join(dir, 'app.json');
  let appJsonSrc = readFileSync(appJsonPath, 'utf-8');
  appJsonSrc = appJsonSrc
    .replaceAll('{{APP_NAME}}', identity.appName)
    .replaceAll('{{SLUG}}', identity.slug)
    .replaceAll('{{ANDROID_PACKAGE}}', identity.androidPackage);
  writeFileSync(appJsonPath, appJsonSrc, 'utf-8');

  return dir;
}

type UploadSessionResult = {
  uploadSession: {
    createUploadSession: { url: string; headers: Record<string, string>; bucketKey: string };
  };
};

type CreateBuildResult = {
  build: { createAndroidBuild: { build: { id: string; status: string } } };
};

export async function triggerEasAndroidBuild(input: { headline: string }): Promise<{
  buildId: string;
  status: string;
  androidPackage: string;
}> {
  const identity = deriveIdentity(input.headline);
  const scratchDir = makeSubstitutedDir(input.headline, identity);
  try {
    // 1. tar.gz the substituted template in-memory.
    const tarStream = tar.create(
      { gzip: true, cwd: scratchDir, filter: shouldInclude, portable: true },
      ['.'],
    ) as unknown as Readable;
    const archive = await streamToBuffer(tarStream);

    // 2. Ask EAS for a signed upload URL.
    const sess = await easGraphQL<UploadSessionResult>(
      `mutation { uploadSession {
        createUploadSession(type: EAS_BUILD_GCS_PROJECT_SOURCES, filename: "archive.tar.gz")
      } }`,
    );
    const upload = sess.uploadSession.createUploadSession;

    // 3. Upload the tarball.
    const putRes = await fetch(upload.url, {
      method: 'PUT',
      headers: upload.headers,
      body: archive,
    });
    if (!putRes.ok) {
      throw new Error(`tarball PUT failed: HTTP ${putRes.status} ${await putRes.text()}`);
    }

    // 4. Queue the build. Field shape proven in scripts/eas-trigger.mjs (commit c4dcf02).
    const result = await easGraphQL<CreateBuildResult>(
      `mutation Create(
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
            build { id status }
          }
        }
      }`,
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
          appName: identity.appName,
          appIdentifier: identity.androidPackage,
          message: input.headline,
        },
        buildParams: { resourceClass: 'ANDROID_MEDIUM' },
      },
    );

    const build = result.build.createAndroidBuild.build;
    return { buildId: build.id, status: build.status, androidPackage: identity.androidPackage };
  } finally {
    rmSync(scratchDir, { recursive: true, force: true });
  }
}
