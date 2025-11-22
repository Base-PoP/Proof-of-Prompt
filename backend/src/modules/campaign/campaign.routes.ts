// src/modules/campaign/campaign.routes.ts
import { Router } from "express";
import { 
  createCampaignHandler, 
  getCampaignsHandler,
  getCampaignDetailsHandler,
  closeCampaignHandler 
} from "./campaign.service";

export const campaignRouter = Router();

// 캠페인 생성 (스폰서용)
campaignRouter.post("/", createCampaignHandler);

// 활성 캠페인 목록 조회
campaignRouter.get("/", getCampaignsHandler);

// 특정 캠페인 상세 조회
campaignRouter.get("/:id", getCampaignDetailsHandler);

// 캠페인 종료 및 보상 분배
campaignRouter.post("/:id/close", closeCampaignHandler);
