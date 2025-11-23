import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { isValidCategory, normalizeCategory } from "./category";

// -------- Get Prompts 스키마 --------
const getPromptsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  walletAddress: z.string().optional(),
  sort: z.enum(['latest', 'popular']).default('latest'),
  category: z.string().optional()
});

// -------- Like Prompt 스키마 --------
const likePromptSchema = z.object({
  promptId: z.coerce.number(),
  walletAddress: z.string()
});

// -------- Delete Prompt 스키마 --------
const deletePromptSchema = z.object({
  promptId: z.coerce.number(),
  walletAddress: z.string()
});

// -------- Update Prompt 스키마 --------
const updatePromptSchema = z.object({
  promptId: z.coerce.number(),
  title: z.string().min(1).max(100),
  category: z.string(),
  walletAddress: z.string()
});

/* ------------------------------------------------------------------ */
/*  1. Get Shared Prompts: /prompts                                  */
/* ------------------------------------------------------------------ */
export const getSharedPromptsHandler = async (req: Request, res: Response) => {
  const parsed = getPromptsSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query parameters" });
  }

  const { limit, offset, walletAddress, sort, category } = parsed.data;

  try {
    // walletAddress가 있으면 User 찾기
    let currentUserId: number | undefined;
    if (walletAddress) {
      const user = await prisma.user.findFirst({
        where: { nickname: walletAddress }
      });
      currentUserId = user?.id;
    }

    // where 조건 (공유된 프롬프트 + 카테고리 필터)
    const whereClause: any = {
      isShared: true
    };
    
    if (category) {
      if (!isValidCategory(category)) {
        return res.status(400).json({ error: "Invalid category" });
      }
      whereClause.category = normalizeCategory(category);
    }

    // orderBy 조건 (정렬)
    const orderByClause = sort === 'popular' 
      ? { likes: 'desc' as const }
      : { createdAt: 'desc' as const };

    const prompts = await prisma.prompt.findMany({
      take: limit,
      skip: offset,
      where: whereClause,
      orderBy: orderByClause,
      include: {
        matches: {
          include: {
            modelA: true,
            responses: true
          },
          take: 1 // 첫 번째 매치 정보 사용 (보통 1개)
        },
        user: true,
        promptLikes: currentUserId ? {
          where: { userId: currentUserId }
        } : false
      }
    });

    const formattedPrompts = prompts.map((prompt: any) => {
      const match = prompt.matches[0];
      const response = match?.responses.find((r: any) => r.position === "A");
      const normalizedCategory = normalizeCategory(prompt.category || "기타");
      
      return {
        id: prompt.id.toString(),
        title: prompt.title,
        category: normalizedCategory,
        prompt: prompt.text,
        response: response?.content || "",
        userId: prompt.userId?.toString(),
        userName: prompt.user?.nickname,
        modelId: match?.modelA.id.toString(),
        modelName: match?.modelA.name,
        modelProvider: match?.modelA.provider,
        createdAt: prompt.createdAt.toISOString(),
        likes: prompt.likes,
        isLiked: currentUserId ? (prompt.promptLikes && prompt.promptLikes.length > 0) : false,
        tags: [] // 태그 기능 제외됨
      };
    });

    return res.json(formattedPrompts);
  } catch (err: any) {
    console.error("❌ [GET PROMPTS ERROR]", err);
    return res.status(500).json({
      error: "Failed to fetch prompts",
      detail: String(err)
    });
  }
};

/* ------------------------------------------------------------------ */
/*  2. Get Single Prompt: /prompts/:id                               */
/* ------------------------------------------------------------------ */
export const getPromptHandler = async (req: Request, res: Response) => {
  const promptId = parseInt(req.params.id);
  const walletAddress = req.query.walletAddress as string | undefined;

  if (isNaN(promptId)) {
    return res.status(400).json({ error: "Invalid prompt ID" });
  }

  try {
    // walletAddress가 있으면 User 찾기
    let currentUserId: number | undefined;
    if (walletAddress) {
      const user = await prisma.user.findFirst({
        where: { nickname: walletAddress }
      });
      currentUserId = user?.id;
    }

    const prompt = await prisma.prompt.findUnique({
      where: { id: promptId },
      include: {
        matches: {
          include: {
            modelA: true,
            responses: true
          },
          take: 1
        },
        user: true,
        promptLikes: currentUserId ? {
          where: { userId: currentUserId }
        } : false
      }
    });

    if (!prompt) {
      return res.status(404).json({ error: "Prompt not found" });
    }

    // 공유되지 않은 프롬프트도 접근 가능한지? -> 일단 가능하게 (상세 페이지)
    // 하지만 UI에서는 공유된 것만 리스트에 뜸.

    const match = prompt.matches[0];
    const response = match?.responses.find((r: any) => r.position === "A");
    const normalizedCategory = normalizeCategory(prompt.category || "기타");

    return res.json({
      id: prompt.id.toString(),
      title: prompt.title,
      category: normalizedCategory,
      prompt: prompt.text,
      response: response?.content || "",
      userId: prompt.userId?.toString(),
      userName: prompt.user?.nickname,
      modelId: match?.modelA.id.toString(),
      modelName: match?.modelA.name,
      modelProvider: match?.modelA.provider,
      createdAt: prompt.createdAt.toISOString(),
      likes: prompt.likes,
      isLiked: currentUserId ? (prompt.promptLikes && prompt.promptLikes.length > 0) : false,
      tags: []
    });
  } catch (err: any) {
    console.error("❌ [GET PROMPT ERROR]", err);
    return res.status(500).json({
      error: "Failed to fetch prompt",
      detail: String(err)
    });
  }
};

