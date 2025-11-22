import { Router } from "express";
import { prisma } from "../../lib/prisma";

export const leaderboardRouter = Router();

// 모델 Elo 순위
leaderboardRouter.get("/models", async (_req, res) => {
  const models = await prisma.model.findMany({
    orderBy: { rating: "desc" }
  });

  const result = models.map((m, idx) => ({
    rank: idx + 1,
    id: m.id,
    name: m.name,
    provider: m.provider,
    rating: Math.round(m.rating),
    gamesPlayed: m.gamesPlayed
  }));

  res.json(result);
});

// 유저 점수 순위
leaderboardRouter.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { score: "desc" },
    take: 50
  });

  const result = users.map((u, idx) => ({
    rank: idx + 1,
    id: u.id,
    nickname: u.nickname,
    score: u.score
  }));

  res.json(result);
});
