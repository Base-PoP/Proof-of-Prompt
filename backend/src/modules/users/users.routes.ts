import { Router } from "express";
import { getUserProfileHandler, getAchievementsHandler, getSharedPromptsHandler, claimAchievementHandler } from "./users.service";

export const usersRouter = Router();

// Get user profile with stats and popular posts
usersRouter.get("/:walletAddress/profile", getUserProfileHandler);

// Get user achievements
usersRouter.get("/:walletAddress/achievements", getAchievementsHandler);
// Claim achievement (future onchain reward hook placeholder)
usersRouter.post("/:walletAddress/achievements/:achievementId/claim", claimAchievementHandler);

// Get user's shared prompts (sorted by likes or latest)
usersRouter.get("/:walletAddress/shared-prompts", getSharedPromptsHandler);
