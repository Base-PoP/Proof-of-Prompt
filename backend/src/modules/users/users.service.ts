import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { normalizeCategory } from "../prompts/category";
import { evaluateAchievementsForUser, getUserAchievementContext, enrichAchievementsWithProgress } from "./achievements.util";

/* ------------------------------------------------------------------ */
/*  Helper: Calculate Level with XP System                           */
/* ------------------------------------------------------------------ */
function calculateLevel(score: number): { level: number; currentXP: number; nextLevelXP: number } {
  // 레벨별 필요 XP: 100, 250, 450, 700, 1000, 1350...
  // 공식: xpForNextLevel = 100 * level + 50 * (level - 1)^2
  let level = 1;
  let cumulativeXP = 0;
  
  while (true) {
    const xpForNextLevel = 100 * level + 50 * (level - 1) * (level - 1);
    if (cumulativeXP + xpForNextLevel > score) {
      return {
        level,
        currentXP: score - cumulativeXP,
        nextLevelXP: xpForNextLevel
      };
    }
    cumulativeXP += xpForNextLevel;
    level++;
  }
}

/* ------------------------------------------------------------------ */
/*  1. Get User Profile: /users/:walletAddress/profile               */
/* ------------------------------------------------------------------ */
export const getUserProfileHandler = async (req: Request, res: Response) => {
  const { walletAddress } = req.params;

  try {
    const { user } = await getUserAchievementContext(walletAddress);

    // 2) 통계 계산
    const totalPrompts = user.prompts.length;
    
    // 모든 공유된 프롬프트가 받은 총 좋아요 수
    const totalLikes = user.prompts.reduce((sum, prompt) => sum + prompt.likes, 0);
    
    // 점수 = (좋아요 × 10) + 공유된 프롬프트 개수
    const score = (totalLikes * 10) + totalPrompts;

    // 3) 인기 게시글 (좋아요 순으로 정렬)
    const popularPrompts = user.prompts
      .slice() // 원본 안전하게 복사 후 정렬
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 10)
      .map(prompt => {
        const match = prompt.matches?.[0];
        const response = match?.responses?.find((r: any) => r.position === "A");
        
        return {
          id: prompt.id,
          title: prompt.title || "Untitled",
          prompt: prompt.text,
          response: response?.content || "",
          modelName: match?.modelA?.name || "Unknown Model",
          modelProvider: match?.modelA?.provider || "Unknown Provider",
          likes: prompt.likes,
          createdAt: prompt.createdAt.toISOString(),
          tags: [] // 태그 기능은 일단 제외됨
        };
      });

    // 4) 레벨 계산 (비선형 시스템)
    const levelData = calculateLevel(score);

    return res.json({
      user: {
        id: user.id,
        nickname: user.nickname,
        createdAt: user.createdAt.toISOString()
      },
      stats: {
        totalPrompts,
        totalLikes,
        score,
        level: levelData.level,
        currentXP: levelData.currentXP,
        nextLevelXP: levelData.nextLevelXP
      },
      popularPrompts
    });
  } catch (err: any) {
    console.error("❌ [GET USER PROFILE ERROR]", err);
    return res.status(500).json({
      error: "Failed to fetch user profile",
      detail: String(err)
    });
  }
};

/* ------------------------------------------------------------------ */
/*  2. Get Achievements: /users/:walletAddress/achievements          */
/* ------------------------------------------------------------------ */
export const getAchievementsHandler = async (req: Request, res: Response) => {
  const { walletAddress } = req.params;

  try {
    const { user, stats } = await getUserAchievementContext(walletAddress);

    // 업적 평가 수행
    await evaluateAchievementsForUser(user.id, stats);

    // 최신 상태 반환 (진행률 포함)
    const allAchievements = await prisma.achievement.findMany();
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId: user.id },
      include: { achievement: true }
    });

    const enriched = enrichAchievementsWithProgress(allAchievements, stats).map((ach: any) => {
      const ua = userAchievements.find((u) => u.achievementId === Number(ach.id));
      return {
        ...ach,
        achievedAt: ua?.achievedAt.toISOString() || null,
        claimed: ua?.claimed || false,
      };
    });

    return res.json(enriched);
  } catch (err: any) {
    console.error("❌ [GET ACHIEVEMENTS ERROR]", err);
    return res.status(500).json({ error: "Failed to fetch achievements" });
  }
};

/* ------------------------------------------------------------------ */
/*  4-1. Claim Achievement (placeholder for future onchain rewards)   */
/* ------------------------------------------------------------------ */
const claimParamsSchema = z.object({
  walletAddress: z.string(),
});

export const claimAchievementHandler = async (req: Request, res: Response) => {
  const { walletAddress, achievementId } = { ...req.params };
  const parsed = claimParamsSchema.safeParse({ walletAddress });
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  const achId = parseInt(achievementId as string);
  if (isNaN(achId)) {
    return res.status(400).json({ error: "Invalid achievement id" });
  }

  try {
    const user = await prisma.user.findFirst({ where: { nickname: walletAddress } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await evaluateAchievementsForUser(user.id);

    const ua = await prisma.userAchievement.findFirst({
      where: { userId: user.id, achievementId: achId }
    });

    if (!ua || !ua.achievedAt) {
      return res.status(400).json({ error: "Achievement not achieved yet" });
    }

    if (ua.claimed) {
      return res.json({ ok: true, claimed: true });
    }

    // TODO: Onchain reward hook (e.g., mint badge, send token). Placeholder for future integration.

    await prisma.userAchievement.update({
      where: { id: ua.id },
      data: { claimed: true }
    });

    return res.json({ ok: true, claimed: true });
  } catch (err: any) {
    console.error("❌ [CLAIM ACHIEVEMENT ERROR]", err);
    return res.status(500).json({ error: "Failed to claim achievement" });
  }
};

/* ------------------------------------------------------------------ */
/*  3. Get Shared Prompts: /users/:walletAddress/shared-prompts       */
/* ------------------------------------------------------------------ */
const sharedPromptsQuerySchema = z.object({
  sort: z.enum(["likes", "latest"]).default("likes")
});

export const getSharedPromptsHandler = async (req: Request, res: Response) => {
  const { walletAddress } = req.params;
  const parsed = sharedPromptsQuerySchema.safeParse({
    sort: req.query.sort || "likes"
  });

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid sort option" });
  }

  const { sort } = parsed.data;

  try {
    const user = await prisma.user.findFirst({
      where: { nickname: walletAddress }
    });

    if (!user) {
      return res.json([]);
    }

    const prompts = await prisma.prompt.findMany({
      where: { 
        userId: user.id,
        isShared: true 
      },
      include: {
        matches: {
          include: {
            modelA: true,
            responses: true
          }
        }
      },
      orderBy: sort === "likes"
        ? { likes: "desc" }
        : { createdAt: "desc" }
    });

    const formatted = prompts.map(prompt => {
      const match = prompt.matches[0];
      const response = match?.responses.find((r: any) => r.position === "A");
      
      return {
        id: prompt.id,
        title: prompt.title || "Untitled",
        prompt: prompt.text,
        category: normalizeCategory(prompt.category || "General"),
        modelName: match?.modelA?.name || "Unknown Model",
        modelProvider: match?.modelA?.provider || "Unknown Provider",
        likes: prompt.likes,
        createdAt: prompt.createdAt.toISOString(),
        response: response?.content || ""
      };
    });

    return res.json(formatted);
  } catch (err: any) {
    console.error("❌ [GET USER SHARED PROMPTS ERROR]", err);
    return res.status(500).json({ error: "Failed to fetch shared prompts" });
  }
};
