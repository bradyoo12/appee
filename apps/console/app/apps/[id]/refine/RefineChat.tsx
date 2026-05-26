'use client';

import { ArrowRight, Loader2, RefreshCcw, Send, Sparkles } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';

type PatternKey = 'list' | 'grid' | 'card' | 'sheet' | 'fullscreen';

const PATTERNS: Record<PatternKey, { label: string; desc: string }> = {
  list: { label: '리스트', desc: '한 줄 = 한 항목. 정보 밀도가 높을 때.' },
  grid: { label: '그리드', desc: '정사각형 칸 반복. 이미지·아이콘 위주.' },
  card: { label: '카드', desc: '제목 + 이미지 + 버튼 묶음. 피드·읽을거리에.' },
  sheet: { label: '바텀시트', desc: '화면 아래에서 올라옴. 입력·필터·세부정보.' },
  fullscreen: { label: '풀스크린', desc: '한 번에 한 장. 위아래 스와이프 몰입형.' },
};

type Message = { role: 'assistant' | 'user'; content: string };
type Phase = 'asking' | 'options' | 'preview' | 'approved' | 'emitting' | 'emitted';

type EmittedIssue = { issueNumber: number; issueUrl: string };

const INTRO_MESSAGE: Message = {
  role: 'assistant',
  content:
    '안녕하세요. 이 앱에 어떤 화면을 추가하고 싶으세요? 어떤 정보를 보여주거나, 사용자가 무엇을 하면 좋을지 알려주시면 같이 정해볼게요.',
};

