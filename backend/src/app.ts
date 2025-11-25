// src/app.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { createArenaRouter, arenaRouter } from "./modules/arena/arena.routes";
import { leaderboardRouter } from "./modules/leaderboard/leaderboard.routes";
import mockRouter from "./modules/mock/mock.routes";
import promptsRouter from "./modules/prompts/prompts.routes";
import { usersRouter } from "./modules/users/users.routes";
import type { X402EndpointConfig } from "./lib/x402";
import { startWeeklyRewardJob } from "./jobs/weeklyRewards";
dotenv.config();

export const createApp = (enableX402: boolean = true) => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // --- Health check ---
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // x402 설정 (환경 변수에서)
  const x402Enabled = enableX402 && process.env.X402_ENABLED === 'true';
  
  if (x402Enabled) {
    const x402EndpointConfigs: X402EndpointConfig = {
      '/chat': {
        price: process.env.X402_CHAT_PRICE || '$0.01',
        network: (process.env.X402_NETWORK as 'base' | 'base-sepolia') || 'base-sepolia',
        description: ' Proof-of-Prompt : 1 prompt answer',
        currency: 'USDC'
      },
      '/chat/stream': {
        price: process.env.X402_CHAT_STREAM_PRICE || '$0.01',
        network: (process.env.X402_NETWORK as 'base' | 'base-sepolia') || 'base-sepolia',
        description: ' Proof-of-Prompt : 1 streaming prompt answer',
        currency: 'USDC'
      }
    };

    const arenaRouterWithX402 = createArenaRouter({
      endpointConfigs: x402EndpointConfigs,
      payToAddress: process.env.PAY_TO_ADDRESS || '0x5e4D581D318ef0ff9e525529b40c3400457Fdbf6',
      facilitatorUrl: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator',
    });

    app.use("/arena", arenaRouterWithX402);
  } else {
    // x402 비활성화 시 기본 라우터 사용
    app.use("/arena", arenaRouter);
  }

  // mock 라우터
  app.use("/mock", mockRouter);

  // leaderboard 라우터
  app.use("/leaderboard", leaderboardRouter);

  // prompts 라우터
  app.use("/prompts", promptsRouter);

  // users 라우터
  app.use("/users", usersRouter);

  // Background jobs
  if (process.env.ENABLE_WEEKLY_REWARD_JOB !== "false") {
    startWeeklyRewardJob();
  }

  return app;
};
