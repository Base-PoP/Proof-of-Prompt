import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { updateElo, EloOutcome } from "./elo";
import { callFlockModel, judgeFlock } from "../../lib/flock";
import { calculateConsistencyScore } from "../scoring/consistencyScore";

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
/*  1. 매치 생성: /arena/match                                        */
/* ------------------------------------------------------------------ */
export const createMatchHandler = async (req: Request, res: Response) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const { prompt, userId } = parsed.data;

  try {
    // Postman 헤더로 인해 Flock 호출 시 충돌 방지
    delete req.headers["x-api-key"];
    delete req.headers["authorization"];

    console.log("🔥 [MATCH] Incoming request:", { prompt, userId });

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

    // 실제 Flock API 호출
    console.log("🟩 Calling REAL Flock API");
    const responseAText = await callFlockModel(modelA.apiModelId, prompt);
    const responseBText = await callFlockModel(modelB.apiModelId, prompt);

    // 4) DB에 Response 저장
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
      modelAId: modelA.id,
      modelBId: modelB.id,
      responseA: responseAText,
      responseB: responseBText
    });
  } catch (err: any) {
    console.error("❌ [MATCH ERROR]", err?.response?.data || err);
    return res.status(500).json({
      error: "Flock API call failed",
      detail: err?.response?.data || String(err)
    });
  }
};

/* ------------------------------------------------------------------ */
/*  2. 투표: /arena/vote                                              */
/* ------------------------------------------------------------------ */
export const voteHandler = async (req: Request, res: Response) => {
  const parsed = voteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const { matchId, chosen, userId } = parsed.data;

  try {
    delete req.headers["x-api-key"];
    delete req.headers["authorization"];

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

    console.log("⚖ [FLOCK JUDGE] evaluating...");

    // 4) reference LLM judge (mock는 judge에 적용 X)
    const refChoice = await judgeFlock(
      match.prompt.text,
      responseA.content,
      responseB.content
    );

    // 5) reference 점수 계산
    const referenceScore = refChoice === chosen ? REF_CORRECT_BONUS : 0;

    // 6) consistency 점수 계산 (최근 투표 패턴 기반)
    const consistencyScore = await calculateConsistencyScore(user.id);

    const consensusScore = 0; // 캠페인 종료 시 배치로 계산
    const totalScore =
      BASE_PARTICIPATION_SCORE +
      referenceScore +
      consensusScore +
      consistencyScore;

    console.log(
      `📊 [SCORE] User ${user.id}: participation=1, reference=${referenceScore}, ` +
      `consistency=${consistencyScore}, total=${totalScore}`
    );

    // 7) vote 업데이트
    vote = await prisma.vote.update({
      where: { id: vote.id },
      data: {
        referenceScore,
        consensusScore,
        consistencyScore,
        totalScore
      }
    });

    // 8) Elo 계산
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

    // 9) 유저 점수 업데이트
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
    console.error("❌ [VOTE ERROR]", err?.response?.data || err);
    return res.status(500).json({
      error: "Judge failed",
      detail: err?.response?.data || String(err)
    });
  }
};
