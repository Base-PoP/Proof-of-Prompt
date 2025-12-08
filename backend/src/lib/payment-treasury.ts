import { ethers } from "ethers";
import { env } from "../config/env";

const PAYMENT_TREASURY_ABI = [
  "function pricePerChat() view returns (uint256)",
  "function acceptedToken() view returns (address)",
  "function payWithAllowance(address payer, uint256 amount) external",
  "function payWithPermit(address payer, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external",
  "function claimAchievement(uint256 achievementId, address recipient, uint256 amount, bytes32 nonce, bytes calldata signature) external",
  "function claimWeekly(uint256 week, uint8 rank, address recipient, uint256 amount, bytes32 nonce, bytes calldata signature) external",
];

const ERC20_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
];

const getProvider = () => {
  if (!env.rpcUrl) {
    throw new Error("RPC_URL is not configured");
  }
  return new ethers.JsonRpcProvider(env.rpcUrl);
};

const getContract = (signer?: ethers.Signer) => {
  const payTo = env.payToAddress;
  if (!payTo || payTo === ethers.ZeroAddress) {
    throw new Error("PAY_TO_ADDRESS is not configured");
  }
  const provider = signer ? undefined : getProvider();
  return new ethers.Contract(payTo, PAYMENT_TREASURY_ABI, signer ?? provider);
};

export async function fetchPricePerChat(): Promise<bigint> {
  const contract = getContract();
  return contract.pricePerChat();
}

export type PaymentPermit = {
  deadline: bigint;
  v: number;
  r: string;
  s: string;
};

export async function chargePaymentTreasury(
  payer: string,
  permit?: PaymentPermit
): Promise<{ txHash: string; amount: bigint; method: "permit" | "allowance" }> {
  if (!payer) {
    throw new Error("payer address is required");
  }

  const privateKey = env.facilitatorKey;
  if (!privateKey || privateKey.length < 10) {
    throw new Error("FACILITATOR_PRIVATE_KEY is not configured");
  }

  const provider = getProvider();
  const key = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const signer = new ethers.Wallet(key, provider);
  const contract = getContract(signer);

  const price: bigint = await contract.pricePerChat();

  // Debug: 컨트랙트의 acceptedToken과 사용자 allowance 조회
  try {
    const acceptedToken: string = await contract.acceptedToken();
    const tokenContract = new ethers.Contract(acceptedToken, ERC20_ABI, provider);
    const allowance: bigint = await tokenContract.allowance(payer, env.payToAddress);
    const balance: bigint = await tokenContract.balanceOf(payer);

    console.log("[PAYMENT DEBUG]", {
      payer,
      contractAcceptedToken: acceptedToken,
      expectedToken: env.usdcAddress,
      tokenMatch: acceptedToken.toLowerCase() === env.usdcAddress.toLowerCase(),
      userAllowance: allowance.toString(),
      userBalance: balance.toString(),
      requiredAmount: price.toString(),
      hasEnoughAllowance: allowance >= price,
      hasEnoughBalance: balance >= price,
    });
  } catch (debugErr) {
    console.error("[PAYMENT DEBUG ERROR]", debugErr);
  }

  // permit 우선 사용
  if (permit) {
    let tx;
    try {
      tx = await contract.payWithPermit(payer, price, permit.deadline, permit.v, permit.r, permit.s);
    } catch (err) {
      throw new Error((err as any)?.reason || (err as any)?.shortMessage || "permit payment failed");
    }
    const receipt = await tx.wait();
    return {
      txHash: receipt?.hash ?? tx.hash,
      amount: price,
      method: "permit",
    };
  }

  // allowance 경로
  try {
    const tx = await contract.payWithAllowance(payer, price);
    const receipt = await tx.wait();
    return {
      txHash: receipt?.hash ?? tx.hash,
      amount: price,
      method: "allowance",
    };
  } catch (err: any) {
    const reason = err?.reason || err?.shortMessage || "payment failed";
    const allowErr = new Error(reason) as Error & { code?: string; amount?: bigint };
    if (reason.toLowerCase().includes("allowance")) {
      allowErr.code = "ALLOWANCE_REQUIRED";
      allowErr.amount = price;
    }
    throw allowErr;
  }
}

export type AchievementSignature = {
  nonce: string;
  signature: string;
};

export async function signAchievementReward(achievementId: number, recipient: string, amount: bigint): Promise<AchievementSignature> {
  const signerKey = process.env.REWARD_SIGNER_PRIVATE_KEY;
  if (!signerKey || signerKey.length < 10) {
    throw new Error("REWARD_SIGNER_PRIVATE_KEY is not configured");
  }
  const key = signerKey.startsWith("0x") ? signerKey : `0x${signerKey}`;
  const wallet = new ethers.Wallet(key);
  const nonceBytes = ethers.randomBytes(32);
  const nonce = ethers.hexlify(nonceBytes);

  const digest = ethers.solidityPackedKeccak256(
    ["string", "uint256", "address", "uint256", "address", "uint256", "bytes32"],
    ["ACHIEVEMENT", Number(env.chainId), env.payToAddress, achievementId, recipient, amount, nonce]
  );
  const signature = await wallet.signMessage(ethers.getBytes(digest));

  return { nonce, signature: signature };
}

export async function claimAchievementOnChain(
  achievementId: number,
  recipient: string,
  amount: bigint,
  nonce: string,
  signature: string
): Promise<{ txHash: string }> {
  const privateKey = env.facilitatorKey;
  if (!privateKey || privateKey.length < 10) {
    throw new Error("FACILITATOR_PRIVATE_KEY is not configured");
  }
  const provider = getProvider();
  const key = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const signer = new ethers.Wallet(key, provider);
  const contract = getContract(signer);

  const tx = await contract.claimAchievement(achievementId, recipient, amount, nonce, signature as `0x${string}`);
  const receipt = await tx.wait();
  return { txHash: receipt?.hash ?? tx.hash };
}

export type WeeklySignature = {
  nonce: string;
  signature: string;
};

export async function signWeeklyReward(week: number, rank: number, recipient: string, amount: bigint): Promise<WeeklySignature> {
  const signerKey = process.env.REWARD_SIGNER_PRIVATE_KEY;
  if (!signerKey || signerKey.length < 10) {
    throw new Error("REWARD_SIGNER_PRIVATE_KEY is not configured");
  }
  const key = signerKey.startsWith("0x") ? signerKey : `0x${signerKey}`;
  const wallet = new ethers.Wallet(key);
  const nonceBytes = ethers.randomBytes(32);
  const nonce = ethers.hexlify(nonceBytes);

  const digest = ethers.solidityPackedKeccak256(
    ["string", "uint256", "address", "uint256", "uint8", "address", "uint256", "bytes32"],
    ["WEEKLY", Number(env.chainId), env.payToAddress, week, rank, recipient, amount, nonce]
  );
  const signature = await wallet.signMessage(ethers.getBytes(digest));
  return { nonce, signature };
}

export async function claimWeeklyOnChain(
  week: number,
  rank: number,
  recipient: string,
  amount: bigint,
  nonce: string,
  signature: string
): Promise<{ txHash: string }> {
  const privateKey = env.facilitatorKey;
  if (!privateKey || privateKey.length < 10) {
    throw new Error("FACILITATOR_PRIVATE_KEY is not configured");
  }
  const provider = getProvider();
  const key = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const signer = new ethers.Wallet(key, provider);
  const contract = getContract(signer);

  const tx = await contract.claimWeekly(week, rank, recipient, amount, nonce, signature as `0x${string}`);
  const receipt = await tx.wait();
  return { txHash: receipt?.hash ?? tx.hash };
}
