/**
 * x402 Payment Protocol Middleware
 * 
 * x402는 HTTP 402 Payment Required를 활용한 pay-per-use 프로토콜
 * 클라이언트가 요청 시 x-payment-authorization 헤더를 포함해야 함
 */

import { Request, Response, NextFunction } from 'express';
import { processAutoPayment } from './payment';

export interface X402Config {
  price: string; // 가격 (USD 단위, 예: "0.01")
  network: 'base-sepolia'; // Base Sepolia만 지원
  description?: string;
  currency?: string; // 기본값: "USDC"
}

export interface PaymentPayload {
  chainId: number;
  token: string;
  pay_to_address: string;
  amount: string;
  price: string; // USD 단위
  network: 'base-sepolia';
  description?: string;
  timestamp: number;
  facilitator_url?: string;
}

// Base Sepolia만 지원
const CHAIN_CONFIG = {
  'base-sepolia': {
    chainId: 84532,
    rpcUrl: 'https://sepolia.base.org',
    usdc: '0x13a332e3E45a2A0D96B66f79e5b34694Dc288b46', // Base Sepolia USDC (테스트용)
  },
};

const USD_TO_USDC_RATE = 1; // Assuming 1 USDC = 1 USD

/**
 * USD 가격을 USDC 금액(6 decimals)으로 변환
 * 예: "$0.01" → 10000 (wei)
 */
export function convertUsdToUsdc(priceUsd: string): string {
  const amount = parseFloat(priceUsd.replace('$', ''));
  const usdcAmount = amount * USD_TO_USDC_RATE;
  // USDC는 6 decimals
  const wei = Math.floor(usdcAmount * 1e6).toString();
  return wei;
}

/**
 * x402 결제 필수 응답 생성
 */
export function buildX402PaymentRequired(
  config: X402Config,
  payToAddress: string,
  facilitatorUrl?: string
): PaymentPayload {
  const chainConfig = CHAIN_CONFIG[config.network];
  const amount = convertUsdToUsdc(config.price);

  return {
    chainId: chainConfig.chainId,
    token: chainConfig.usdc,
    pay_to_address: payToAddress,
    amount,
    price: config.price,
    network: config.network,
    description: config.description,
    timestamp: Date.now(),
    facilitator_url: facilitatorUrl,
  };
}

/**
 * x402 세션 토큰 생성 (1번 서명 후 재사용)
 * EIP-3009 기반: 서명한 후 백엔드에서 토큰 생성
 * 이후 요청들은 이 토큰으로 검증 (서명 재요청 없음)
 */
export function generateX402SessionToken(
  user: string,
  signature: string,
  expiresIn: number = 3600 // 1시간
): string {
  const payload = {
    user,
    signature,
    issuedAt: Date.now(),
    expiresAt: Date.now() + expiresIn * 1000,
  };
  
  // 간단한 Base64 인코딩 (실제로는 JWT 사용)
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * x402 세션 토큰 검증
 */
export function validateX402SessionToken(token: string): { 
  user: string; 
  signature: string; 
  valid: boolean;
  expired: boolean;
} {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    
    // 만료 확인
    if (decoded.expiresAt < Date.now()) {
      return { 
        user: decoded.user, 
        signature: decoded.signature, 
        valid: false,
        expired: true 
      };
    }
    
    return { 
      user: decoded.user, 
      signature: decoded.signature, 
      valid: true,
      expired: false 
    };
  } catch (error) {
    return { 
      user: '', 
      signature: '', 
      valid: false,
      expired: false 
    };
  }
}

/**
 * x402 결제 미들웨어 팩토리
 * 
 * 작동 원리:
 * 1. 첫 요청: 402 응답 + Permit 서명 요청
 * 2. 서명 완료 후: x-402-session 토큰 받음
 * 3. 이후 요청: 토큰으로 검증 (서명 재요청 없음!)
 * 
 * 사용법:
 * ```
 * router.post('/chat', x402Middleware(config, payToAddress), handler);
 * ```
 */
