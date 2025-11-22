// src/modules/mock/mock.service.ts

import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { updateElo, EloOutcome } from "../arena/elo";

// -------- Mock LLM 응답 생성 --------
export async function generateMockLLM(prompt: string, model: any) {
  return `
[MOCK RESPONSE - ${model.name}]
Prompt: ${prompt}

This is a mock response for testing during weekdays.
  `;
}

// -------- Mock Judge --------
async function mockJudge(prompt: string, responseA: string, responseB: string): Promise<"A" | "B" | "TIE"> {
  const rand = Math.random();
  return rand < 0.33 ? "A" : rand < 0.66 ? "B" : "TIE";
}

// -------- 매치 생성 스키마 --------
const createMatchSchema = z.object({
  prompt: z.string().min(1),
  userId: z.coerce.number().optional()
});

// -------- 투표 스키마 --------
const voteSchema = z.object({
  matchId: z.coerce.number(),
  chosen: z.enum(["A", "B", "TIE"]),
  userId: z.coerce.number()
});

const BASE_PARTICIPATION_SCORE = 1;
const REF_CORRECT_BONUS = 3;

/* ------------------------------------------------------------------ */
/*  Mock 매치 생성                                                     */
/* ------------------------------------------------------------------ */
export const createMockMatchHandler = async (req: Request, res: Response) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const { prompt, userId } = parsed.data;

  try {
    console.log("🔥 [MOCK MATCH] Incoming request:", { prompt, userId });

    // 1) rating 상위 2개 모델
    const models = await prisma.model.findMany({
      orderBy: { rating: "desc" },
      take: 2
    });

    if (models.length < 2) {
      return res.status(400).json({ error: "Not enough models registered" });
    }

    const modelA = models[0];
    const modelB = models[1];

    // 2) Prompt 저장
    const createdPrompt = await prisma.prompt.create({
      data: {
        text: prompt
      }
    });

    // 3) Match 생성
    const match = await prisma.match.create({
      data: {
        promptId: createdPrompt.id,
        modelAId: modelA.id,
        modelBId: modelB.id
      }
    });

    // 4) Mock 응답 생성
    console.log("🟦 Using MOCK responses");
    const responseAText = await generateMockLLM(prompt, modelA);
    const responseBText = await generateMockLLM(prompt, modelB);

    // 5) DB에 Response 저장
    const responseA = await prisma.response.create({
      data: {
        matchId: match.id,
        modelId: modelA.id,
        position: "A",
        content: responseAText
      }
    });

    const responseB = await prisma.response.create({
      data: {
        matchId: match.id,
        modelId: modelB.id,
        position: "B",
        content: responseBText
      }
    });

    return res.json({
      matchId: match.id,
      prompt,
      modelA,
      modelB,
      responseA,
      responseB
    });
  } catch (err: any) {
    console.error("❌ [MOCK MATCH ERROR]", err);
    return res.status(500).json({
      error: "Mock match creation failed",
      detail: String(err)
    });
  }
};

/* ------------------------------------------------------------------ */
/*  Mock 투표                                                          */
/* ------------------------------------------------------------------ */
export const voteMockHandler = async (req: Request, res: Response) => {
  const parsed = voteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const { matchId, chosen, userId } = parsed.data;

  try {
    // 1) match 조회
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        modelA: true,
        modelB: true,
        responses: true,
        prompt: true
      }
    });

    if (!match || !match.modelA || !match.modelB || !match.prompt) {
      return res.status(404).json({ error: "Match not found" });
    }

    const responseA = match.responses.find((r) => r.position === "A");
    const responseB = match.responses.find((r) => r.position === "B");
    if (!responseA || !responseB) {
      return res.status(500).json({ error: "Responses missing" });
    }

    // 2) user upsert
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        nickname: `User${userId}`
      }
    });

    // 3) Vote 생성
    let vote = await prisma.vote.create({
      data: {
        matchId,
        userId: user.id,
        chosenPosition: chosen
      }
    });

    console.log("⚖ [MOCK JUDGE] evaluating...");

    // 4) Mock judge
    const refChoice = await mockJudge(
      match.prompt.text,
      responseA.content,
      responseB.content
    );

    // 5) reference 점수 계산
    const referenceScore = refChoice === chosen ? REF_CORRECT_BONUS : 0;

    const consensusScore = 0;
    const consistencyScore = 0;
    const totalScore =
      BASE_PARTICIPATION_SCORE +
      referenceScore +
      consensusScore +
      consistencyScore;

    // 6) vote 업데이트
    vote = await prisma.vote.update({
      where: { id: vote.id },
      data: {
        referenceScore,
        consensusScore,
        consistencyScore,
        totalScore
      }
    });

    // 7) Elo 계산
    const outcome: EloOutcome =
      chosen === "A" ? "A_WIN" : chosen === "B" ? "B_WIN" : "TIE";

    const { newRatingA, newRatingB } = updateElo(
      match.modelA.rating,
      match.modelB.rating,
      outcome
    );

    const [updatedA, updatedB] = await Promise.all([
      prisma.model.update({
        where: { id: match.modelAId },
        data: {
          rating: newRatingA,
          gamesPlayed: { increment: 1 }
        }
      }),
      prisma.model.update({
        where: { id: match.modelBId },
        data: {
          rating: newRatingB,
          gamesPlayed: { increment: 1 }
        }
      })
    ]);

    // 8) 유저 점수 업데이트
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        score: { increment: totalScore }
      }
    });

    return res.json({
      ok: true,
      matchId,
      refChoice,
      modelA: updatedA,
      modelB: updatedB,
      user: updatedUser,
      vote
    });
  } catch (err: any) {
    console.error("❌ [MOCK VOTE ERROR]", err);
    return res.status(500).json({
      error: "Mock vote failed",
      detail: String(err)
    });
  }
};

