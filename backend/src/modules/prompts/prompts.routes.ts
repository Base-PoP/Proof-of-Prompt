import { Router } from "express";
import { getSharedPromptsHandler, getPromptHandler, likePromptHandler, deletePromptHandler, updatePromptHandler } from "./prompts.service";

const router = Router();

// GET /prompts - 공유된 프롬프트 목록 조회
router.get("/", getSharedPromptsHandler);

// GET /prompts/:id - 프롬프트 상세 조회
router.get("/:id", getPromptHandler);

// POST /prompts/:id/like - 프롬프트 좋아요/좋아요 취소
router.post("/:id/like", likePromptHandler);

// PATCH /prompts/:id - 프롬프트 수정
router.patch("/:id", updatePromptHandler);

// DELETE /prompts/:id - 프롬프트 공유 취소 (Unshare)
router.delete("/:id", deletePromptHandler);

export default router;
