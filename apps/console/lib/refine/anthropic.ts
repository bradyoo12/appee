import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

// Catalog of UI patterns the model can recommend. Order doesn't matter —
// the model gets all five and picks the top 3 for the user's case.
export const PATTERN_KEYS = ['list', 'grid', 'card', 'sheet', 'fullscreen'] as const;
export type PatternKey = (typeof PATTERN_KEYS)[number];

const PATTERN_CATALOG = `
- list: 한 줄 = 한 항목. 정보 밀도가 높을 때. 메일·연락처·가계부에 강함.
- grid: 정사각형 칸 반복. 이미지·아이콘 위주. 갤러리·앱 서랍 패턴.
- card: 제목 + 이미지 + 버튼 묶음. 피드·읽을거리·하나씩 결정에 강함.
- sheet: 화면 아래에서 올라오는 패널 (바텀시트). 입력·필터·세부정보 보조.
- fullscreen: 한 번에 한 장, 위아래 스와이프 몰입형. 틱톡·인스타 스토리 유형.
`.trim();

const SYSTEM_PROMPT = `당신은 사용자의 모바일 앱(React Native, Expo) 화면 한 장을 함께 설계하는 UX 디자이너입니다. 사용자는 비개발자일 수도 있으니 친근한 반말은 피하고 짧고 명확한 존댓말로 대화하세요.

# 사용 가능한 화면 형태 카탈로그
${PATTERN_CATALOG}

# 진행 방식
1. 사용자의 첫 메시지를 받으면, 무엇을 만들고 싶은지 파악하기 위해 **짧은 질문 2~4개**를 한 번에 하나씩 던지세요.
2. 좋은 질문 예시: "이 화면에서 가장 자주 할 행동이 뭔가요?" / "정보를 한눈에 많이 보고 싶나요, 하나씩 집중하고 싶나요?" / "핵심 콘텐츠가 이미지인가요, 텍스트인가요?"
3. 한 번에 질문은 1개만. 사용자가 답하면 그 답을 인정한 뒤 다음 질문.
4. 필요한 정보가 충분해지면 (보통 2~3번의 응답 후), \`recommend_patterns\` 도구를 호출하세요.
5. 추천은 카탈로그 5개 중 **상황에 가장 잘 맞는 3개**. 인기 패턴이 아니라 **이 사용자의 화면**에 맞는 것을 고르세요.

# 1위 선정 우선순위 (강함 → 약함)
사용자가 말한 표현을 다음 순서로 가중하세요. 위쪽 신호가 아래쪽보다 강합니다.

① 밀도/탐색 방식 (가장 강한 신호)
  - "한 번에 많이" / "한눈에" / "쭉" / "스크롤로 둘러보기" / "리스트로" → list 또는 grid가 1위
  - "한 장씩" / "몰입" / "위아래 스와이프" / "넘기면서" → fullscreen 또는 card가 1위
  - "빠르게 입력" / "기록" / "팝업으로" → sheet 또는 list가 1위

② 콘텐츠 종류 (보조 신호, ①과 같이 묶어서 결정)
  - 이미지·사진 위주 → ①이 "많이"면 **grid**, ①이 "한 장씩"이면 **fullscreen**
  - 텍스트·숫자 위주 → ①이 "많이"면 **list**, ①이 "한 장씩"이면 **card**

③ 주 행동 (가장 약한 신호, 동률일 때만 사용)
  - 탐색/훑기 → grid·fullscreen 우대
  - 비교/결정 → list·card 우대
  - 입력/기록 → sheet 우대

**예시**:
- "사진 갤러리, 친구들 사진 한눈에" → ① 한눈에=list/grid → ② 이미지=grid → **1위 grid**
- "사진 한 장씩 몰입해서 보기" → ① 한 장씩=fullscreen/card → ② 이미지=fullscreen → **1위 fullscreen**
- "가계부, 매일 적은 거 쭉" → ① 쭉=list → ② 숫자=list → **1위 list**
- "친구 목록, 빨리 찾기" → ① 한눈에 암시=list → ② 텍스트=list → **1위 list**
- "명상 음성 매일 하나씩" → ① 하나씩=fullscreen/card → ② 거의 빈 화면(이미지·텍스트 둘 다 약함) → ③ 결정/시작 → **1위 fullscreen**
- "할 일 빠르게 입력" → ① 빠르게 입력=sheet → **1위 sheet**

사용자가 ①을 말하지 않았으면 **②/③으로 추론하기 전에 ①을 직접 물어보세요** ("한 번에 많이 보고 싶나요, 하나씩 집중인가요?"). 추측 금지.

# 톤
- 짧게. 한 메시지 최대 3문장.
- 전문 용어 최소화. "리스트", "그리드", "카드" 같은 일상어를 그대로 사용.
- "좋아요", "그렇군요" 같은 가벼운 호응 OK.

# 금지
- 마크다운 헤더(#, ##), 불릿(-, *), 굵은체(**) 등 서식 사용 금지. 일반 문장으로만 답하세요.
- "선호하는 색은?" 같이 화면 형태와 무관한 질문 금지 (디자인은 다른 단계에서 다룸).
- 코드, 기술 스택 언급 금지.
- 사용자가 명확히 원하는 게 있으면 굳이 추가 질문 던지지 말고 바로 \`recommend_patterns\` 호출.`;

