import type { NextConfig } from 'next';
import { join } from 'node:path';

// On Vercel, each serverless function bundle only contains files the tracer
// reached from the route's entry. `templates/expo-base/` lives outside
// apps/console and is read at runtime by triggerEasAndroidBuild — the
// tracer can't infer that, so we include it explicitly.
//
// outputFileTracingRoot anchors trace paths to the workspace root, otherwise
// the `../../templates` include resolves outside the trace and gets ignored.
const config: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: join(process.cwd(), '..', '..'),
  outputFileTracingIncludes: {
    // Routes that call triggerEasAndroidBuild — Server Action on landing
    // and the explicit POST endpoint.
    '/': ['../../templates/expo-base/**'],
    '/api/builds/create': ['../../templates/expo-base/**'],
  },
  outputFileTracingExcludes: {
    '/': [
      '../../templates/expo-base/node_modules/**',
      '../../templates/expo-base/.expo/**',
      '../../templates/expo-base/.expo-shared/**',
      '../../templates/expo-base/android/**',
      '../../templates/expo-base/ios/**',
      '../../templates/expo-base/.tsbuildinfo',
    ],
    '/api/builds/create': [
      '../../templates/expo-base/node_modules/**',
      '../../templates/expo-base/.expo/**',
      '../../templates/expo-base/.expo-shared/**',
      '../../templates/expo-base/android/**',
      '../../templates/expo-base/ios/**',
      '../../templates/expo-base/.tsbuildinfo',
    ],
  },
};

export default config;
