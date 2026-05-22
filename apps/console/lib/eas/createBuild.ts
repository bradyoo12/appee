import 'server-only';
import { Readable } from 'node:stream';
import { join } from 'node:path';
import * as tar from 'tar';
import { easGraphQL } from './client';

// appee-hello-base (ADR 0004). Slice 0 uses one shared project (ADR 0005).
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

type UploadSessionResult = {
  uploadSession: {
    createUploadSession: { url: string; headers: Record<string, string>; bucketKey: string };
  };
};

type CreateBuildResult = {
  build: { createAndroidBuild: { build: { id: string; status: string } } };
};

export async function triggerEasAndroidBuild(): Promise<{ buildId: string; status: string }> {
  // 1. tar.gz the template in-memory.
  const tarStream = tar.create(
    { gzip: true, cwd: TEMPLATE_DIR, filter: shouldInclude, portable: true },
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
        appName: 'appee Hello',
        appIdentifier: 'app.appee.hellobase',
      },
      buildParams: { resourceClass: 'ANDROID_MEDIUM' },
    },
  );

  const build = result.build.createAndroidBuild.build;
  return { buildId: build.id, status: build.status };
}
