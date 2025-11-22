// src/modules/scoring/consistencyScore.ts
import { prisma } from "../../lib/prisma";

/**
 * 일관성 점수 계산
 * 
 * 사용자가 최근 투표에서 Reference AI와 얼마나 일치하는지 측정
 * - 높은 일치율 = 일관된 품질 기준으로 평가
 * - 낮은 일치율 = 무작위 투표 또는 봇 의심
 */

const CONSISTENCY_WINDOW = 10;  // 최근 N개 투표 확인
const HIGH_CONSISTENCY_THRESHOLD = 0.7;  // 70% 이상 일치
const MEDIUM_CONSISTENCY_THRESHOLD = 0.5; // 50% 이상 일치

const CONSISTENCY_HIGH_SCORE = 2;    // 높은 일관성
const CONSISTENCY_MEDIUM_SCORE = 1;  // 중간 일관성
const CONSISTENCY_LOW_SCORE = 0;     // 낮은 일관성

export async function calculateConsistencyScore(
  userId: number,
  currentVoteId?: number
): Promise<number> {
  // 1. 최근 N개 투표 가져오기 (현재 투표 제외)
  const recentVotes = await prisma.vote.findMany({
    where: {
      userId,
      ...(currentVoteId ? { id: { not: currentVoteId } } : {})
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: CONSISTENCY_WINDOW,
    include: {
      match: {
        include: {
          responses: true,
          prompt: true
        }
      }
    }
  });

  // 투표 수가 부족하면 일관성 점수 없음
  if (recentVotes.length < 3) {
    return 0;
  }

  // 2. Reference Score가 있는 투표만 필터링
  const votesWithRef = recentVotes.filter(v => v.referenceScore > 0);

  if (votesWithRef.length === 0) {
    return 0;
  }

  // 3. Reference AI와 일치한 비율 계산
  const matchRate = votesWithRef.length / recentVotes.length;

  // 4. 일관성 점수 계산
  if (matchRate >= HIGH_CONSISTENCY_THRESHOLD) {
    return CONSISTENCY_HIGH_SCORE;
  } else if (matchRate >= MEDIUM_CONSISTENCY_THRESHOLD) {
    return CONSISTENCY_MEDIUM_SCORE;
  } else {
    return CONSISTENCY_LOW_SCORE;
  }
}

/**
 * 고급 일관성 점수 (선택 사항)
 * - 투표 편향성 체크
 * - 시간 패턴 분석
 */
export async function calculateAdvancedConsistencyScore(
  userId: number
): Promise<{
  consistencyScore: number;
  bias: number;
  avgResponseTime: number;
  flags: string[];
}> {
  const recentVotes = await prisma.vote.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  if (recentVotes.length < 5) {
    return {
      consistencyScore: 0,
      bias: 0,
      avgResponseTime: 0,
      flags: ['insufficient_data']
    };
  }

  const flags: string[] = [];
  let consistencyScore = 0;

  // 1. Reference 일치율
  const withRef = recentVotes.filter(v => v.referenceScore > 0);
  const matchRate = withRef.length / recentVotes.length;

  if (matchRate >= 0.7) {
    consistencyScore += 2;
  } else if (matchRate >= 0.5) {
    consistencyScore += 1;
  }

  // 2. 편향성 체크
  const aCount = recentVotes.filter(v => v.chosenPosition === 'A').length;
  const bCount = recentVotes.filter(v => v.chosenPosition === 'B').length;
  const tieCount = recentVotes.filter(v => v.chosenPosition === 'TIE').length;
  
  const maxChoice = Math.max(aCount, bCount, tieCount);
  const bias = maxChoice / recentVotes.length;

  // 90% 이상 한쪽으로 치우치면 봇 의심
  if (bias > 0.9) {
    consistencyScore -= 2;
    flags.push('high_bias');
  }

  // 3. 시간 패턴 (투표 간 평균 시간)
  const times: number[] = [];
  for (let i = 1; i < recentVotes.length; i++) {
    const diff = recentVotes[i - 1].createdAt.getTime() - recentVotes[i].createdAt.getTime();
    times.push(diff / 1000); // 초 단위
  }

  const avgResponseTime = times.reduce((a, b) => a + b, 0) / times.length;

  // 평균 5초 이하로 빠르게 투표하면 의심
  if (avgResponseTime < 5) {
    consistencyScore -= 1;
    flags.push('too_fast');
  }

  return {
    consistencyScore: Math.max(0, consistencyScore), // 음수 방지
    bias,
    avgResponseTime,
    flags
  };
}
