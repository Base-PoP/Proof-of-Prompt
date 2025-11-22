import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { arenaRouter } from "./modules/arena/arena.routes";
import { leaderboardRouter } from "./modules/leaderboard/leaderboard.routes";

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // health check
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/arena", arenaRouter);
  app.use("/leaderboard", leaderboardRouter);

  return app;
};
