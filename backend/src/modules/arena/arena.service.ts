import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { callFlockModel, callFlockModelStream } from "../../lib/flock";
import { ALLOWED_CATEGORIES, normalizeCategory } from "../prompts/category";
import { buildPaymentRequiredPayload, recordPaymentAuthorization } from "../../lib/payment";
import { chargePaymentTreasury, type PaymentPermit } from "../../lib/payment-treasury";

// -------- 채팅 생성 스키마 (단일 모델) --------
const createChatSchema = z.object({
  prompt: z.string().min(1),
  userId: z.coerce.number().optional(),
  walletAddress: z.string().optional()
});

// -------- Post 생성 스키마 --------
const createPostSchema = z.object({
  matchId: z.coerce.number(),
  title: z.string().min(1).max(100).optional(),
  walletAddress: z.string().optional(),
  tags: z.array(z.string()).optional()
});

// -------- LLM을 이용한 제목·카테고리 자동 생성 --------
async function generatePostMetadata(prompt: string, response: string): Promise<{ title: string; category: string }> {
  const metadataPrompt = `
You are a content categorization assistant. Given a user prompt and AI response, generate:
1. A short, descriptive title (max 100 characters)
2. One category from exactly this list: ${ALLOWED_CATEGORIES.join(", ")}

User Prompt:
${prompt}

AI Response:
${response.substring(0, 500)}...

Reply in JSON format ONLY:
{"title": "...", "category": "..."}
`;

  try {
    const result = await callFlockModel("qwen3-235b-a22b-instruct-2507", metadataPrompt);
    const parsed = JSON.parse(result.trim());

    // 카테고리 검증 및 정규화
    const category = normalizeCategory(parsed.category);

    return {
      title: parsed.title.substring(0, 100),
      category
    };
  } catch (err) {
    console.error('Failed to generate metadata:', err);
    return {
      title: prompt.substring(0, 100),
      category: normalizeCategory("기타")
    };
  }
}

