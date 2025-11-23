import { Router } from "express";
import { prisma } from "../../lib/prisma";

export const leaderboardRouter = Router();

// 모델 채택률 순위
leaderboardRouter.get("/models", async (_req, res) => {
  const models = await prisma.model.findMany({
    include: {
      matchesAsA: {
        include: {
          post: true
        }
      }
    }
  });

  const modelStats = models.map(model => {
    // 모델이 응답을 생성한 총 횟수 (단일 모델 시스템이므로 matchesAsA만 사용)
    const totalMatches = model.matchesAsA.length;
    
    // 게시판에 올라간 횟수 (Post는 항상 modelA만 사용)
    const postedMatches = model.matchesAsA.filter(m => m.post !== null).length;
    
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
  modelStats.sort((a, b) => b.adoptionRate - a.adoptionRate);

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
      posts: {
        select: {
          likes: true
        }
      }
    }
  });

  const userStats = users.map(user => {
    // 유저의 모든 게시글이 받은 총 좋아요 수
    const totalLikes = user.posts.reduce((sum, post) => sum + post.likes, 0);
    
    // 점수 = 좋아요 수 × 10
    const score = totalLikes * 10;

    return {
      id: user.id,
      nickname: user.nickname,
      totalLikes,
      postsCount: user.posts.length,
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
