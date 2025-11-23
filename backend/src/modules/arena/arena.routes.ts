import { Router } from "express";
import { createChatHandler, createChatStreamHandler, sharePromptHandler } from "./arena.service";

export const arenaRouter = Router();

// 프롬프트 입력 → 단일 모델 응답 반환 (모델 정보 숨김)
arenaRouter.post("/chat", createChatHandler);

// 스트리밍 채팅 (실시간 타이핑 효과)
arenaRouter.post("/chat/stream", createChatStreamHandler);

// 채팅을 게시판에 Post (모델 정보 공개) -> 프롬프트 공유
arenaRouter.post("/share", sharePromptHandler);
