import { prisma } from "../../lib/prisma";
import { normalizeCategory } from "../prompts/category";

export interface AchievementStats {
  sharedCount: number;
  totalLikes: number;
  topPromptLikes: number;
  distinctCategories: number;
}

export async function getUserAchievementContext(walletAddress: string) {
  let user = await prisma.user.findFirst({
    where: { nickname: walletAddress },
    include: {
      prompts: {
        where: { isShared: true },
        include: { matches: true }
      },
      userAchievements: true
    }
  });

  if (!user) {
    user = await prisma.user.create({ data: { nickname: walletAddress } });
    user = await prisma.user.findFirst({
      where: { nickname: walletAddress },
      include: {
        prompts: {
          where: { isShared: true },
          include: { matches: true }
        },
        userAchievements: true
      }
    }) as any;
  }

  if (!user) throw new Error("Failed to fetch/create user for achievements");

  const sharedPrompts = user.prompts || [];
  const stats: AchievementStats = {
    sharedCount: sharedPrompts.length,
    totalLikes: sharedPrompts.reduce((sum, p) => sum + p.likes, 0),
    topPromptLikes: sharedPrompts.reduce((max, p) => Math.max(max, p.likes), 0),
    distinctCategories: new Set(sharedPrompts.map((p) => normalizeCategory(p.category || "기타"))).size,
  };

  return { user, stats };
}

export function meetsAchievementCondition(conditionStr: string, stats: AchievementStats): boolean {
  try {
    const condition = JSON.parse(conditionStr);
    switch (condition.type) {
      case "shared_prompts_count":
        return stats.sharedCount >= (condition.count ?? 0);
      case "total_likes":
        return stats.totalLikes >= (condition.count ?? 0);
      case "top_prompt_likes":
        return stats.topPromptLikes >= (condition.count ?? 0);
      case "distinct_categories":
        return stats.distinctCategories >= (condition.count ?? 0);
      default:
        return false;
    }
  } catch {
    return false;
  }
}

export async function evaluateAchievementsForUser(userId: number, stats?: AchievementStats) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      prompts: { where: { isShared: true } },
      userAchievements: true
    }
  });

  if (!user) return;

  const computedStats: AchievementStats = stats || {
    sharedCount: user.prompts.length,
    totalLikes: user.prompts.reduce((sum, p) => sum + p.likes, 0),
    topPromptLikes: user.prompts.reduce((max, p) => Math.max(max, p.likes), 0),
    distinctCategories: new Set(user.prompts.map((p) => normalizeCategory(p.category || "기타"))).size,
  };

  const allAchievements = await prisma.achievement.findMany();
  const userAchievementMap = new Map<number, any>((user.userAchievements || []).map((ua) => [ua.achievementId, ua]));

  for (const ach of allAchievements) {
    const already = userAchievementMap.get(ach.id);
    if (meetsAchievementCondition(ach.condition, computedStats) && !already) {
      try {
        const created = await prisma.userAchievement.create({
          data: { userId: user.id, achievementId: ach.id },
          include: { achievement: true }
        });
        userAchievementMap.set(ach.id, created);
      } catch (err: any) {
        // 동시성/중복으로 인한 유니크 제약 위반은 무시하고 진행
        if (err?.code !== 'P2002') {
          throw err;
        }
      }
    }
  }
}

export function enrichAchievementsWithProgress(achievements: any[], stats: AchievementStats) {
  return achievements.map((ach) => {
    let parsed: any = {};
    try {
      parsed = JSON.parse(ach.condition);
    } catch {
      parsed = {};
    }
    return {
      id: ach.id.toString(),
      title: ach.name,
      description: ach.description,
      rarity: parsed.rarity || null,
      exp: parsed.exp || ach.reward || 0,
      progress: (() => {
        if (!parsed?.type) return null;
        const target = parsed.count ?? 0;
        switch (parsed.type) {
          case "shared_prompts_count":
            return { current: stats.sharedCount, target };
          case "total_likes":
            return { current: stats.totalLikes, target };
          case "top_prompt_likes":
            return { current: stats.topPromptLikes, target };
          case "distinct_categories":
            return { current: stats.distinctCategories, target };
          default:
            return null;
        }
      })(),
    };
  });
}