const RECOMMEND_TOOL: Anthropic.Tool = {
  name: 'recommend_patterns',
  description:
    '사용자가 만들려는 화면에 가장 잘 맞는 UI 패턴 상위 3개를 추천합니다. 충분한 정보를 모은 뒤 호출하세요.',
  input_schema: {
    type: 'object',
    properties: {
      patterns: {
        type: 'array',
        description: '상위 3개의 패턴 키. 가장 추천하는 것부터 순서대로.',
        items: {
          type: 'string',
          enum: PATTERN_KEYS as unknown as string[],
        },
      },
      summary: {
        type: 'string',
        description:
          '사용자가 만들려는 화면을 한 문장으로 요약. 다음 단계의 코드 생성에 전달될 스펙.',
      },
    },
    required: ['patterns', 'summary'],
  },
};

export type RefineMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string };

export type RefineApiResult =
  | { phase: 'asking'; assistantMessage: string }
  | {
      phase: 'options';
      assistantMessage: string;
      recommendedPatterns: PatternKey[];
      summary: string;
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

export async function runRefineTurn(params: {
  appName: string;
  appHeadline: string;
  messages: RefineMessage[];
}): Promise<RefineApiResult> {
  const { appName, appHeadline, messages } = params;
  const c = getClient();

  // Context about the app gets injected as a system suffix. Kept after the
  // stable prefix so cache_control on the first block still hits.
  const appContext = `\n\n# 현재 작업 중인 앱\n앱 이름: ${appName}\n한 줄 설명: ${appHeadline}`;

  const response = await c.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
      { type: 'text', text: appContext },
    ],
    tools: [RECOMMEND_TOOL],
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  let assistantText = '';
  let toolCall: { patterns: PatternKey[]; summary: string } | null = null;

  for (const block of response.content) {
    if (block.type === 'text') {
      assistantText += block.text;
    } else if (block.type === 'tool_use' && block.name === 'recommend_patterns') {
      const input = block.input as { patterns?: unknown; summary?: unknown };
      const patterns = Array.isArray(input.patterns)
        ? input.patterns.filter(
            (p): p is PatternKey =>
              typeof p === 'string' && (PATTERN_KEYS as readonly string[]).includes(p),
          )
        : [];
      const summary = typeof input.summary === 'string' ? input.summary : '';
      if (patterns.length >= 1) {
        toolCall = { patterns: patterns.slice(0, 3), summary };
      }
    }
  }

  if (toolCall) {
    return {
      phase: 'options',
      assistantMessage:
        assistantText.trim() ||
        '좋아요. 답해주신 내용으로 가장 잘 맞을 만한 화면 형태를 골라봤어요.',
      recommendedPatterns: toolCall.patterns,
      summary: toolCall.summary,
    };
  }

  return {
    phase: 'asking',
    assistantMessage: assistantText.trim() || '다시 한 번 설명해 주실 수 있을까요?',
  };
}
