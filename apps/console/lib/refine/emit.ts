import 'server-only';

import type { PatternKey } from './anthropic';

export type EmitResult = { issueNumber: number; issueUrl: string };

export type EmitInput = {
  appId: string;
  appName: string;
  headline: string;
  pickedPattern: PatternKey;
  summary: string;
  recommendedPatterns: PatternKey[];
  emittedBy: string;
  mockupHtml?: string | null;
  planMarkdown?: string | null;
};

type GitHubIssueResponse = {
  number?: number;
  html_url?: string;
  message?: string;
};

const GITHUB_API = 'https://api.github.com';

function repoUrlFor(repo: string, issueNumber: number): string {
  return `https://github.com/${repo}/issues/${issueNumber}`;
}

export function buildIssueBody(input: EmitInput, emittedAtIso: string): string {
  const recCsv = input.recommendedPatterns.join(', ');
  const lines = [
    '# appee refine spec',
    '',
    `- app_id: ${input.appId}`,
    `- app_name: ${input.appName}`,
    `- headline: ${input.headline}`,
    `- picked: ${input.pickedPattern}`,
    `- candidates: ${recCsv}`,
    `- summary: ${input.summary}`,
    `- emitted_by: ${input.emittedBy}`,
    `- emitted_at: ${emittedAtIso}`,
  ];
  if (input.mockupHtml) {
    lines.push('', '## Mockup HTML', '', '```html', input.mockupHtml, '```');
  }
  if (input.planMarkdown) {
    lines.push('', '## Plan', '', input.planMarkdown);
  }
  return lines.join('\n');
}

export function buildIssueTitle(input: EmitInput): string {
  const short = input.summary.slice(0, 60);
  return `[refine] ${input.appName}: ${short}`;
}

export type EmitError =
  | { kind: 'misconfigured' }
  | { kind: 'auth_failed' }
  | { kind: 'github_failed'; status: number; message: string };

/**
 * Creates a GitHub issue against APPEE_CODEGEN_REPO using APPEE_GITHUB_TOKEN.
 * Throws EmitError shapes the route maps to user-friendly messages.
 */
export async function createGithubIssue(
  input: EmitInput,
  opts: { now?: () => Date; fetchImpl?: typeof fetch } = {},
): Promise<EmitResult> {
  const repo = process.env.APPEE_CODEGEN_REPO;
  const token = process.env.APPEE_GITHUB_TOKEN;
  if (!repo || !token) {
    const err: EmitError = { kind: 'misconfigured' };
    throw err;
  }

  const now = opts.now ?? (() => new Date());
  const fetchImpl = opts.fetchImpl ?? fetch;
  const emittedAt = now().toISOString();

  const res = await fetchImpl(`${GITHUB_API}/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'content-type': 'application/json',
      'user-agent': 'appee-console',
    },
    body: JSON.stringify({
      title: buildIssueTitle(input),
      body: buildIssueBody(input, emittedAt),
      labels: ['appee:refine-spec'],
    }),
  });

  const data = (await res.json().catch(() => ({}))) as GitHubIssueResponse;

  if (res.status === 401 || res.status === 403) {
    const err: EmitError = { kind: 'auth_failed' };
    throw err;
  }
  if (!res.ok || typeof data.number !== 'number' || typeof data.html_url !== 'string') {
    const err: EmitError = {
      kind: 'github_failed',
      status: res.status,
      message: data.message ?? `HTTP ${res.status}`,
    };
    throw err;
  }

  return {
    issueNumber: data.number,
    issueUrl: data.html_url || repoUrlFor(repo, data.number),
  };
}

export function isEmitError(err: unknown): err is EmitError {
  return (
    !!err &&
    typeof err === 'object' &&
    'kind' in (err as Record<string, unknown>) &&
    typeof (err as { kind?: unknown }).kind === 'string'
  );
}
