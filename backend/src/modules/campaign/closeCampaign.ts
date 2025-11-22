// src/modules/campaign/closeCampaign.ts
import { prisma } from "../../lib/prisma";

/**
 * 캠페인 종료 및 보상 분배
 * 
 * 1. 캠페인의 모든 매치에 대해 consensus 점수 계산
 * 2. 사용자별 총점 집계
 * 3. 프라이즈 풀을 비율에 따라 분배
 * 4. CampaignReward 레코드 생성
 */

const CONSENSUS_MAX = 5;
const MIN_VOTES_FOR_CONSENSUS = 3;

type Choice = "A" | "B" | "TIE";

interface UserCampaignScore {
  userId: number;
  consensusScore: number;
  totalVotes: number;
}

export async function closeCampaignAndDistributeRewards(campaignId: number) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      matches: {
        include: {
          votes: true
        }
      }
    }
  });

  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  if (campaign.status !== "active") {
    throw new Error(`Campaign ${campaignId} is not active (status: ${campaign.status})`);
  }

  console.log(`🏁 Closing campaign: ${campaign.title}`);
  console.log(`💰 Prize pool: ${campaign.prizeAmount} ${campaign.prizeCurrency}`);

  // 사용자별 점수 맵
  const userScores = new Map<number, UserCampaignScore>();

  // 1. 각 매치에 대해 consensus 계산
  for (const match of campaign.matches) {
    const votes = match.votes;

    if (!votes || votes.length < MIN_VOTES_FOR_CONSENSUS) {
      continue;
    }

    // 각 선택지별 카운트
    let countA = 0;
    let countB = 0;
    let countTIE = 0;

    for (const v of votes) {
      if (v.chosenPosition === "A") countA++;
      else if (v.chosenPosition === "B") countB++;
      else if (v.chosenPosition === "TIE") countTIE++;
    }

    const totalVotes = votes.length;

    // 최다 득표 선택지 계산
    const entries: { choice: Choice; count: number }[] = [
      { choice: "A", count: countA },
      { choice: "B", count: countB },
      { choice: "TIE", count: countTIE }
    ];

    entries.sort((a, b) => b.count - a.count);

    const top = entries[0];
    const second = entries[1];

    let majorityChoice: Choice | null = null;

    if (top.count > 0 && top.count > second.count) {
      majorityChoice = top.choice;
    }

    if (!majorityChoice) {
      continue;
    }

    const majorityFraction = top.count / totalVotes;

    // 2. 각 투표자의 consensus 점수 계산
    for (const vote of votes) {
      if (!vote.userId) continue; // 익명 투표는 스킵

      let consensusScore = 0;
      if (vote.chosenPosition === majorityChoice) {
        consensusScore = CONSENSUS_MAX * majorityFraction;
      }

      // 사용자별 누적
      const existing = userScores.get(vote.userId);
      if (existing) {
        existing.consensusScore += consensusScore;
        existing.totalVotes += 1;
      } else {
        userScores.set(vote.userId, {
          userId: vote.userId,
          consensusScore,
          totalVotes: 1
        });
      }
    }
  }

  console.log(`📊 Total participants: ${userScores.size}`);

  // 3. 총 consensus 점수 계산
  let totalConsensusScore = 0;
  for (const score of userScores.values()) {
    totalConsensusScore += score.consensusScore;
  }

  if (totalConsensusScore === 0) {
    console.log("⚠️ No consensus scores to distribute");
    
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "closed",
        closedAt: new Date()
      }
    });
    
    return {
      campaignId,
      status: "closed",
      message: "No rewards distributed (no consensus scores)",
      participants: 0
    };
  }

  console.log(`📈 Total consensus score: ${totalConsensusScore.toFixed(2)}`);

  // 4. 보상 분배 및 기록
  const rewards: any[] = [];
  
  await prisma.$transaction(async (tx) => {
    for (const [userId, score] of userScores.entries()) {
      // 보상 비율 = 개인 점수 / 전체 점수
      const rewardRatio = score.consensusScore / totalConsensusScore;
      const rewardAmount = campaign.prizeAmount * rewardRatio;

      // CampaignReward 생성
      const reward = await tx.campaignReward.create({
        data: {
          campaignId: campaign.id,
          userId,
          consensusScore: score.consensusScore,
          totalVotes: score.totalVotes,
          rewardAmount
        }
      });

      rewards.push({
        userId,
        consensusScore: score.consensusScore,
        totalVotes: score.totalVotes,
        rewardAmount,
        rewardRatio: (rewardRatio * 100).toFixed(2) + '%'
      });

      console.log(
        `💸 User ${userId}: ${score.consensusScore.toFixed(2)} points ` +
        `(${score.totalVotes} votes) → ${rewardAmount.toFixed(2)} ${campaign.prizeCurrency}`
      );
    }

    // 캠페인 상태 업데이트
    await tx.campaign.update({
      where: { id: campaignId },
      data: {
        status: "rewarded",
        closedAt: new Date(),
        totalVotes: campaign.matches.reduce((sum, m) => sum + m.votes.length, 0)
      }
    });
  });

  console.log(`✅ Campaign closed and rewards distributed!`);

  return {
    campaignId,
    status: "rewarded",
    prizeAmount: campaign.prizeAmount,
    prizeCurrency: campaign.prizeCurrency,
    participants: userScores.size,
    totalConsensusScore,
    rewards
  };
}
