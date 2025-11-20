import { Router } from "express";
import { createMatchHandler, voteHandler } from "./arena.service";

export const arenaRouter = Router();

// 프롬프트 입력 → 매치 생성 + A/B 응답 반환
arenaRouter.post("/match", createMatchHandler);

// 유저 투표
arenaRouter.post("/vote", voteHandler);