/* ------------------------------------------------------------------ */
/*  3. Like/Unlike Prompt: /prompts/:id/like                         */
/* ------------------------------------------------------------------ */
export const likePromptHandler = async (req: Request, res: Response) => {
  const promptId = parseInt(req.params.id);
  const parsed = likePromptSchema.safeParse({ ...req.body, promptId });

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const { walletAddress } = parsed.data;

  try {
    // 1) walletAddress로 User 찾기 또는 생성
    let user = await prisma.user.findFirst({
      where: { nickname: walletAddress }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          nickname: walletAddress
        }
      });
      console.log("👤 [USER] Created new user for like:", user.id);
    }

    const userId = user.id;
    console.log("👤 [LIKE] Using userId:", userId, "for promptId:", promptId);

    // 2) Check if already liked
    const existingLike = await prisma.promptLike.findUnique({
      where: {
        promptId_userId: {
          promptId,
          userId
        }
      }
    });

    if (existingLike) {
      // Unlike
      await prisma.$transaction([
        prisma.promptLike.delete({
          where: {
            promptId_userId: {
              promptId,
              userId
            }
          }
        }),
        prisma.prompt.update({
          where: { id: promptId },
          data: {
            likes: {
              decrement: 1
            }
          }
        })
      ]);

      const updatedPrompt = await prisma.prompt.findUnique({
        where: { id: promptId },
        include: { user: true }
      });

      return res.json({
        ok: true,
        liked: false,
        likes: updatedPrompt?.likes || 0,
        userId: updatedPrompt?.userId?.toString(),
        userName: updatedPrompt?.user?.nickname
      });
    } else {
      // Like
      await prisma.$transaction([
        prisma.promptLike.create({
          data: {
            promptId,
            userId
          }
        }),
        prisma.prompt.update({
          where: { id: promptId },
          data: {
            likes: {
              increment: 1
            }
          }
        })
      ]);

      const updatedPrompt = await prisma.prompt.findUnique({
        where: { id: promptId },
        include: { user: true }
      });

      return res.json({
        ok: true,
        liked: true,
        likes: updatedPrompt?.likes || 0,
        userId: updatedPrompt?.userId?.toString(),
        userName: updatedPrompt?.user?.nickname
      });
    }
  } catch (err: any) {
    console.error("❌ [LIKE PROMPT ERROR]", err);
    return res.status(500).json({
      error: "Failed to like/unlike prompt",
      detail: String(err)
    });
  }
};

/* ------------------------------------------------------------------ */
/*  4. Delete Prompt (Unshare): DELETE /prompts/:id                  */
/* ------------------------------------------------------------------ */
export const deletePromptHandler = async (req: Request, res: Response) => {
  const promptId = parseInt(req.params.id);
  const parsed = deletePromptSchema.safeParse({ ...req.body, promptId });

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const { walletAddress } = parsed.data;

  try {
    // 1) Find prompt and verify ownership
    const prompt = await prisma.prompt.findUnique({
      where: { id: promptId },
      include: {
        user: true
      }
    });

    if (!prompt) {
      return res.status(404).json({ error: "Prompt not found" });
    }

    // 2) Verify user owns this prompt
    if (!prompt.user || prompt.user.nickname !== walletAddress) {
      return res.status(403).json({ error: "You can only delete your own prompts" });
    }

    // 3) Unshare prompt (set isShared = false)
    // 실제 삭제 대신 공유 취소로 처리
    await prisma.prompt.update({
      where: { id: promptId },
      data: { 
        isShared: false,
        title: null,
        category: null
      }
    });

    console.log("🗑️ [DELETE] Prompt unshared:", promptId, "by", walletAddress);

    return res.json({
      ok: true,
      message: "Prompt unshared successfully"
    });
  } catch (err: any) {
    console.error("❌ [DELETE PROMPT ERROR]", err);
    return res.status(500).json({
      error: "Failed to delete prompt",
      detail: String(err)
    });
  }
};

/* ------------------------------------------------------------------ */
/*  5. Update Prompt: PATCH /prompts/:id                             */
/* ------------------------------------------------------------------ */
export const updatePromptHandler = async (req: Request, res: Response) => {
  const promptId = parseInt(req.params.id);
  const parsed = updatePromptSchema.safeParse({ ...req.body, promptId });

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const { title, category, walletAddress } = parsed.data;

  try {
    // 1) 작성자 검증
    const prompt = await prisma.prompt.findUnique({
      where: { id: promptId },
      include: { user: true }
    });

    if (!prompt) {
      return res.status(404).json({ error: "Prompt not found" });
    }

    if (!prompt.user || prompt.user.nickname !== walletAddress) {
      return res.status(403).json({ error: "Only the author can edit this prompt" });
    }

    // 2) 카테고리 검증
    if (!isValidCategory(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }
    const normalizedCategory = normalizeCategory(category);

    // 3) 업데이트
    await prisma.prompt.update({
      where: { id: promptId },
      data: { title, category: normalizedCategory }
    });

    console.log("✏️ [UPDATE] Prompt updated:", promptId, "by", walletAddress);

    return res.json({ ok: true, message: "Prompt updated successfully" });
  } catch (err: any) {
    console.error("❌ [UPDATE PROMPT ERROR]", err);
    return res.status(500).json({
      error: "Failed to update prompt",
      detail: String(err)
    });
  }
};
