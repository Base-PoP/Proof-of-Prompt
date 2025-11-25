/**
 * x402 서명 검증 및 Treasury 통합
 * 
 * 1. x402 서명 검증 (EIP-191)
 * 2. Treasury 비용 확인
 * 3. Flock 비용 차감
 */

import { prisma } from './prisma';
import { ethers } from 'ethers';

const X402_TTL_MS = Number(process.env.X402_SIGNATURE_TTL_MS || 24 * 60 * 60 * 1000); // default 24h

export interface X402SignaturePayload {
  payload: {
    chainId: number;
    token: string;
    pay_to_address: string;
    amount: string;
    price: string;
    network: string;
    description?: string;
    timestamp: number;
  };
  signature: string;
  address: string;
  timestamp: number;
}

/**
 * x402 서명 메시지 생성 (클라이언트와 동일하게)
 */
export function createX402SignatureMessage(
  chainId: number,
  token: string,
  payToAddress: string,
  amount: string,
  price: string,
  network: string,
  description?: string
): string {
  return (
    `I authorize payment for ${price} USD (${amount} ${token}) ` +
    `to ${payToAddress} on ${network} chain ` +
    `for: ${description || 'API usage'}`
  );
}

/**
 * x402 서명 검증 (EIP-191 표준)
 * 
 * TODO: ethers.js 설치 후 구현
 * ```typescript
 * import { ethers } from 'ethers';
 * 
 * export async function verifyX402Signature(payload: X402SignaturePayload): Promise<boolean> {
 *   try {
 *     const message = createX402SignatureMessage(
 *       payload.payload.chainId,
 *       payload.payload.token,
 *       payload.payload.pay_to_address,
 *       payload.payload.amount,
 *       payload.payload.price,
 *       payload.payload.network,
 *       payload.payload.description
 *     );
 *
 *     const recovered = ethers.verifyMessage(message, payload.signature);
 *     return recovered.toLowerCase() === payload.address.toLowerCase();
 *   } catch (error) {
 *     console.error('Failed to verify x402 signature:', error);
 *     return false;
 *   }
 * }
 * ```
 */
export async function verifyX402Signature(payload: X402SignaturePayload): Promise<boolean> {
  try {
    // 타임스탬프 검증 (기본 24h, env로 조정 가능)
    const now = Date.now();
    const timeDiff = Math.abs(now - payload.timestamp);
    if (timeDiff > X402_TTL_MS) {
      console.warn('x402 signature expired', { timestamp: payload.timestamp, now, ttl: X402_TTL_MS });
      return false;
    }

    try {
      const message = createX402SignatureMessage(
        payload.payload.chainId,
        payload.payload.token,
        payload.payload.pay_to_address,
        payload.payload.amount,
        payload.payload.price,
        payload.payload.network,
        payload.payload.description
      );
      const recovered = ethers.verifyMessage(message, payload.signature);
      return recovered.toLowerCase() === payload.address.toLowerCase();
    } catch (err) {
      console.error('Failed to verify x402 signature with ethers:', err);
      return false;
    }
  } catch (error) {
    console.error('Failed to verify x402 signature:', error);
    return false;
  }
}

/**
 * x402 결제 기록 저장
 */
export async function recordX402Payment(
  walletAddress: string,
  amount: string,
  price: string,
  network: string,
  description: string
) {
  try {
      await prisma.paymentAuthorization.create({
      data: {
        walletAddress,
        nonce: `x402-${Date.now()}-${Math.random()}`,
        validBefore: BigInt(Date.now() + 5 * 60 * 1000), // 5분 유효
      },
    });    console.log(`[x402] Payment recorded: ${walletAddress} - ${price}`);
  } catch (error) {
    console.error('Failed to record x402 payment:', error);
    throw error;
  }
}

/**
 * Treasury 잔액 확인 및 비용 차감 (모의)
 * 
 * 실제 구현:
 * 1. Treasury Pool 컨트랙트 호출
 * 2. deductFlockCost() 실행
 * 3. 트랜잭션 확인
 */
export async function checkAndDeductTreasuryCost(
  userAddress: string,
  cost: string // USDC wei
): Promise<{
  success: boolean;
  balance?: string;
  txHash?: string;
  error?: string;
}> {
  try {
    // TODO: Treasury Pool 컨트랙트와 통합
    // const treasury = getTreasuryPool();
    // const balance = await treasury.getUserBalance(userAddress);
    // 
    // if (BigInt(balance) < BigInt(cost)) {
    //   return {
    //     success: false,
    //     balance: balance.toString(),
    //     error: 'Insufficient Treasury balance'
    //   };
    // }
    //
    // const txHash = await treasury.deductFlockCost(userAddress, 1);
    // return {
    //   success: true,
    //   balance: (BigInt(balance) - BigInt(cost)).toString(),
    //   txHash
    // };

    console.log('[treasury] Cost deduction pending contract setup');
    return {
      success: true, // 테스트 모드
      balance: cost,
    };
  } catch (error) {
    console.error('Failed to deduct treasury cost:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 사용자의 Treasury 잔액 조회
 */
export async function getTreasuryBalance(userAddress: string): Promise<{
  balance: string;
  balanceFormatted: string;
  error?: string;
}> {
  try {
    // TODO: Treasury Pool 컨트랙트와 통합
    // const treasury = getTreasuryPool();
    // const balance = await treasury.getUserBalance(userAddress);
    // const formatted = await treasury.getUserBalanceFormatted(userAddress);
    // 
    // return {
    //   balance: balance.toString(),
    //   balanceFormatted: formatted
    // };

    console.log('[treasury] Balance query pending contract setup');
    return {
      balance: '0',
      balanceFormatted: '0',
    };
  } catch (error) {
    return {
      balance: '0',
      balanceFormatted: '0',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
