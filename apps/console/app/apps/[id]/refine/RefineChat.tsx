'use client';

import { ArrowRight, Sparkles } from 'lucide-react';
import { useState } from 'react';

type Question = {
  id: 'primary-action' | 'density' | 'visual';
  prompt: string;
  choices: { value: string; label: string }[];
};

const QUESTIONS: Question[] = [
  {
    id: 'primary-action',
    prompt: '이 화면에서 사용자가 가장 자주 할 행동은 뭔가요?',
    choices: [
      { value: 'browse', label: '훑어보기 · 탐색' },
      { value: 'compare', label: '비교하기' },
      { value: 'input', label: '입력 · 기록' },
      { value: 'decide', label: '한 번에 결정' },
    ],
  },
  {
    id: 'density',
    prompt: '정보를 한 번에 많이 보고 싶나요, 하나씩 집중하고 싶나요?',
    choices: [
      { value: 'dense', label: '많이 한눈에' },
      { value: 'focus', label: '하나씩 집중' },
    ],
  },
  {
    id: 'visual',
    prompt: '핵심 콘텐츠는 어떤 종류인가요?',
    choices: [
      { value: 'image', label: '이미지 · 사진' },
      { value: 'text', label: '글 · 설명' },
      { value: 'number', label: '숫자 · 통계' },
    ],
  },
];

type PatternKey = 'list' | 'grid' | 'card' | 'sheet' | 'fullscreen';

const PATTERNS: Record<PatternKey, { label: string; desc: string }> = {
  list: { label: '리스트', desc: '한 줄 = 한 항목. 정보 밀도가 높을 때.' },
  grid: { label: '그리드', desc: '정사각형 칸 반복. 이미지·아이콘 위주.' },
  card: { label: '카드', desc: '제목 + 이미지 + 버튼 묶음. 피드·읽을거리에.' },
  sheet: { label: '바텀시트', desc: '화면 아래에서 올라옴. 입력·필터·세부정보.' },
  fullscreen: { label: '풀스크린', desc: '한 번에 한 장. 위아래 스와이프 몰입형.' },
};

type Answers = Partial<Record<Question['id'], string>>;

// Simple weighted heuristic — replaced by LLM in Step C.
function recommend(answers: Answers): PatternKey[] {
  const score: Record<PatternKey, number> = {
    list: 0,
    grid: 0,
    card: 0,
    sheet: 0,
    fullscreen: 0,
  };
  if (answers.density === 'dense') {
    score.list += 2;
    score.grid += 2;
  }
  if (answers.density === 'focus') {
    score.card += 2;
    score.fullscreen += 2;
  }
  if (answers.visual === 'image') {
    score.grid += 2;
    score.fullscreen += 1;
  }
  if (answers.visual === 'text') {
    score.card += 1;
    score.list += 1;
  }
  if (answers.visual === 'number') {
    score.list += 2;
  }
  if (answers['primary-action'] === 'browse') {
    score.grid += 1;
    score.fullscreen += 1;
  }
  if (answers['primary-action'] === 'compare') {
    score.list += 1;
    score.card += 1;
  }
  if (answers['primary-action'] === 'input') {
    score.sheet += 2;
    score.list += 1;
  }
  if (answers['primary-action'] === 'decide') {
    score.card += 1;
    score.fullscreen += 1;
  }
  return (Object.entries(score) as [PatternKey, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);
}

type Message = { role: 'assistant'; text: string } | { role: 'user'; text: string };

type Phase = 'asking' | 'options' | 'picked';

const FIRST_QUESTION = QUESTIONS[0]!;

export function RefineChat({ appName }: { appName: string }) {
  const [phase, setPhase] = useState<Phase>('asking');
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: `좋아요. "${appName}"를 어떤 형태로 다듬을지 같이 정해볼게요.`,
    },
    { role: 'assistant', text: FIRST_QUESTION.prompt },
  ]);
  const [pickedPattern, setPickedPattern] = useState<PatternKey | null>(null);

  const current = QUESTIONS[stepIdx];

  function answerCurrent(value: string, label: string) {
    if (!current) return;
    const nextAnswers = { ...answers, [current.id]: value };
    const nextMessages: Message[] = [...messages, { role: 'user', text: label }];
    const nextIdx = stepIdx + 1;
    const nextQuestion = QUESTIONS[nextIdx];

    if (nextQuestion) {
      nextMessages.push({ role: 'assistant', text: nextQuestion.prompt });
      setMessages(nextMessages);
      setAnswers(nextAnswers);
      setStepIdx(nextIdx);
    } else {
      nextMessages.push({
        role: 'assistant',
        text: '좋아요. 답해주신 내용으로 가장 잘 맞을 만한 화면 형태 3가지를 추천드릴게요.',
      });
      setMessages(nextMessages);
      setAnswers(nextAnswers);
      setPhase('options');
    }
  }

  function pickPattern(key: PatternKey) {
    setPickedPattern(key);
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: PATTERNS[key].label },
      {
        role: 'assistant',
        text: `좋아요. **${PATTERNS[key].label}** 형태로 다듬을게요. 다음 단계에서 실제 화면을 만들어 폰에 반영합니다.`,
      },
    ]);
    setPhase('picked');
  }

  const recommended = phase === 'options' ? recommend(answers) : [];

  return (
    <div className="mt-6 flex flex-col gap-4">
      <ol data-testid="refine-thread" className="flex flex-col gap-2">
        {messages.map((m, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: append-only chat log, indices are stable
            key={i}
            className={
              m.role === 'assistant'
                ? 'self-start max-w-[80%] rounded-card bg-zinc-100 text-zinc-800 px-4 py-2.5 text-sm'
                : 'self-end max-w-[80%] rounded-card bg-brand-500 text-white px-4 py-2.5 text-sm'
            }
          >
            {m.text}
          </li>
        ))}
      </ol>

      {phase === 'asking' && current && (
        <div
          data-testid={`refine-choices-${current.id}`}
          className="flex flex-wrap gap-2 self-start"
        >
          {current.choices.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => answerCurrent(c.value, c.label)}
              className="text-sm rounded-btn border border-zinc-200 bg-white hover:border-brand-300 hover:bg-brand-50 px-3 py-1.5 cursor-pointer"
            >
              {c.label}
            </button>
          ))}
        </div>
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
            실제 코드 생성은 다음 단계(Step C)에서 Claude API와 연결됩니다.
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
