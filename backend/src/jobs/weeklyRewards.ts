import { prisma } from "../lib/prisma";
import { signWeeklyReward, claimWeeklyOnChain } from "../lib/payment-treasury";

const WEEKLY_INTERVAL_MS = (Number(process.env.WEEKLY_REWARD_INTERVAL_SEC) || 604800) * 1000; // default 7 days
const WEEKLY_AMOUNTS = process.env.WEEKLY_REWARD_AMOUNTS
  ? process.env.WEEKLY_REWARD_AMOUNTS.split(",").map((v) => BigInt(v.trim()))
  : [BigInt(5_000_000), BigInt(3_000_000), BigInt(1_000_000)]; // 5,3,1 USDC (6 decimals)

let lastDistributedWeek = -1;

async function fetchTopUsers(limit: number = 3) {
  const users = await prisma.user.findMany({
    include: {
      prompts: {
        where: { isShared: true },
        select: { likes: true },
      },
    },
  });

  const stats = users
    .map((u) => {
      const totalLikes = u.prompts.reduce((sum, p) => sum + p.likes, 0);
      return { address: u.nickname, totalLikes };
    })
    .sort((a, b) => b.totalLikes - a.totalLikes)
    .slice(0, limit);

  return stats;
}

export function startWeeklyRewardJob() {
  const intervalMs = WEEKLY_INTERVAL_MS;
  console.log(`[WEEKLY JOB] Starting weekly reward job. Interval: ${intervalMs / 1000}s`);

  const tick = async () => {
    const currentWeek = Math.floor(Date.now() / intervalMs);
    if (currentWeek === lastDistributedWeek) return;

    try {
      console.log(`[WEEKLY JOB] Distributing rewards for week ${currentWeek}`);
      const topUsers = await fetchTopUsers(3);
      for (let i = 0; i < Math.min(topUsers.length, WEEKLY_AMOUNTS.length); i++) {
        const user = topUsers[i];
        const amount = WEEKLY_AMOUNTS[i];
        if (!user.address) continue;

        try {
          const { nonce, signature } = await signWeeklyReward(currentWeek, i + 1, user.address, amount);
          const { txHash } = await claimWeeklyOnChain(currentWeek, i + 1, user.address, amount, nonce, signature);
          console.log(`[WEEKLY JOB] Rewarded rank ${i + 1} (${user.address}) amount ${amount} txHash ${txHash}`);
        } catch (err) {
          console.error(`[WEEKLY JOB] Failed to reward rank ${i + 1} (${user.address})`, err);
        }
      }
      lastDistributedWeek = currentWeek;
    } catch (err) {
      console.error("[WEEKLY JOB] Error running distribution", err);
    }
  };

  setInterval(tick, intervalMs);
}
