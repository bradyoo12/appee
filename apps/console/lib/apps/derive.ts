// Shared derivation rules for fields computed from the user's headline.
// Used by both initial deploy (lib/eas/createBuild.ts) and headline edit
// (app/apps/[id]/actions.ts) so the two paths stay in sync.

/** First ~10 chars of headline (trimmed), falling back to '내 앱' on empty. */
export function deriveAppName(headline: string): string {
  return headline.slice(0, 10).trim() || '내 앱';
}
