import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

// -------- Get Posts 스키마 --------
const getPostsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  walletAddress: z.string().optional()
});

// -------- Like Post 스키마 --------
const likePostSchema = z.object({
  postId: z.coerce.number(),
  walletAddress: z.string()
});

// -------- Delete Post 스키마 --------
const deletePostSchema = z.object({
  postId: z.coerce.number(),
  walletAddress: z.string()
});

/* ------------------------------------------------------------------ */
/*  1. Get Posts: /posts                                             */
/* ------------------------------------------------------------------ */
export const getPostsHandler = async (req: Request, res: Response) => {
  const parsed = getPostsSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query parameters" });
  }

  const { limit, offset, walletAddress } = parsed.data;

  try {
    // walletAddress가 있으면 User 찾기
    let currentUserId: number | undefined;
    if (walletAddress) {
      const user = await prisma.user.findFirst({
        where: { nickname: walletAddress }
      });
      currentUserId = user?.id;
    }

    const posts = await prisma.post.findMany({
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        match: {
          include: {
            prompt: true,
            responses: true,
            modelA: true
          }
        },
        user: true,
        postTags: {
          include: {
            tag: true
          }
        },
        postLikes: currentUserId ? {
          where: { userId: currentUserId }
        } : false,
        _count: {
          select: { postLikes: true }
        }
      }
    });

    const formattedPosts = posts.map((post: any) => {
      const response = post.match.responses.find((r: any) => r.position === "A");
      
      return {
        id: post.id.toString(),
        title: post.title,
        prompt: post.match.prompt.text,
        response: response?.content || "",
        userId: post.userId?.toString(),
        userName: post.user?.nickname,
        modelId: post.match.modelA.id.toString(),
        modelName: post.match.modelA.name,
        modelProvider: post.match.modelA.provider,
        createdAt: post.createdAt.toISOString(),
        likes: post._count.postLikes,
        isLiked: currentUserId ? (post.postLikes && post.postLikes.length > 0) : false,
        tags: post.postTags.map((pt: any) => pt.tag.name)
      };
    });

    return res.json(formattedPosts);
  } catch (err: any) {
    console.error("❌ [GET POSTS ERROR]", err);
    return res.status(500).json({
      error: "Failed to fetch posts",
      detail: String(err)
    });
  }
};

/* ------------------------------------------------------------------ */
/*  2. Get Single Post: /posts/:id                                   */
/* ------------------------------------------------------------------ */
export const getPostHandler = async (req: Request, res: Response) => {
  const postId = parseInt(req.params.id);
  const walletAddress = req.query.walletAddress as string | undefined;

  if (isNaN(postId)) {
    return res.status(400).json({ error: "Invalid post ID" });
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

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        match: {
          include: {
            prompt: true,
            responses: true,
            modelA: true
          }
        },
        user: true,
        postTags: {
          include: {
            tag: true
          }
        },
        postLikes: currentUserId ? {
          where: { userId: currentUserId }
        } : false,
        _count: {
          select: { postLikes: true }
        }
      }
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const response = post.match.responses.find((r: any) => r.position === "A");

    return res.json({
      id: post.id.toString(),
      title: post.title,
      prompt: post.match.prompt.text,
      response: response?.content || "",
      userId: post.userId?.toString(),
      userName: post.user?.nickname,
      modelId: post.match.modelA.id.toString(),
      modelName: post.match.modelA.name,
      modelProvider: post.match.modelA.provider,
      createdAt: post.createdAt.toISOString(),
      likes: post._count.postLikes,
      isLiked: currentUserId ? (post.postLikes && post.postLikes.length > 0) : false,
      tags: post.postTags.map((pt: any) => pt.tag.name)
    });
  } catch (err: any) {
    console.error("❌ [GET POST ERROR]", err);
    return res.status(500).json({
      error: "Failed to fetch post",
      detail: String(err)
    });
  }
};

/* ------------------------------------------------------------------ */
/*  3. Like/Unlike Post: /posts/:id/like                             */
/* ------------------------------------------------------------------ */
export const likePostHandler = async (req: Request, res: Response) => {
  const postId = parseInt(req.params.id);
  const parsed = likePostSchema.safeParse({ ...req.body, postId });

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
      
      // 생성된 User를 다시 조회하여 확실히 DB에 존재하는지 확인
      user = await prisma.user.findUnique({
        where: { id: user.id }
      }) as any;
      
      if (!user) {
        return res.status(500).json({ error: "Failed to create user" });
      }
    }

    const userId = user.id;
    console.log("👤 [LIKE] Using userId:", userId, "for postId:", postId);

    // 2) Check if already liked
    const existingLike = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId
        }
      }
    });

    if (existingLike) {
      // Unlike
      await prisma.$transaction([
        prisma.postLike.delete({
          where: {
            postId_userId: {
              postId,
              userId
            }
          }
        }),
        prisma.post.update({
          where: { id: postId },
          data: {
            likes: {
              decrement: 1
            }
          }
        })
      ]);

      const likesCount = await prisma.postLike.count({
        where: { postId }
      });

      return res.json({
        ok: true,
        liked: false,
        likes: likesCount
      });
    } else {
      // Like
      await prisma.$transaction([
        prisma.postLike.create({
          data: {
            postId,
            userId
          }
        }),
        prisma.post.update({
          where: { id: postId },
          data: {
            likes: {
              increment: 1
            }
          }
        })
      ]);

      const likesCount = await prisma.postLike.count({
        where: { postId }
      });

      return res.json({
        ok: true,
        liked: true,
        likes: likesCount
      });
    }
  } catch (err: any) {
    console.error("❌ [LIKE POST ERROR]", err);
    return res.status(500).json({
      error: "Failed to like/unlike post",
      detail: String(err)
    });
  }
};

/* ------------------------------------------------------------------ */
/*  4. Delete Post: DELETE /posts/:id                                */
/* ------------------------------------------------------------------ */
export const deletePostHandler = async (req: Request, res: Response) => {
  const postId = parseInt(req.params.id);
  const parsed = deletePostSchema.safeParse({ ...req.body, postId });

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const { walletAddress } = parsed.data;

  try {
    // 1) Find post and verify ownership
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: true
      }
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // 2) Verify user owns this post
    if (!post.user || post.user.nickname !== walletAddress) {
      return res.status(403).json({ error: "You can only delete your own posts" });
    }

    // 3) Delete post (CASCADE will handle PostLike and PostTag)
    await prisma.post.delete({
      where: { id: postId }
    });

    console.log("🗑️ [DELETE] Post deleted:", postId, "by", walletAddress);

    return res.json({
      ok: true,
      message: "Post deleted successfully"
    });
  } catch (err: any) {
    console.error("❌ [DELETE POST ERROR]", err);
    return res.status(500).json({
      error: "Failed to delete post",
      detail: String(err)
    });
  }
};
