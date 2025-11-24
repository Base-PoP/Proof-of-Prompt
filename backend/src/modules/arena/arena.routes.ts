import { Router } from "express";
import { createChatHandler, createChatStreamHandler, sharePromptHandler } from "./arena.service";
import { x402MultiMiddleware, type X402EndpointConfig } from "../../lib/x402";

export const createArenaRouter = (x402Config?: {
  endpointConfigs: X402EndpointConfig;
  payToAddress: string;
  facilitatorUrl?: string;
}) => {
  const router = Router();

  // x402 미들웨어 (선택적)
  if (x402Config) {
    router.use(
      x402MultiMiddleware(
        x402Config.endpointConfigs,
        x402Config.payToAddress,
        x402Config.facilitatorUrl
      )
    );
  }

  // 프롬프트 입력 → 단일 모델 응답 반환 (모델 정보 숨김)
  router.post("/chat", createChatHandler);

  // 스트리밍 채팅 (실시간 타이핑 효과)
  router.post("/chat/stream", createChatStreamHandler);

  // 채팅을 게시판에 Post (모델 정보 공개) -> 프롬프트 공유
  router.post("/share", sharePromptHandler);

  return router;
};

// 기본 export (x402 미들웨어 없음)
export const arenaRouter = createArenaRouter();
