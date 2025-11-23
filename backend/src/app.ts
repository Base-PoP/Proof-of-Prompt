// src/app.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { arenaRouter } from "./modules/arena/arena.routes";
import { leaderboardRouter } from "./modules/leaderboard/leaderboard.routes";
import mockRouter from "./modules/mock/mock.routes";
import postsRouter from "./modules/posts/posts.routes";
import { usersRouter } from "./modules/users/users.routes";
dotenv.config();

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // --- Health check ---
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // ----------------------------------------------------
  // mock LLM 응답 생성 엔드포인트
  // ----------------------------------------------------
  app.post("/mock/generate", async (req, res) => {
    const { prompt, modelId, position } = req.body;

    // 아주 간단한 mock 응답
    const fakeResponse = `
      [MOCK RESPONSE]
      modelId: ${modelId}
      position: ${position}
      prompt: ${prompt}

      This is a mocked LLM response generated without calling any external API.
    `;

    res.json({
      ok: true,
      mock: true,
      content: fakeResponse,
    });
  });

  // arena 라우터
  app.use("/arena", arenaRouter);

  // mock 라우터
  app.use("/mock", mockRouter);

  // leaderboard 라우터
  app.use("/leaderboard", leaderboardRouter);

  // posts 라우터
  app.use("/posts", postsRouter);

  // users 라우터
  app.use("/users", usersRouter);

  return app;
};
