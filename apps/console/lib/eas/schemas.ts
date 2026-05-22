import { z } from 'zod';

export const BuildStatus = z.enum([
  'NEW',
  'IN_QUEUE',
  'IN_PROGRESS',
  'FINISHED',
  'ERRORED',
  'CANCELED',
]);
export type BuildStatus = z.infer<typeof BuildStatus>;

export const Build = z.object({
  id: z.string(),
  status: BuildStatus,
  platform: z.enum(['ANDROID', 'IOS']),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  artifacts: z
    .object({
      buildUrl: z.string().url().nullable(),
    })
    .nullable(),
  project: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  }),
});
export type Build = z.infer<typeof Build>;
