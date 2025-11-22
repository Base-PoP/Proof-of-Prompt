import { Router } from "express";
import { prisma } from "../../lib/prisma";

export const leaderboardRouter = Router();

// 아주 단순: 모델별 응답 수 기준 (나중에 Elo로 교체)
leaderboardRouter.get("/models", async (_req, res) => {
  const data = await prisma.model.findMany({
    include: {
      responses: true
    }
  });

  const result = data.map((m) => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
    responsesCount: m.responses.length
  }));

  res.json(result);
});
