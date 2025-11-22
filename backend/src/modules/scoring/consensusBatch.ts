// src/modules/scoring/consensusBatch.ts
import { prisma } from "../../lib/prisma";

type Choice = "A" | "B" | "TIE";

// 컨센서스 관련 상수들 (원하면 숫자 바꿔서 튜닝)
const CONSENSUS_MAX = 5;            // 다수 의견과 완전히 일치할 때 최대 보너스
const MIN_VOTES_FOR_CONSENSUS = 3;  // 이보다 적으면 컨센서스 계산 안 함

/**
 * 전체 Match에 대해 집단 컨센서스 점수를 다시 계산하는 배치 함수.
 * - 각 Match에서 A/B/TIE 득표 수를 집계해서 majorityChoice 결정
 * - majorityChoice와 같은 선택을 한 투표에 보상(consensusScore) 부여
 * - 이전 consensusScore와 비교해서 delta만큼 Vote.totalScore / User.score 조정
 * - 여러 번 실행해도 결과가 중복 반영되지 않도록 idempotent하게 설계
 */
export async function recomputeConsensusScoresForAllMatches() {
  // 1) 모든 매치 + 해당 투표들 불러오기
  const matches = await prisma.match.findMany({
    include: {
      votes: true
    }
  });

  console.log(`[consensusBatch] Found ${matches.length} matches`);

  for (const match of matches) {
    const votes = match.votes;

    if (!votes || votes.length === 0) {
      continue;
    }

    if (votes.length < MIN_VOTES_FOR_CONSENSUS) {
      // 표가 너무 적으면 "집단 컨센서스"라는 의미가 약하니 스킵
      continue;
    }

    // 2) 각 선택지별 카운트
    let countA = 0;
    let countB = 0;
    let countTIE = 0;

    for (const v of votes) {
      if (v.chosenPosition === "A") countA++;
      else if (v.chosenPosition === "B") countB++;
      else if (v.chosenPosition === "TIE") countTIE++;
    }

    const totalVotes = votes.length;

    // 3) 최다 득표 선택지 계산
    const entries: { choice: Choice; count: number }[] = [
      { choice: "A", count: countA },
      { choice: "B", count: countB },
      { choice: "TIE", count: countTIE }
    ];

    // 득표 많은 순으로 정렬
    entries.sort((a, b) => b.count - a.count);

    const top = entries[0];
    const second = entries[1];

    let majorityChoice: Choice | null = null;

    // 완전 동률이면 majority 없음
    // (예: A=3, B=3, TIE=1 → top.count === second.count → null)
    if (top.count > 0 && top.count > second.count) {
      majorityChoice = top.choice;
    }

    if (!majorityChoice) {
      // 유의미한 다수가 없으면 consensusScore 계산 안 함
      continue;
    }

    const majorityFraction = top.count / totalVotes;

    console.log(
      `[consensusBatch] Match ${match.id}: majority=${majorityChoice}, ` +
        `count=${top.count}/${totalVotes}, fraction=${majorityFraction.toFixed(2)}`
    );

    // 4) 이 매치에 대한 모든 Vote/User 업데이트를 하나의 트랜잭션으로 처리
    await prisma.$transaction(async (tx) => {
      for (const v of votes) {
        const oldConsensus = v.consensusScore ?? 0;

        // majorityChoice와 같은 선택이면 보상, 아니면 0
        let newConsensus = 0;
        if (v.chosenPosition === majorityChoice) {
          newConsensus = CONSENSUS_MAX * majorityFraction;
        }

        const delta = newConsensus - oldConsensus;

        // 변화가 없으면 스킵 (idempotent 보장)
        if (delta === 0) continue;

        // Vote 업데이트: consensusScore 갱신 + totalScore에 delta 반영
        await tx.vote.update({
          where: { id: v.id },
          data: {
            consensusScore: newConsensus,
            totalScore: v.totalScore + delta
          }
        });

        // User.score 업데이트 (익명 투표면 userId가 null일 수 있음)
        if (v.userId != null) {
          await tx.user.update({
            where: { id: v.userId },
            data: {
              score: { increment: delta }
            }
          });
        }
      }
    });
  }

  console.log("[consensusBatch] ✅ Consensus recomputation finished.");
}
