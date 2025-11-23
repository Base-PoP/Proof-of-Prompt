import { Router } from "express";
import { prisma } from "../../lib/prisma";

export const leaderboardRouter = Router();

// 모델 채택률 순위
leaderboardRouter.get("/models", async (_req, res) => {
  const models = await prisma.model.findMany({
    include: {
      matchesAsA: {
        include: {
          prompt: true
        }
      }
    }
  });

  const modelStats = models.map(model => {
    // 모델이 응답을 생성한 총 횟수 (단일 모델 시스템이므로 matchesAsA만 사용)
    const totalMatches = model.matchesAsA.length;
    
    // 게시판에 올라간 횟수 (Prompt.isShared == true)
    const postedMatches = model.matchesAsA.filter(m => m.prompt.isShared).length;
    
    // 채택률 계산 (백분율)
    const adoptionRate = totalMatches > 0 
      ? (postedMatches / totalMatches) * 100 
      : 0;

    return {
      id: model.id,
      name: model.name,
      provider: model.provider,
      totalMatches,
      postedMatches,
      adoptionRate: Number(adoptionRate.toFixed(2)),
      rating: Math.round(model.rating)
    };
  });

  // 채택률 기준으로 정렬 (높은 순)
  modelStats.sort((a, b) => {
    if (b.adoptionRate !== a.adoptionRate) {
      return b.adoptionRate - a.adoptionRate;
    }
    return b.postedMatches - a.postedMatches;
  });

  const result = modelStats.map((m, idx) => ({
    rank: idx + 1,
    ...m
  }));

  res.json(result);
});

// 유저 좋아요 기반 순위
leaderboardRouter.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    include: {
      prompts: {
        where: { isShared: true },
        select: {
          likes: true
        }
      }
    }
  });

  const userStats = users.map(user => {
    // 유저의 공유된 프롬프트들이 받은 총 좋아요 수
    const totalLikes = user.prompts.reduce((sum, prompt) => sum + prompt.likes, 0);
    
    // 점수 = (좋아요 수 × 10) + 공유된 프롬프트 개수
    const score = (totalLikes * 10) + user.prompts.length;

    return {
      id: user.id,
      nickname: user.nickname,
      totalLikes,
      postsCount: user.prompts.length, // sharedPromptCount
      score
    };
  });

  // 점수 기준으로 정렬 (높은 순)
  userStats.sort((a, b) => b.score - a.score);

  // 상위 50명만
  const top50 = userStats.slice(0, 50);

  const result = top50.map((u, idx) => ({
    rank: idx + 1,
    ...u
  }));

  res.json(result);
});
