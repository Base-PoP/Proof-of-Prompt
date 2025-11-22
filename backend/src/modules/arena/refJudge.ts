// src/modules/arena/refJudge.ts

export type Choice = "A" | "B" | "TIE";

interface RefJudgeInput {
  prompt: string;
  responseA: string;
  responseB: string;
}

/**
 * ⚠️ 지금은 mock 구현.
 * 나중에 여기서 OpenAI/Anthropic 같은 레퍼런스 LLM을 호출해서
 * 어떤 쪽이 더 좋은지 판단하도록 교체하면 됨.
 */
export async function getReferenceChoice(
  input: RefJudgeInput
): Promise<Choice> {
  const { prompt, responseA, responseB } = input;

  // TODO: 여기서 실제 LLM 호출 붙이기
  // 지금은 데모용으로 간단한 mock 로직:
  // 길이가 긴 쪽을 더 "정보 많다"라고 보고 A/B 결정
  if (responseA.length > responseB.length + 20) return "A";
  if (responseB.length > responseA.length + 20) return "B";

  // 비슷하면 비김 처리
  return "TIE";
}
