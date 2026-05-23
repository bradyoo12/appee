import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Build lifecycle as far as our console cares about it.
// Maps from EAS Build statuses + adds the pre-trigger 'preparing' state.
export type AppStatus =
  | 'preparing' // local: tarring + uploading to EAS, no buildId yet
  | 'in_progress' // EAS reports NEW / IN_QUEUE / IN_PROGRESS
  | 'ready' // EAS reports FINISHED, install_url populated
  | 'build_failed' // EAS reports ERRORED
  | 'canceled'; // EAS reports CANCELED

// One row per Deploy click. Each row owns a unique Android package
// (E3-7 #89) so multiple builds from the same user can coexist on
// the same phone.
export const apps = pgTable(
  'apps',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // FK to auth.users(id) — Supabase manages that table, so we
    // don't model it in Drizzle. RLS enforces the relationship.
    userId: uuid('user_id').notNull(),

    // Per-build identity (E3-7).
    shortId: text('short_id').notNull().unique(),
    packageName: text('package_name').notNull(), // app.appee.u{shortId}
    slug: text('slug').notNull(), // u-{shortId}
    appName: text('app_name').notNull(), // first ~10 chars of headline

    // User input.
    headline: text('headline').notNull(),

    // Build state.
    status: text('status').$type<AppStatus>().notNull().default('preparing'),
    easBuildId: text('eas_build_id'), // returned by createAndroidBuild
    installUrl: text('install_url'), // EAS artifacts.buildUrl when FINISHED
    errorMessage: text('error_message'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // user dashboard query: list my apps, newest first
    index('apps_user_created_idx').on(t.userId, t.createdAt.desc()),
    // webhook / poll lookup by eas_build_id
    index('apps_eas_build_idx').on(t.easBuildId),
  ],
);

export type App = typeof apps.$inferSelect;
export type NewApp = typeof apps.$inferInsert;
