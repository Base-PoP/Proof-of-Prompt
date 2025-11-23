import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";

/* ------------------------------------------------------------------ */
/*  1. Get User Profile: /users/:walletAddress/profile               */
/* ------------------------------------------------------------------ */
export const getUserProfileHandler = async (req: Request, res: Response) => {
  const { walletAddress } = req.params;

  try {
    // 1) walletAddress로 User 찾기
    const user = await prisma.user.findFirst({
      where: { nickname: walletAddress },
      include: {
        posts: {
          include: {
            match: {
              include: {
                prompt: true,
                modelA: true,
                responses: true
              }
            },
            postTags: {
              include: {
                tag: true
              }
            }
          }
        },
        _count: {
          select: {
            posts: true,
            postLikes: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2) 통계 계산
    const totalPosts = user._count.posts;
    
    // 모든 게시글이 받은 총 좋아요 수
    const totalLikes = user.posts.reduce((sum, post) => sum + post.likes, 0);
    
    // 점수 = 좋아요 × 10
    const score = totalLikes * 10;

    // 3) 인기 게시글 (좋아요 순으로 정렬)
    const popularPosts = user.posts
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 10) // 상위 10개
      .map(post => {
        const response = post.match.responses.find((r: any) => r.position === "A");
        
        return {
          id: post.id,
          title: post.title,
          prompt: post.match.prompt.text,
          response: response?.content || "",
          modelName: post.match.modelA.name,
          modelProvider: post.match.modelA.provider,
          likes: post.likes,
          createdAt: post.createdAt.toISOString(),
          tags: post.postTags.map((pt: any) => pt.tag.name)
        };
      });

    return res.json({
      user: {
        id: user.id,
        nickname: user.nickname,
        createdAt: user.createdAt.toISOString()
      },
      stats: {
        totalPosts,
        totalLikes,
        score,
        level: Math.floor(score / 100) + 1 // 임시 레벨 계산
      },
      popularPosts
    });
  } catch (err: any) {
    console.error("❌ [GET USER PROFILE ERROR]", err);
    return res.status(500).json({
      error: "Failed to fetch user profile",
      detail: String(err)
    });
  }
};
