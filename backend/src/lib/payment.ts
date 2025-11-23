import { prisma } from './prisma';

const COST_PER_CHAT = 100000; // 0.1 USDC (6 decimals)
const PAYMENT_TOKEN = process.env.USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const PAY_TO_ADDRESS = process.env.PAY_TO_ADDRESS || '0x0000000000000000000000000000000000000000';
const CHAIN_ID = Number(process.env.CHAIN_ID || '84532');

export function buildPaymentRequiredPayload() {
  return {
    chainId: CHAIN_ID,
    token: PAYMENT_TOKEN,
    pay_to_address: PAY_TO_ADDRESS,
    amount: COST_PER_CHAT.toString(),
    message: '결제용 서명(authorization)이 필요합니다. 지갑에서 서명 후 다시 요청하세요.',
  };
}

/**
 * 결제 서명 nonce 기록 (EIP-3009 서명 검증/브로드캐스트는 추후 연동)
 */
export async function recordPaymentAuthorization(walletAddress: string, rawAuth: string) {
  let parsed: any;
  try {
    parsed = typeof rawAuth === 'string' ? JSON.parse(rawAuth) : rawAuth;
  } catch {
    parsed = null;
  }

  const nonce = parsed?.nonce || `pseudo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const validBefore = parsed?.validBefore ? BigInt(parsed.validBefore) : undefined;

  const exists = await prisma.paymentAuthorization.findUnique({ where: { nonce } });
  if (exists) {
    throw new Error('Payment authorization already used');
  }

  await prisma.paymentAuthorization.create({
    data: {
      walletAddress,
      nonce,
      validBefore,
    },
  });
}

export const paymentConstants = {
  COST_PER_CHAT,
  PAYMENT_TOKEN,
  PAY_TO_ADDRESS,
  CHAIN_ID,
};

