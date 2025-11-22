// src/modules/campaign/campaign.service.ts
import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { closeCampaignAndDistributeRewards } from "./closeCampaign";

// 캠페인 생성 스키마
const createCampaignSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  sponsorName: z.string().min(1),
  sponsorType: z.enum(["company", "foundation", "individual"]),
  prizeAmount: z.number().positive(),
  prizeCurrency: z.string().default("USD"),
  modelAId: z.number(),
  modelBId: z.number(),
  endDate: z.string().datetime() // ISO 8601 string
});

/**
 * POST /campaign
 * 새 캠페인 생성
 */
export const createCampaignHandler = async (req: Request, res: Response) => {
  const parsed = createCampaignSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error });
  }

  const { title, description, sponsorName, sponsorType, prizeAmount, prizeCurrency, modelAId, modelBId, endDate } = parsed.data;

  try {
    const campaign = await prisma.campaign.create({
      data: {
        title,
        description,
        sponsorName,
        sponsorType,
        prizeAmount,
        prizeCurrency,
        modelAId,
        modelBId,
        endDate: new Date(endDate),
        status: "active"
      },
      include: {
        modelA: true,
        modelB: true
      }
    });

    res.json({
      success: true,
      campaign
    });
  } catch (err) {
    console.error("❌ Campaign creation failed:", err);
    res.status(500).json({ error: "Failed to create campaign" });
  }
};

/**
 * GET /campaign
 * 캠페인 목록 조회 (필터링 가능)
 */
export const getCampaignsHandler = async (req: Request, res: Response) => {
  const { status } = req.query;

  try {
    const campaigns = await prisma.campaign.findMany({
      where: status ? { status: String(status) } : undefined,
      include: {
        modelA: true,
        modelB: true,
        _count: {
          select: {
            matches: true,
            rewards: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json({
      campaigns,
      total: campaigns.length
    });
  } catch (err) {
    console.error("❌ Failed to get campaigns:", err);
    res.status(500).json({ error: "Failed to get campaigns" });
  }
};

/**
 * GET /campaign/:id
 * 캠페인 상세 조회
 */
export const getCampaignDetailsHandler = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: Number(id) },
      include: {
        modelA: true,
        modelB: true,
        matches: {
          include: {
            _count: {
              select: {
                votes: true
              }
            }
          }
        },
        rewards: {
          include: {
            user: true
          },
          orderBy: {
            rewardAmount: "desc"
          }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.json({ campaign });
  } catch (err) {
    console.error("❌ Failed to get campaign details:", err);
    res.status(500).json({ error: "Failed to get campaign details" });
  }
};

/**
 * POST /campaign/:id/close
 * 캠페인 종료 및 보상 분배
 */
export const closeCampaignHandler = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await closeCampaignAndDistributeRewards(Number(id));
    
    res.json({
      success: true,
      ...result
    });
  } catch (err: any) {
    console.error("❌ Failed to close campaign:", err);
    res.status(500).json({ 
      error: "Failed to close campaign",
      detail: err.message 
    });
  }
};
