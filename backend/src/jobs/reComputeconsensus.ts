// src/jobs/recomputeConsensus.ts
import { prisma } from "../lib/prisma";
import { recomputeConsensusScoresForAllMatches } from "../modules/scoring/consensusBatch";

async function main() {
  try {
    await recomputeConsensusScoresForAllMatches();
  } catch (err) {
    console.error("[jobs/recomputeConsensus] Failed:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
