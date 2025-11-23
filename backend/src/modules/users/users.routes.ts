import { Router } from "express";
import { getUserProfileHandler } from "./users.service";

export const usersRouter = Router();

// Get user profile with stats and popular posts
usersRouter.get("/:walletAddress/profile", getUserProfileHandler);
