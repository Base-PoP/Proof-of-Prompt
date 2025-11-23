import { Router } from "express";
import { getPostsHandler, getPostHandler, likePostHandler, deletePostHandler } from "./posts.service";

const router = Router();

// GET /posts - 게시글 목록 조회
router.get("/", getPostsHandler);

// GET /posts/:id - 게시글 상세 조회
router.get("/:id", getPostHandler);

// POST /posts/:id/like - 게시글 좋아요/좋아요 취소
router.post("/:id/like", likePostHandler);

// DELETE /posts/:id - 게시글 삭제
router.delete("/:id", deletePostHandler);

export default router;
