import { ethers } from "ethers";
import { env } from "../config/env";

const PAYMENT_TREASURY_ABI = [
  "function pricePerChat() view returns (uint256)",
  "function payWithAllowance(address payer, uint256 amount) external",
  "function payWithPermit(address payer, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external",
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
