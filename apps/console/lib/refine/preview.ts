import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { PATTERN_KEYS, type PatternKey } from './anthropic';

const SYSTEM_PROMPT = `당신은 사용자가 만들 모바일 앱 화면 한 장의 **시각적 목업(HTML)**과 **구현 계획서(markdown)**를 만들어내는 UX 디자이너입니다.

# 입력
- 앱 이름과 한 줄 설명
- 사용자와의 대화 요약 (지금까지 어떤 화면을 원하는지)
- 사용자가 선택한 UI 패턴 (list / grid / card / sheet / fullscreen 중 하나)
- (선택) 사용자의 변경 요청 + 이전 목업 HTML

# 출력 (반드시 emit_preview 도구 호출로)
\`emit_preview({ mockupHtml, planMarkdown })\`

## mockupHtml 규칙
- 단일 화면, 폰 사이즈 (가로 360px 기준 디자인). 외부 \`<html>\`/\`<body>\` 태그 X — 본문 콘텐츠만 \`<div>\` 등으로 시작.
- Tailwind class만 사용. iframe srcDoc 안에 들어가므로 \`<script src="https://cdn.tailwindcss.com">\`을 mockupHtml 최상단에 포함해도 좋음.
- **NativeWind 호환 class만 사용** — \`text-*\` \`bg-*\` \`flex\` \`flex-row\` \`flex-col\` \`p-*\` \`m-*\` \`gap-*\` \`rounded-*\` \`w-*\` \`h-*\` \`border-*\` \`grid\` \`grid-cols-*\`. 웹 전용 (\`hover:\`, \`focus:\`, \`backdrop-*\`, \`prose\` 등) 금지.
- 진짜 같은 더미 데이터 ("친구 23명", "오늘 8건" 같은 plausible 숫자). "Lorem ipsum" 금지.
- 이미지는 \`<div>\` + bg-gradient로 표현 (외부 URL 로딩 금지).
- \`<script>\`, \`<form>\`, \`<input>\` 같은 인터랙티브 요소 최소화 (정적 미리보기만).
- 200~600 lines 권장.

## planMarkdown 규칙
- 다음 섹션 순서로:
  1. **화면 한 줄 요약** — 무슨 화면인지 한 문장.
  2. **변경/추가 파일** — \`templates/expo-base/app/...\` 같은 구체적 경로. 신규/수정 표기.
  3. **컴포넌트 분해** — 화면을 구성하는 ~3-5개 컴포넌트 + 각 책임.
  4. **사용 라이브러리** — Expo SDK 외 새로 도입할 패키지 (있으면).
  5. **예상 작업 단위** — 순서대로 ~3-5개 step.
- 마크다운 헤더는 \`###\` 부터 시작 (페이지 안에 임베드되니까 \`#\`/\`##\` 금지).
- 짧고 명확하게. 한 섹션 ~5줄.

# 변경 요청 처리
\`revisionRequest\`가 있으면 이전 mockup을 **수정**해서 다시 출력. 처음부터 다시 만들지 말고 사용자가 지적한 부분만 손보세요.

# 금지
- 사용자에게 질문 던지지 마세요. 받은 정보로 바로 만드세요.
- 두 화면 이상 생성 금지. 단일 화면만.
- iOS/Android native module 언급 금지 (Expo 표준만).`;

const EMIT_PREVIEW_TOOL: Anthropic.Tool = {
  name: 'emit_preview',
  description:
    '사용자가 만들 화면의 Tailwind HTML 목업과 markdown 구현 계획서를 한꺼번에 출력합니다.',
  input_schema: {
    type: 'object',
    properties: {
      mockupHtml: {
        type: 'string',
        description:
          '단일 화면의 Tailwind HTML. 폰 사이즈 360px 기준. NativeWind 호환 class만 사용.',
      },
      planMarkdown: {
        type: 'string',
        description: '5섹션 구조의 markdown 계획서. ### 헤더부터 시작.',
      },
    },
    required: ['mockupHtml', 'planMarkdown'],
  },
};

export type PreviewMessage = { role: 'user' | 'assistant'; content: string };

export type PreviewResult = {
  mockupHtml: string;
  planMarkdown: string;
};

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    client = new Anthropic();
  }
  return client;
}

export async function runRefinePreview(params: {
  appName: string;
  appHeadline: string;
  pickedPattern: PatternKey;
  summary: string;
  messages: PreviewMessage[];
  revisionRequest?: string;
  previousMockupHtml?: string;
  previousPlanMarkdown?: string;
}): Promise<PreviewResult> {
  const {
    appName,
    appHeadline,
    pickedPattern,
    summary,
    messages,
    revisionRequest,
    previousMockupHtml,
    previousPlanMarkdown,
  } = params;
  const c = getClient();

  if (!(PATTERN_KEYS as readonly string[]).includes(pickedPattern)) {
    throw new Error(`Invalid pickedPattern: ${pickedPattern}`);
  }

  const conversationSummary = messages
    .slice(-10)
    .map((m) => `[${m.role}] ${m.content}`)
    .join('\n');

  const userContent: string[] = [
    '# 앱 컨텍스트',
    `앱 이름: ${appName}`,
    `한 줄 설명: ${appHeadline}`,
    '',
    '# 사용자가 선택한 UI 패턴',
    pickedPattern,
    '',
    '# 한 줄 요약 (대화에서 추출됨)',
    summary,
    '',
    '# 대화 발췌 (최근 10턴)',
    conversationSummary,
  ];

  if (revisionRequest && previousMockupHtml) {
    userContent.push(
      '',
      '# 변경 요청',
      revisionRequest,
      '',
      '# 이전 mockupHtml (이걸 수정하세요)',
      '```html',
      previousMockupHtml,
      '```',
    );
    if (previousPlanMarkdown) {
      userContent.push('', '# 이전 planMarkdown (참고용)', previousPlanMarkdown);
    }
  }

  userContent.push('', '위 정보로 emit_preview 도구를 호출하세요.');

  const response = await c.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [EMIT_PREVIEW_TOOL],
    tool_choice: { type: 'tool', name: 'emit_preview' },
    messages: [{ role: 'user', content: userContent.join('\n') }],
  });

  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === 'emit_preview') {
      const input = block.input as { mockupHtml?: unknown; planMarkdown?: unknown };
      const mockupHtml = typeof input.mockupHtml === 'string' ? input.mockupHtml : '';
      const planMarkdown = typeof input.planMarkdown === 'string' ? input.planMarkdown : '';
      if (!mockupHtml || !planMarkdown) {
        throw new Error('emit_preview returned empty mockupHtml or planMarkdown');
      }
      return { mockupHtml, planMarkdown };
    }
  }

  throw new Error('Sonnet did not call emit_preview tool');
}
