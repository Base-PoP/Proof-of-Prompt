import { Router } from "express";
import { mockChatHandler, mockJudgeHandler } from "./mock.controller";
import { createMockMatchHandler, voteMockHandler } from "./mock.service";

const router = Router();

// Mock 매치 생성 및 투표
router.post("/match", createMockMatchHandler);
router.post("/vote", voteMockHandler);

// 기존 mock endpoints
router.post("/chat", mockChatHandler);
router.post("/judge", mockJudgeHandler);

export default router;
