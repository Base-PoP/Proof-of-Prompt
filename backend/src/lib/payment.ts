import { prisma } from './prisma';
import { ethers } from 'ethers';
import { fetchPricePerChat } from './payment-treasury';
import { env } from '../config/env';

const COST_PER_CHAT = 100000; // 0.1 USDC (6 decimals)
const PAYMENT_TOKEN = env.usdcAddress;
const PAY_TO_ADDRESS = env.payToAddress;
const TREASURY_POOL_ADDRESS = process.env.TREASURY_POOL_ADDRESS || '';
const TREASURY_POOL_RPC_URL = process.env.TREASURY_POOL_RPC_URL || 'https://sepolia.base.org';
const CHAIN_ID = Number(env.chainId);

// Debug: 환경변수 로드 확인
console.log('[PAYMENT CONFIG] Loaded:', {
  PAYMENT_TOKEN,
  PAY_TO_ADDRESS,
  CHAIN_ID,
});

// USDC ABI (필요한 함수들만)
const USDC_ABI = [
  'function transfer(address to, uint256 amount) public returns (bool)',
  'function balanceOf(address account) public view returns (uint256)',
  'function decimals() public view returns (uint8)',
];

// TreasuryPool ABI
const TREASURY_POOL_ABI = [
  'function receivePayment(address payer, uint256 amount) public',
];

export async function buildPaymentRequiredPayload() {
  let amount = BigInt(COST_PER_CHAT);
  try {
    amount = await fetchPricePerChat();
  } catch (err) {
    console.warn('[payment] pricePerChat 조회 실패, 기본값 사용:', err);
  }

  return {
    chainId: CHAIN_ID,
    token: PAYMENT_TOKEN,
    pay_to_address: PAY_TO_ADDRESS,
    amount: amount.toString(),
    message: '결제용 서명(authorization)이 필요합니다. 지갑에서 서명 후 다시 요청하세요.',
    price: (Number(amount) / 1e6).toFixed(2),
    network: process.env.X402_NETWORK || 'base-sepolia'
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
  // 동일 지갑이 이미 사용한 nonce라면 재사용을 허용한다.
  if (exists) {
    if (exists.walletAddress?.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new Error('Payment authorization already used');
    }
    return;
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

/**
 * 자동 결제 처리 (백엔드에서 TreasuryPool로 USDC 전송)
 * @param walletAddress 사용자 지갑 주소
 * @param amount 결제 금액 (기본값: 0.001 USDC)
 */
export async function processAutoPayment(
  walletAddress: string,
  amount: string = '1000' // 0.001 USDC (6 decimals)
) {
  try {
    if (!TREASURY_POOL_ADDRESS) {
      throw new Error('TREASURY_POOL_ADDRESS not configured');
    }

    console.log(`\n[💳 AUTO PAYMENT]`);
    console.log(`┌─ 사용자: ${walletAddress}`);
    console.log(`├─ 금액: ${amount} wei (${ethers.formatUnits(amount, 6)} USDC)`);
    console.log(`└─ 수신처: ${TREASURY_POOL_ADDRESS}`);

    const privateKey = process.env.BACKEND_PRIVATE_KEY;
    
    // 테스트 모드: 프라이빗 키 없으면 시뮬레이션만 함
    if (!privateKey || privateKey === '' || privateKey.length < 60) {
      console.log(`[⚠️  테스트 모드] 실제 트랜잭션 대신 기록만 저장합니다`);
      
      // 데이터베이스에 결제 기록 저장
      await recordPaymentAuthorization(walletAddress, JSON.stringify({
        nonce: `payment-${Date.now()}`,
        amount,
        timestamp: Date.now(),
      }));
      
      console.log('[✅] 결제 기록 저장 완료\n');
      return { success: true, txHash: null, mode: 'simulated' };
    }

    // 실제 결제 모드: 프라이빗 키가 있으면 실행
    console.log(`[🔐] 실제 트랜잭션 모드`);
    
    const provider = new ethers.JsonRpcProvider(TREASURY_POOL_RPC_URL);
    const signer = new ethers.Wallet(privateKey, provider);
    
    console.log(`├─ 서명자: ${signer.address}`);
    
    // USDC 컨트랙트
    const usdc = new ethers.Contract(PAYMENT_TOKEN, USDC_ABI, signer);
    
    // USDC 잔액 확인
    try {
      const balance = await usdc.balanceOf(signer.address);
      console.log(`├─ 지갑 USDC 잔액: ${ethers.formatUnits(balance, 6)}`);
      
      if (balance < BigInt(amount)) {
        throw new Error(
          `Insufficient balance: ${ethers.formatUnits(balance, 6)} < ${ethers.formatUnits(amount, 6)}`
        );
      }
    } catch (balanceError) {
      console.error(`├─ ⚠️  잔액 조회 실패:`, balanceError);
      console.log(`[⚠️  폴백] 잔액 검사 없이 진행합니다`);
    }

    // USDC를 TreasuryPool로 전송
    console.log(`├─ 전송 중...`);
    const tx = await usdc.transfer(TREASURY_POOL_ADDRESS, BigInt(amount));
    
    console.log(`├─ 트랜잭션 해시: ${tx.hash}`);
    console.log(`├─ 대기 중... (블록 확인)`);
    
    const receipt = await tx.wait();
    
    console.log(`├─ ✅ 블록 확인됨: #${receipt?.blockNumber}`);
    console.log(`└─ 가스 사용: ${receipt?.gasUsed.toString()}\n`);

    // 데이터베이스에 결제 기록 저장
    await recordPaymentAuthorization(walletAddress, JSON.stringify({
      nonce: `payment-${receipt?.transactionHash}`,
      amount,
      timestamp: Date.now(),
      txHash: receipt?.transactionHash,
    }));

    return {
      success: true,
      txHash: receipt?.transactionHash,
      mode: 'executed',
    };
  } catch (error) {
    console.error('[❌ 자동 결제 실패]', error);
    throw error;
  }
}