export function RefineChat({ appId }: { appId: string }) {
  const [phase, setPhase] = useState<Phase>('asking');
  const [messages, setMessages] = useState<Message[]>([INTRO_MESSAGE]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommended, setRecommended] = useState<PatternKey[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [pickedPattern, setPickedPattern] = useState<PatternKey | null>(null);

  // Preview state
  const [mockupHtml, setMockupHtml] = useState<string | null>(null);
  const [planMarkdown, setPlanMarkdown] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [revising, setRevising] = useState(false);
  const [revisionText, setRevisionText] = useState('');

  // Emit state (#111)
  const [emittedIssue, setEmittedIssue] = useState<EmittedIssue | null>(null);

  const threadRef = useRef<HTMLOListElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll trigger
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, sending]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending || phase !== 'asking') return;

    const nextMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const res = await fetch('/api/refine/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ appId, messages: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(humanError(data));
        setMessages(messages);
        setInput(text);
        return;
      }
      setMessages([...nextMessages, { role: 'assistant', content: data.assistantMessage }]);
      if (data.phase === 'options' && Array.isArray(data.recommendedPatterns)) {
        setRecommended(data.recommendedPatterns);
        if (typeof data.summary === 'string') setSummary(data.summary);
        setPhase('options');
      }
    } catch (_err) {
      setError('연결이 끊겼어요. 잠시 후 다시 시도해주세요.');
      setMessages(messages);
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  async function fetchPreview(
    pattern: PatternKey,
    opts: {
      revisionRequest?: string;
      previousMockupHtml?: string;
      previousPlanMarkdown?: string;
    } = {},
  ) {
    setPreviewLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/refine/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          appId,
          pickedPattern: pattern,
          summary,
          messages,
          revisionRequest: opts.revisionRequest,
          previousMockupHtml: opts.previousMockupHtml,
          previousPlanMarkdown: opts.previousPlanMarkdown,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(humanError(data));
        return false;
      }
      setMockupHtml(typeof data.mockupHtml === 'string' ? data.mockupHtml : null);
      setPlanMarkdown(typeof data.planMarkdown === 'string' ? data.planMarkdown : null);
      return true;
    } catch (_err) {
      setError('연결이 끊겼어요. 잠시 후 다시 시도해주세요.');
      return false;
    } finally {
      setPreviewLoading(false);
    }
  }

  async function pickPattern(key: PatternKey) {
    setPickedPattern(key);
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: PATTERNS[key].label },
      {
        role: 'assistant',
        content: `${PATTERNS[key].label} 형태의 목업과 구현 계획서를 만들고 있어요…`,
      },
    ]);
    setPhase('preview');
    await fetchPreview(key);
  }

  async function submitRevision(e: FormEvent) {
    e.preventDefault();
    const text = revisionText.trim();
    if (!text || previewLoading || !pickedPattern) return;
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: `변경 요청: ${text}` },
      { role: 'assistant', content: '수정해서 다시 만들어드릴게요…' },
    ]);
    setRevising(false);
    setRevisionText('');
    await fetchPreview(pickedPattern, {
      revisionRequest: text,
      previousMockupHtml: mockupHtml ?? undefined,
      previousPlanMarkdown: planMarkdown ?? undefined,
    });
  }

  function backToOptions() {
    setPhase('options');
    setMockupHtml(null);
    setPlanMarkdown(null);
    setPickedPattern(null);
    setMessages((prev) => [...prev, { role: 'user', content: '다른 형태로 다시 골라볼게요' }]);
  }

  function approve() {
    if (!pickedPattern) return;
    setPhase('approved');
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: '이대로 좋아요' },
      {
        role: 'assistant',
        content: `좋아요. ${PATTERNS[pickedPattern].label} 형태로 다듬을 준비가 됐어요. "코드 생성 시작"을 누르면 GitHub 이슈로 보낼게요.`,
      },
    ]);
  }

  async function startCodegen() {
    if (!pickedPattern || phase === 'emitting') return;
    setPhase('emitting');
    setError(null);
    try {
      const res = await fetch('/api/refine/emit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          appId,
          pickedPattern,
          summary,
          recommendedPatterns: recommended,
          mockupHtml,
          planMarkdown,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(humanError(data));
        setPhase('approved');
        return;
      }
      if (typeof data.issueNumber !== 'number' || typeof data.issueUrl !== 'string') {
        setError('GitHub 이슈를 만들지 못했어요. 잠시 후 다시 시도해주세요.');
        setPhase('approved');
        return;
      }
      setEmittedIssue({ issueNumber: data.issueNumber, issueUrl: data.issueUrl });
      setPhase('emitted');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `GitHub 이슈 #${data.issueNumber} 생성됐어요. 곧 코드가 만들어집니다.`,
        },
      ]);
    } catch (_err) {
      setError('연결이 끊겼어요. 잠시 후 다시 시도해주세요.');
      setPhase('approved');
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <ol
        ref={threadRef}
        data-testid="refine-thread"
        className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1"
      >
        {messages.map((m, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: append-only chat log
            key={i}
            className={
              m.role === 'assistant'
                ? 'self-start max-w-[80%] rounded-card bg-zinc-100 text-zinc-800 px-4 py-2.5 text-sm whitespace-pre-wrap'
                : 'self-end max-w-[80%] rounded-card bg-brand-500 text-white px-4 py-2.5 text-sm whitespace-pre-wrap'
            }
          >
            {m.content}
          </li>
        ))}
        {sending && (
          <li className="self-start inline-flex items-center gap-2 rounded-card bg-zinc-100 text-zinc-500 px-4 py-2.5 text-sm">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            생각하는 중…
          </li>
        )}
      </ol>

      {error && (
        <p
          data-testid="refine-error"
          className="rounded-card border border-red-200 bg-red-50 text-red-700 text-xs px-3 py-2"
        >
          {error}
        </p>
      )}

      {phase === 'asking' && (
        <form onSubmit={send} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
            placeholder="메시지를 입력하세요"
            aria-label="message"
            maxLength={2000}
            className="flex-1 rounded-btn border border-zinc-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:bg-zinc-50 disabled:text-zinc-400"
          />
          <button
            type="submit"
            disabled={sending || input.trim().length === 0}
            data-testid="refine-send"
            className="inline-flex items-center gap-1.5 rounded-btn bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-3 cursor-pointer disabled:bg-zinc-300 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}

      {phase === 'options' && (
        <div data-testid="refine-options" className="grid gap-3 sm:grid-cols-3">
          {recommended.map((key) => (
            <button
              key={key}
              type="button"
              data-testid={`refine-option-${key}`}
              onClick={() => pickPattern(key)}
              className="text-left rounded-card border border-zinc-200 bg-white p-4 hover:border-brand-300 hover:shadow-warm transition cursor-pointer"
            >
              <p className="text-[10px] font-mono uppercase tracking-widest text-brand-700">
                {key}
              </p>
              <p className="text-sm font-semibold mt-1">{PATTERNS[key].label}</p>
              <p className="text-xs text-zinc-600 mt-1">{PATTERNS[key].desc}</p>
            </button>
          ))}
        </div>
      )}

      {phase === 'preview' && (
        <div data-testid="refine-preview" className="flex flex-col gap-4">
          {/* status bar */}
          <div className="flex items-center justify-between rounded-card border border-zinc-200 bg-zinc-50/60 px-4 py-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono uppercase tracking-widest text-brand-700">preview</span>
              <span className="text-zinc-500">
                패턴: <span className="font-mono text-zinc-700">{pickedPattern}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={backToOptions}
              disabled={previewLoading}
              className="text-zinc-500 hover:text-zinc-900 underline-offset-2 hover:underline disabled:opacity-50"
            >
              패턴 다시 고르기
            </button>
          </div>

          {previewLoading ? (
            <div
              data-testid="refine-preview-loading"
              className="rounded-card border border-zinc-200 bg-zinc-50/60 p-10 flex flex-col items-center gap-3 text-zinc-500"
            >
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm">목업과 계획서를 생성하는 중… (10~20초)</p>
            </div>
          ) : mockupHtml && planMarkdown ? (
            <div className="grid grid-cols-1 md:grid-cols-[400px_1fr] divide-y md:divide-y-0 md:divide-x divide-zinc-100 rounded-card border border-zinc-200 bg-white overflow-hidden">
              {/* LEFT: mockup */}
              <div className="p-4 bg-zinc-50/40">
                <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-2">
                  화면 목업
                </p>
                <div className="mx-auto" style={{ width: 360 }}>
                  <div className="rounded-[2rem] border-4 border-zinc-900 bg-zinc-900 p-2 shadow-lg">
                    <div
                      className="rounded-[1.5rem] bg-white overflow-hidden"
                      style={{ height: 580 }}
                    >
                      <iframe
                        data-testid="refine-preview-mockup"
                        title="화면 목업"
                        srcDoc={wrapMockup(mockupHtml)}
                        sandbox="allow-scripts"
                        className="w-full h-full border-0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: plan */}
              <div className="p-5">
                <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-2">
                  구현 계획서
                </p>
                <pre
                  data-testid="refine-preview-plan"
                  className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap font-sans"
                >
                  {planMarkdown}
                </pre>
              </div>
            </div>
          ) : null}

          {/* action bar */}
          {!previewLoading && mockupHtml && (
            <div className="flex items-center justify-between rounded-card border border-zinc-200 bg-white px-4 py-3 gap-3">
              <button
                type="button"
                onClick={() => setRevising(true)}
                data-testid="refine-preview-revise"
                className="inline-flex items-center gap-1.5 text-sm text-zinc-700 hover:text-zinc-900 px-3 py-2 rounded-btn hover:bg-zinc-50"
              >
                <RefreshCcw className="w-4 h-4" />
                변경 요청
              </button>
              <button
                type="button"
                onClick={approve}
                data-testid="refine-preview-approve"
                className="inline-flex items-center gap-2 rounded-btn bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 cursor-pointer shadow-sm"
              >
                이대로 좋아요
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* revision modal (inline) */}
          {revising && (
            <form
              onSubmit={submitRevision}
              data-testid="refine-preview-revision-form"
              className="rounded-card border border-zinc-200 bg-white p-4 flex flex-col gap-3"
            >
              <label htmlFor="revision-text" className="text-sm font-semibold text-zinc-900">
                어떻게 바꿀까요?
              </label>
              <textarea
                id="revision-text"
                value={revisionText}
                onChange={(e) => setRevisionText(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="예: 헤더를 더 작게, 색감을 차분하게"
                className="rounded-btn border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRevising(false);
                    setRevisionText('');
                  }}
                  className="text-sm text-zinc-600 hover:text-zinc-900 px-3 py-2"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={revisionText.trim().length === 0}
                  className="inline-flex items-center gap-1.5 rounded-btn bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 disabled:bg-zinc-300 disabled:cursor-not-allowed"
                >
                  다시 만들기
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {(phase === 'approved' || phase === 'emitting' || phase === 'emitted') && pickedPattern && (
        <div
          data-testid="refine-picked-confirmation"
          className="rounded-card border border-brand-200 bg-brand-50/60 p-4 flex flex-col gap-3"
        >
          <div className="flex items-center gap-2 text-brand-800">
            <Sparkles className="w-4 h-4" />
            <p className="text-sm font-semibold">
              {PATTERNS[pickedPattern].label} 형태로 다듬을 준비가 됐어요
            </p>
          </div>

          {phase !== 'emitted' && (
            <p className="text-xs text-zinc-600">
              "코드 생성 시작"을 누르면 GitHub 이슈로 보내 코드 생성을 시작합니다.
            </p>
          )}

          {phase === 'emitted' && emittedIssue ? (
            <div data-testid="refine-emitted" className="flex flex-col gap-2">
              <p className="text-sm text-zinc-700">
                GitHub 이슈{' '}
                <a
                  data-testid="refine-emitted-link"
                  href={emittedIssue.issueUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-700 font-semibold underline underline-offset-2"
                >
                  #{emittedIssue.issueNumber}
                </a>{' '}
                생성됐어요. 곧 코드가 만들어집니다.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={startCodegen}
              disabled={phase === 'emitting'}
              data-testid="refine-emit-start"
              className="self-start inline-flex items-center gap-2 rounded-btn bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 cursor-pointer disabled:bg-zinc-300 disabled:cursor-not-allowed"
            >
              {phase === 'emitting' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  이슈 만드는 중…
                </>
              ) : (
                <>
                  코드 생성 시작
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function wrapMockup(html: string): string {
  // If the model already included a <script src="...tailwind"> tag, don't double-add.
  const hasTailwind = /cdn\.tailwindcss\.com/.test(html);
  return `<!doctype html><html><head><meta charset="utf-8" />${
    hasTailwind ? '' : '<script src="https://cdn.tailwindcss.com"></script>'
  }<style>html,body{margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;}</style></head><body>${html}</body></html>`;
}

function humanError(data: unknown): string {
  if (!data || typeof data !== 'object') return '문제가 생겼어요. 다시 시도해주세요.';
  const err = (data as { error?: unknown }).error;
  if (err === 'rate_limited') return '오늘 사용 한도(300건)에 도달했어요. 내일 다시 시도해주세요.';
  if (err === 'unauthenticated') return '로그인이 필요해요.';
  if (err === 'app_not_found') return '이 앱에 접근할 수 없어요.';
  if (err === 'upstream_failed') return 'AI 응답을 받지 못했어요. 잠시 후 다시 시도해주세요.';
  if (err === 'invalid_picked_pattern') return '선택한 패턴이 올바르지 않아요.';
  if (err === 'invalid_summary') return '대화 요약이 비어 있어요. 다시 시작해주세요.';
  if (err === 'misconfigured')
    return 'GitHub 이슈 연결이 아직 준비 중이에요. 잠시 후 다시 시도해주세요.';
  if (err === 'github_auth_failed')
    return 'GitHub 인증에 문제가 생겼어요. 잠시 후 다시 시도해주세요.';
  if (err === 'github_failed') return 'GitHub 이슈를 만들지 못했어요. 잠시 후 다시 시도해주세요.';
  return '문제가 생겼어요. 다시 시도해주세요.';
}
