// src/modules/arena/elo.ts

export type EloOutcome = "A_WIN" | "B_WIN" | "TIE";

interface EloResult {
  newRatingA: number;
  newRatingB: number;
}

const K = 32; // K-factor, 나중에 조절 가능

export function updateElo(
  ratingA: number,
  ratingB: number,
  outcome: EloOutcome
): EloResult {
  // 기대 승률
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;

  let scoreA = 0.5;
  let scoreB = 0.5;

  if (outcome === "A_WIN") {
    scoreA = 1;
    scoreB = 0;
  } else if (outcome === "B_WIN") {
    scoreA = 0;
    scoreB = 1;
  } else {
    // TIE면 0.5 / 0.5 유지
  }

  const newRatingA = ratingA + K * (scoreA - expectedA);
  const newRatingB = ratingB + K * (scoreB - expectedB);

  return {
    newRatingA,
    newRatingB
  };
}