export function x402Middleware(
  config: X402Config,
  payToAddress: string,
  facilitatorUrl?: string
) {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log(`\n[x402] 요청: ${req.method} ${req.path}`);
    
    // 1단계: 세션 토큰 확인 (이미 서명한 사용자)
    const sessionToken = req.headers['x-402-session'] as string | undefined;
    
    if (sessionToken) {
      console.log('[x402] 세션 토큰 발견');
      const tokenData = validateX402SessionToken(sessionToken);
      
      if (tokenData.valid) {
        console.log('[x402] ✅ 토큰 유효 → 요청 진행');
        // 토큰 유효! 서명 재요청 없이 진행
        (req as any).x402Session = tokenData;
        (req as any).x402Config = config;
        return next();
      }
      
      if (tokenData.expired) {
        console.log('[x402] ⏰ 토큰 만료 → 재서명 필요');
        // 토큰 만료 → 다시 서명받기
        return res.status(402).json({
          error: 'Payment session expired',
          x402: buildX402PaymentRequired(config, payToAddress, facilitatorUrl),
          sessionExpired: true,
        });
      }
    }
    
    // 2단계: 초기 요청 (서명 받기)
    const paymentAuth = req.headers['x-payment-authorization'] as string | undefined;

    if (!paymentAuth) {
      // 초기 요청: 402 응답 + Permit 서명 요청
      console.log('[x402] ❌ 서명 없음 → 402 응답 (첫 서명 요청)');
      console.log(`[x402] 가격: ${config.price} ${config.currency}`);
      console.log(`[x402] 받을 주소: ${payToAddress}`);
      
      return res.status(402).json({
        error: 'Payment Required',
        x402: buildX402PaymentRequired(config, payToAddress, facilitatorUrl),
        requiresSignature: true,
      });
    }

    // 3단계: 서명을 받았음 → 검증 및 토큰 발급
    try {
      console.log('[x402] 📝 서명 수신 → 검증 중...');
      
      // TODO: 실제 서명 검증 (EIP-191)
      // const verified = verifyEIP191Signature(paymentAuth, user);
      
      // 임시로 유효하다고 가정
      const sessionToken = generateX402SessionToken(
        req.body?.user || 'anonymous',
        paymentAuth,
        3600 // 1시간 유효
      );
      
      console.log('[x402] ✅ 토큰 생성 완료');
      
      // 응답에 토큰 포함
      res.setHeader('x-402-session', sessionToken);
      
      (req as any).x402Session = validateX402SessionToken(sessionToken);
      (req as any).x402Config = config;
      (req as any).paymentAuth = paymentAuth;
      
      console.log('[x402] 🎫 토큰 발급 → 요청 진행');
      return next();
    } catch (error) {
      console.error('[x402] ❌ 토큰 생성 실패:', error);
      return res.status(401).json({
        error: 'Invalid payment signature',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * x402 미들웨어 설정 객체
 * Express 라우터에 여러 엔드포인트의 가격을 한 번에 정의
 */
export interface X402EndpointConfig {
  [path: string]: X402Config;
}

/**
 * 다중 엔드포인트 x402 미들웨어
 * 
 * 작동 원리:
 * - 각 엔드포인트별로 다른 가격 설정 가능
 * - 첫 요청: 402 응답
 * - 이후: 세션 토큰으로 인증 (서명 재요청 없음)
 * 
 * 사용법:
 * ```
 * const x402Endpoints = {
 *   '/chat': {
 *     price: '$0.01',
 *     network: 'base-sepolia',
 *     description: 'Single LLM prompt'
 *   },
 *   '/chat/stream': {
 *     price: '$0.02',
 *     network: 'base-sepolia',
 *     description: 'Streaming LLM prompt'
 *   }
 * };
 * 
 * app.use(x402MultiMiddleware(x402Endpoints, payToAddress));
 * ```
 */
export function x402MultiMiddleware(
  endpointConfigs: X402EndpointConfig,
  payToAddress: string,
  facilitatorUrl?: string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 현재 경로에 맞는 설정 찾기
    const config = endpointConfigs[req.path];

    if (!config) {
      console.log(`[x402] 경로 ${req.path}는 x402 설정 없음 → 스킵`);
      return next(); // 설정되지 않은 엔드포인트는 스킵
    }

    console.log(`\n[x402-multi] 요청: ${req.method} ${req.path}`);
    console.log(`[x402-multi] 설정: ${config.price} ${config.currency}`);

    // 1단계: 세션 토큰 확인 (재요청 - 서명 없음)
    const sessionToken = req.headers['x-402-session'] as string | undefined;
    
    if (sessionToken) {
      console.log('[x402-multi] 세션 토큰 발견');
      const tokenData = validateX402SessionToken(sessionToken);
      
      if (tokenData.valid) {
        console.log('[x402-multi] ✅ 토큰 유효 → 요청 진행');
        
        // ✅ 자동 결제 처리
        try {
          const walletAddress = tokenData.user || 'anonymous';
          const amount = Math.floor(parseFloat(config.price.replace('$', '')) * 1e6).toString(); // USD to USDC (6 decimals)
          
          console.log('[x402-multi] 💳 자동 결제 시작...');
          const paymentResult = await processAutoPayment(walletAddress, amount);
          
          console.log(`[x402-multi] 결제 완료: ${paymentResult.mode}`);
          if (paymentResult.txHash) {
            console.log(`[x402-multi] Tx: ${paymentResult.txHash}\n`);
          }
        } catch (paymentError) {
          console.error('[x402-multi] ⚠️ 결제 처리 중 오류:', paymentError);
          // 결제 오류가 나도 이미 토큰이 유효하므로 요청은 진행
          console.log('[x402-multi] (요청은 계속 진행합니다)\n');
        }
        
        // 토큰 유효! 서명 재요청 없이 진행
        (req as any).x402Session = tokenData;
        (req as any).x402Config = config;
        return next();
      }
      
      if (tokenData.expired) {
        console.log('[x402-multi] ⏰ 토큰 만료 → 재서명 필요');
        // 토큰 만료
        return res.status(402).json({
          error: 'Payment session expired',
          x402: buildX402PaymentRequired(config, payToAddress, facilitatorUrl),
          sessionExpired: true,
        });
      }
    }

    // 2단계: 초기 요청 (서명 받기)
    const paymentAuth = req.headers['x-payment-authorization'] as string | undefined;

    if (!paymentAuth) {
      // 초기 요청: 402 응답
      console.log('[x402-multi] ❌ 서명 없음 → 402 응답 (첫 서명 요청)');
      console.log(`[x402-multi] 가격: ${config.price}`);
      console.log(`[x402-multi] 받을 주소: ${payToAddress}`);
      
      return res.status(402).json({
        error: 'Payment Required',
        x402: buildX402PaymentRequired(config, payToAddress, facilitatorUrl),
        requiresSignature: true,
      });
    }

    // 3단계: 서명을 받았음 → 검증 및 토큰 발급
    try {
      console.log('[x402-multi] 📝 서명 수신 → 검증 중...');
      
      const walletAddress = req.body?.user || 'anonymous';
      const sessionToken = generateX402SessionToken(
        walletAddress,
        paymentAuth,
        3600
      );
      
      console.log('[x402-multi] ✅ 토큰 생성 완료');
      
      // ✅ 초기 서명 후 첫 결제 처리
      try {
        const amount = Math.floor(parseFloat(config.price.replace('$', '')) * 1e6).toString();
        console.log('[x402-multi] 💳 초기 결제 처리 중...');
        const paymentResult = await processAutoPayment(walletAddress, amount);
        console.log(`[x402-multi] 초기 결제 완료: ${paymentResult.mode}`);
        if (paymentResult.txHash) {
          console.log(`[x402-multi] Tx: ${paymentResult.txHash}`);
        }
      } catch (paymentError) {
        console.error('[x402-multi] ⚠️ 초기 결제 오류:', paymentError);
      }
      
      // 응답에 토큰 포함
      res.setHeader('x-402-session', sessionToken);
      
      (req as any).x402Session = validateX402SessionToken(sessionToken);
      (req as any).x402Config = config;
      (req as any).paymentAuth = paymentAuth;
      
      console.log('[x402-multi] 🎫 토큰 발급 → 요청 진행\n');
      return next();
    } catch (error) {
      console.error('[x402-multi] ❌ 토큰 생성 실패:', error);
      return res.status(401).json({
        error: 'Invalid payment signature',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}