/* ------------------------------------------------------------------ */
/*  1. 채팅 생성: /arena/chat (단일 모델 응답)                         */
/* ------------------------------------------------------------------ */
export const createChatHandler = async (req: Request, res: Response) => {
  const parsed = createChatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const { prompt, userId, walletAddress } = parsed.data;
  const permitHeader = req.headers['x-payment-permit'] as string | undefined;
  let permit: PaymentPermit | undefined;
  if (permitHeader) {
    try {
      const parsedPermit = JSON.parse(permitHeader);
      permit = {
        deadline: BigInt(parsedPermit.deadline),
        v: parsedPermit.v,
        r: parsedPermit.r,
        s: parsedPermit.s,
      };
    } catch (err) {
      return res.status(400).json({ error: "Invalid payment permit format" });
    }
  }

  if (!walletAddress) {
    return res.status(400).json({ error: "walletAddress is required for payment" });
  }

  // ------------------------------------------------------------------
  // 결제: PaymentTreasury에서 pricePerChat 만큼 자동 차감
  // ------------------------------------------------------------------
  const paymentPayload = await buildPaymentRequiredPayload();
  try {
    const { txHash, amount } = await chargePaymentTreasury(walletAddress, permit);
    await recordPaymentAuthorization(walletAddress, {
      nonce: txHash,
      amount: amount.toString(),
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error("❌ [PAYMENT FAILED]", err);
    const code = err?.code;
    return res.status(402).json({
      error: "Payment Required",
      reason: err?.shortMessage || err?.message || "Payment failed",
      allowanceRequired: code === "ALLOWANCE_REQUIRED",
      payment: paymentPayload
    });
  }

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

  const { prompt, userId, walletAddress } = parsed.data;
  const permitHeader = req.headers['x-payment-permit'] as string | undefined;
  let permit: PaymentPermit | undefined;
  if (permitHeader) {
    try {
      const parsedPermit = JSON.parse(permitHeader);
      permit = {
        deadline: BigInt(parsedPermit.deadline),
        v: parsedPermit.v,
        r: parsedPermit.r,
        s: parsedPermit.s,
      };
    } catch (err) {
      return res.status(400).json({ error: "Invalid payment permit format" });
    }
  }

  if (!walletAddress) {
    return res.status(400).json({ error: "walletAddress is required for payment" });
  }

  // ------------------------------------------------------------------
  // 결제: PaymentTreasury에서 pricePerChat 만큼 자동 차감
  // ------------------------------------------------------------------
  const paymentPayload = await buildPaymentRequiredPayload();
  try {
    const { txHash, amount } = await chargePaymentTreasury(walletAddress, permit);
    await recordPaymentAuthorization(walletAddress, {
      nonce: txHash,
      amount: amount.toString(),
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error("❌ [PAYMENT FAILED - STREAM]", err);
    const code = err?.code;
    return res.status(402).json({
      error: "Payment Required",
      reason: err?.shortMessage || err?.message || "Payment failed",
      allowanceRequired: code === "ALLOWANCE_REQUIRED",
      payment: paymentPayload
    });
  }

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
/*  2. Prompt 공유: /arena/share (LLM 제목/카테고리 생성 + 공유)         */
/* ------------------------------------------------------------------ */
export const sharePromptHandler = async (req: Request, res: Response) => {
  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const { matchId, title: providedTitle, walletAddress, tags } = parsed.data;

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

    console.log("📝 [SHARE] Sharing prompt for match:", matchId);

    // 2) 이미 공유된 Prompt인지 확인
    if (match.prompt.isShared) {
      console.log("ℹ️ [SHARE] Prompt already shared:", match.prompt.id);
      return res.json({
        ok: true,
        prompt: {
          id: match.prompt.id,
          matchId: match.id,
          title: match.prompt.title,
          category: match.prompt.category,
          prompt: match.prompt.text,
          response: response.content,
          userId: match.prompt.userId,
          modelId: match.modelA.id,
          modelName: match.modelA.name,
          modelProvider: match.modelA.provider,
          likes: match.prompt.likes,
          createdAt: match.prompt.createdAt.toISOString()
        }
      });
    }

    // 3) LLM으로 제목·카테고리 자동 생성 (providedTitle이 없으면)
    let title = providedTitle;
    let category = "기타";

    if (!title) {
      const metadata = await generatePostMetadata(
        match.prompt.text,
        response.content
      );
      title = metadata.title;
      category = metadata.category;
    } else {
      // 카테고리는 기본값 혹은 별도 로직 (여기선 자동생성 로직 태움)
       const metadata = await generatePostMetadata(
        match.prompt.text,
        response.content
      );
      category = metadata.category;
    }
    
    console.log("🤖 [LLM] Generated metadata:", { title, category });

    // 4) walletAddress가 있으면 User 찾기 또는 생성 (작성자 연결)
    // Prompt가 이미 생성될 때 userId가 있을 수 있음.
    // 만약 익명으로 채팅했다가 공유 시점에 지갑 연결하면 업데이트?
    // 여기서는 기존 Prompt의 userId를 유지하거나, 없으면 업데이트하는 식으로 처리
    let userId = match.prompt.userId;
    
    if (walletAddress && !userId) {
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

    // 5) Prompt 업데이트 (Share)
    const normalizedCategory = normalizeCategory(category);
    
    const updatedPrompt = await prisma.prompt.update({
      where: { id: match.prompt.id },
      data: {
        title,
        category: normalizedCategory,
        isShared: true,
        ...(userId && { userId }) // 유저 연결
      }
    });

    // 6) 태그 처리 (Optional - 스키마에서 삭제했으므로 제외하거나 별도 테이블 필요. 
    // 현재 스키마 변경 계획에서 Tag 테이블 삭제했으므로 로직 제거)

    // 7) 결과 반환
    return res.json({
      ok: true,
      prompt: {
        id: updatedPrompt.id,
        matchId: match.id,
        title: updatedPrompt.title,
        category: updatedPrompt.category,
        prompt: updatedPrompt.text,
        response: response.content,
        userId: updatedPrompt.userId,
        modelId: match.modelA.id,
        modelName: match.modelA.name,
        modelProvider: match.modelA.provider,
        likes: updatedPrompt.likes,
        createdAt: updatedPrompt.createdAt.toISOString()
      }
    });

  } catch (err: any) {
    console.error("❌ [SHARE ERROR]", err);
    return res.status(500).json({
      error: "Failed to share prompt",
      detail: String(err)
    });
  }
};

// Payment authorization nonce 기록 (실제 EIP-3009 검증/브로드캐스트는 추후 연동)
async function recordAuthorization(walletAddress: string, rawAuth: string) {
  let parsed: any;
  try {
    parsed = typeof rawAuth === "string" ? JSON.parse(rawAuth) : rawAuth;
  } catch {
    parsed = null;
  }

  const nonce = parsed?.nonce || `pseudo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const validBefore = parsed?.validBefore ? BigInt(parsed.validBefore) : undefined;

  // nonce 재사용 방지
  const exists = await prisma.paymentAuthorization.findUnique({ where: { nonce } });
  if (exists) {
    if (exists.walletAddress?.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new Error("Payment authorization already used");
    }
    return;
  }

  await prisma.paymentAuthorization.create({
    data: {
      walletAddress,
      nonce,
      validBefore,
    }
  });
}
