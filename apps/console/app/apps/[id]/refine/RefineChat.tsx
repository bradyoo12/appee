'use client';

import { ArrowRight, Loader2, Send, Sparkles } from 'lucide-react';
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
type Phase = 'asking' | 'options' | 'picked';

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
  const [pickedPattern, setPickedPattern] = useState<PatternKey | null>(null);

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
        // Roll back the optimistic user message so the user can retry / edit.
        setMessages(messages);
        setInput(text);
        return;
      }
      setMessages([...nextMessages, { role: 'assistant', content: data.assistantMessage }]);
      if (data.phase === 'options' && Array.isArray(data.recommendedPatterns)) {
        setRecommended(data.recommendedPatterns);
        setPhase('options');
      }
    } catch (err) {
      setError('연결이 끊겼어요. 잠시 후 다시 시도해주세요.');
      setMessages(messages);
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  function pickPattern(key: PatternKey) {
    setPickedPattern(key);
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: PATTERNS[key].label },
      {
        role: 'assistant',
        content: `좋아요. ${PATTERNS[key].label} 형태로 다듬을게요. 다음 단계에서 실제 화면을 만들어 폰에 반영합니다.`,
      },
    ]);
    setPhase('picked');
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
        <p className="rounded-card border border-red-200 bg-red-50 text-red-700 text-xs px-3 py-2">
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

      {phase === 'picked' && pickedPattern && (
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
          <p className="text-xs text-zinc-600">
            실제 코드 생성은 다음 단계에서 GitHub 이슈와 EAS 빌드 파이프라인으로 연결됩니다.
          </p>
          <button
            type="button"
            disabled
            className="self-start inline-flex items-center gap-2 rounded-btn bg-zinc-200 text-zinc-500 text-sm font-semibold px-4 py-2 cursor-not-allowed"
          >
            코드 생성 시작 (곧 연결) <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function humanError(data: unknown): string {
  if (!data || typeof data !== 'object') return '문제가 생겼어요. 다시 시도해주세요.';
  const err = (data as { error?: unknown }).error;
  if (err === 'rate_limited') return '오늘 사용 한도(300건)에 도달했어요. 내일 다시 시도해주세요.';
  if (err === 'unauthenticated') return '로그인이 필요해요.';
  if (err === 'app_not_found') return '이 앱에 접근할 수 없어요.';
  if (err === 'upstream_failed') return 'AI 응답을 받지 못했어요. 잠시 후 다시 시도해주세요.';
  return '문제가 생겼어요. 다시 시도해주세요.';
}
