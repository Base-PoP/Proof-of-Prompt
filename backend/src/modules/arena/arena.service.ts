import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { callFlockModel, callFlockModelStream } from "../../lib/flock";

// -------- 채팅 생성 스키마 (단일 모델) --------
const createChatSchema = z.object({
  prompt: z.string().min(1),
  userId: z.coerce.number().optional()
});

// -------- Post 생성 스키마 --------
const createPostSchema = z.object({
  matchId: z.coerce.number(),
  title: z.string().min(1).max(100),
  walletAddress: z.string().optional(),
  tags: z.array(z.string()).optional()
});

/* ------------------------------------------------------------------ */
/*  1. 채팅 생성: /arena/chat (단일 모델 응답)                         */
/* ------------------------------------------------------------------ */
export const createChatHandler = async (req: Request, res: Response) => {
  const parsed = createChatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const { prompt, userId } = parsed.data;

  try {
    // Postman 헤더로 인해 Flock 호출 시 충돌 방지
    delete req.headers["x-api-key"];
    delete req.headers["authorization"];

    console.log("🔥 [CHAT] Incoming request:", { prompt, userId });

    // 1) 랜덤하게 1개 모델 선택
    const totalModels = await prisma.model.count();
    if (totalModels === 0) {
      return res.status(400).json({ error: "No models available" });
    }

    const randomIndex = Math.floor(Math.random() * totalModels);
    const selectedModel = await prisma.model.findMany({
      skip: randomIndex,
      take: 1
    });

    if (!selectedModel || selectedModel.length === 0) {
      return res.status(400).json({ error: "Model not found" });
    }

    const model = selectedModel[0];

    // 2) Prompt 저장 (userId는 optional)
    const createdPrompt = await prisma.prompt.create({
      data: {
        text: prompt,
        ...(userId && { userId })
      }
    });

    // 3) Match 생성 (단일 모델 시스템)
    const match = await prisma.match.create({
      data: {
        promptId: createdPrompt.id,
        modelAId: model.id
      }
    });

    // 4) Flock API 호출
    console.log("🟩 Calling Flock API for model:", model.name);
    const responseText = await callFlockModel(model.apiModelId, prompt);

    // 5) DB에 Response 저장
    await prisma.response.create({
      data: {
        matchId: match.id,
        modelId: model.id,
        position: "A",
        content: responseText
      }
    });

    // 모델 정보는 숨기고 응답만 반환
    return res.json({
      matchId: match.id,
      prompt,
      response: responseText
    });
  } catch (err: any) {
    console.error("❌ [CHAT ERROR]", err?.response?.data || err);
    return res.status(500).json({
      error: "Failed to generate response",
      detail: err?.response?.data || String(err)
    });
  }
};

/* ------------------------------------------------------------------ */
/*  1-2. 스트리밍 채팅: /arena/chat/stream                             */
/* ------------------------------------------------------------------ */
export const createChatStreamHandler = async (req: Request, res: Response) => {
  const parsed = createChatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const { prompt, userId } = parsed.data;

  try {
    delete req.headers["x-api-key"];
    delete req.headers["authorization"];

    console.log("🔥 [STREAM CHAT] Incoming request:", { prompt, userId });

    // 1) 랜덤 모델 선택
    const totalModels = await prisma.model.count();
    if (totalModels === 0) {
      return res.status(400).json({ error: "No models available" });
    }

    const randomIndex = Math.floor(Math.random() * totalModels);
    const selectedModel = await prisma.model.findMany({
      skip: randomIndex,
      take: 1
    });

    if (!selectedModel || selectedModel.length === 0) {
      return res.status(400).json({ error: "Model not found" });
    }

    const model = selectedModel[0];

    // 2) Prompt 저장
    const createdPrompt = await prisma.prompt.create({
      data: {
        text: prompt,
        ...(userId && { userId })
      }
    });

    // 3) Match 생성
    const match = await prisma.match.create({
      data: {
        promptId: createdPrompt.id,
        modelAId: model.id
      }
    });

    // 4) SSE 헤더 설정
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 초기 matchId 전송
    res.write(`data: ${JSON.stringify({ type: 'start', matchId: match.id, prompt })}\n\n`);

    let fullResponse = '';

    // 5) Flock API 스트리밍 호출
    console.log("🟩 Streaming from Flock API for model:", model.name);
    await callFlockModelStream(model.apiModelId, prompt, (chunk: string) => {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
    });

    // 6) DB에 전체 Response 저장
    await prisma.response.create({
      data: {
        matchId: match.id,
        modelId: model.id,
        position: "A",
        content: fullResponse
      }
    });

    // 7) 종료 신호
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();

  } catch (err: any) {
    console.error("❌ [STREAM CHAT ERROR]", err?.response?.data || err);
    res.write(`data: ${JSON.stringify({ type: 'error', error: 'Failed to generate response' })}\n\n`);
    res.end();
  }
};

/* ------------------------------------------------------------------ */
/*  2. Post 생성: /arena/post (모델 정보 공개하며 게시)                */
/* ------------------------------------------------------------------ */
export const createPostHandler = async (req: Request, res: Response) => {
  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const { matchId, title, walletAddress, tags } = parsed.data;

  try {
    // 1) match 조회
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        modelA: true,
        responses: true,
        prompt: true
      }
    });

    if (!match || !match.modelA || !match.prompt) {
      return res.status(404).json({ error: "Match not found" });
    }

    const response = match.responses.find((r) => r.position === "A");
    if (!response) {
      return res.status(500).json({ error: "Response missing" });
    }

    console.log("📝 [POST] Creating post for match:", matchId);

    // 2) walletAddress가 있으면 User 찾기 또는 생성
    let userId: number | undefined;
    if (walletAddress) {
      let user = await prisma.user.findFirst({
        where: { nickname: walletAddress }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            nickname: walletAddress
          }
        });
        console.log("👤 [USER] Created new user:", user.id);
      }

      userId = user.id;
    }

    // 3) Post로 DB에 저장
    const post = await prisma.post.create({
      data: {
        matchId: match.id,
        title: title,
        likes: 0,
        ...(userId && { userId })
      }
    });

    // 4) 태그 처리
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        // 태그가 없으면 생성, 있으면 가져오기
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          create: { name: tagName },
          update: {}
        });

        // PostTag 관계 생성
        await prisma.postTag.create({
          data: {
            postId: post.id,
            tagId: tag.id
          }
        });
      }
    }

    // 5) 생성된 태그 조회
    const postWithTags = await prisma.post.findUnique({
      where: { id: post.id },
      include: {
        postTags: {
          include: {
            tag: true
          }
        }
      }
    });

    // 6) Post 정보 반환 (모델 정보 + 태그 포함)
    return res.json({
      ok: true,
      post: {
        id: post.id,
        matchId: match.id,
        title: title,
        prompt: match.prompt.text,
        response: response.content,
        userId: post.userId,
        modelId: match.modelA.id,
        modelName: match.modelA.name,
        modelProvider: match.modelA.provider,
        likes: post.likes,
        tags: postWithTags?.postTags.map(pt => pt.tag.name) || [],
        createdAt: post.createdAt.toISOString()
      }
    });
  } catch (err: any) {
    console.error("❌ [POST ERROR]", err);
    return res.status(500).json({
      error: "Failed to create post",
      detail: String(err)
    });
  }
};
