import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { z } from "zod";

// 나중에 실제 LLM 호출 붙일 때까지는 mock으로
async function callModel(apiModelId: string, prompt: string): Promise<string> {
  return `Mock response from ${apiModelId} for: ${prompt}`;
}

const createMatchSchema = z.object({
  prompt: z.string().min(1)
});

export const createMatchHandler = async (req: Request, res: Response) => {
  const parse = createMatchSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const { prompt } = parse.data;

  // 1. 프롬프트 저장 (익명 유저라고 가정)
  const promptRow = await prisma.prompt.create({
    data: { text: prompt }
  });

  // 2. 임시로 모델 2개 랜덤 선택 (지금은 첫 2개)
  const models = await prisma.model.findMany({ take: 2 });
  if (models.length < 2) {
    return res.status(500).json({ error: "Not enough models registered" });
  }

  const [modelA, modelB] = models;

  // 3. 매치 생성
  const match = await prisma.match.create({
    data: {
      promptId: promptRow.id,
      modelAId: modelA.id,
      modelBId: modelB.id
    }
  });

  // 4. 두 모델에 응답 요청 (지금은 mock)
  const [contentA, contentB] = await Promise.all([
    callModel(modelA.apiModelId, prompt),
    callModel(modelB.apiModelId, prompt)
  ]);

  await prisma.response.createMany({
    data: [
      {
        matchId: match.id,
        modelId: modelA.id,
        position: "A",
        content: contentA
      },
      {
        matchId: match.id,
        modelId: modelB.id,
        position: "B",
        content: contentB
      }
    ]
  });

  return res.json({
    matchId: match.id,
    prompt,
    responseA: { content: contentA },
    responseB: { content: contentB }
  });
};

const voteSchema = z.object({
  matchId: z.number(),
  chosen: z.enum(["A", "B"])
});

export const voteHandler = async (req: Request, res: Response) => {
  const parse = voteSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const { matchId, chosen } = parse.data;

  const match = await prisma.match.findUnique({
    where: { id: matchId }
  });

  if (!match) {
    return res.status(404).json({ error: "Match not found" });
  }

  // TODO: userId, ipHash 나중에 추가
  await prisma.vote.create({
    data: {
      matchId,
      chosenPosition: chosen
    }
  });

  // 나중에 여기서 Elo 업데이트 로직 호출
  return res.json({ ok: true });
};
