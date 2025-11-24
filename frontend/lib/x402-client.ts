/**
 * x402 Payment Protocol Client
 * 
 * x402는 HTTP 402 Payment Required를 활용한 pay-per-use 프로토콜
 * 클라이언트가 요청 시 x-payment-authorization 헤더를 포함해야 함
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Provider = any;

export interface X402PaymentPayload {
  chainId: number;
  token: string;
  pay_to_address: string;
  amount: string;
  price: string;
  network: 'base' | 'base-sepolia';
  description?: string;
  timestamp: number;
  facilitator_url?: string;
}

/**
 * x402 세션 토큰 관리 (1번 서명 후 재사용)
 * 로컬스토리지에 저장해서 페이지 새로고침 후에도 유지
 */

const SESSION_TOKEN_KEY = 'x402_session_token';

export function saveX402SessionToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  }
}

export function getX402SessionToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  }
  return null;
}

export function clearX402SessionToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  }
}

/**
 * 지갑에서 서명 가능한 메시지 생성
 * EIP-191 형식
 */
export function createX402SignatureMessage(payload: X402PaymentPayload): string {
  return (
    `I authorize payment for ${payload.price} USD (${payload.amount} ${payload.token}) ` +
    `to ${payload.pay_to_address} on ${payload.network} chain ` +
    `for: ${payload.description || 'API usage'}`
  );
}

/**
 * x402 서명 생성 (지갑 서명)
 */
export async function signX402Payment(
  message: string,
  address: string,
  provider: Provider
): Promise<string> {
  try {
    const signer = await provider.getSigner();
    const signature = await signer.signMessage(message);
    return signature;
  } catch (error) {
    console.error('Failed to sign x402 payment:', error);
    throw error;
  }
}

/**
 * x402 결제 인증 토큰 생성
 */
export function createX402AuthToken(
  payload: X402PaymentPayload,
  signature: string,
  address: string
): string {
  const auth = {
    payload,
    signature,
    address,
    timestamp: Date.now(),
  };
  return JSON.stringify(auth);
}

/**
 * x402 402 응답 처리
 * 클라이언트가 자동으로 결제 인증을 수행
 */
export async function handleX402PaymentRequired(
  payment: X402PaymentPayload,
  address: string,
  provider: Provider
): Promise<string> {
  const message = createX402SignatureMessage(payment);
  console.log('[x402] Signing message:', message);

  const signature = await signX402Payment(message, address, provider);
  console.log('[x402] Signature:', signature);

  const authToken = createX402AuthToken(payment, signature, address);
  return authToken;
}

export async function x402Fetch<T = Record<string, unknown>>(
  url: string,
  options: RequestInit & { x402?: { address: string; provider: Provider } } = {},
  maxRetries: number = 1
): Promise<T> {
  let retries = 0;
  let currentHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(typeof options.headers === 'object' && options.headers !== null 
      ? (options.headers as Record<string, string>) 
      : {}),
  };

  // 1단계: 저장된 세션 토큰 확인 (이미 서명한 사용자)
  const savedSessionToken = getX402SessionToken();
  if (savedSessionToken) {
    currentHeaders['x-402-session'] = savedSessionToken;
  }

  while (retries <= maxRetries) {
    const response = await fetch(url, {
      ...options,
      headers: currentHeaders,
    });

    if (response.status === 402) {
      // 402 받음 → 서명 필요

      if (retries >= maxRetries) {
        // 토큰이 만료됨 (이전 토큰 삭제)
        clearX402SessionToken();
        throw new Error('Max x402 retries exceeded - session expired');
      }

      const data = await response.json() as { x402: X402PaymentPayload };
      const payment: X402PaymentPayload = data.x402;

      if (!options.x402) {
        throw new Error('x402 address and provider required for payment authorization');
      }

      // 2단계: 서명 수행 (1번만)
      const authToken = await handleX402PaymentRequired(
        payment,
        options.x402.address,
        options.x402.provider
      );

      // 3단계: 헤더에 서명 추가 후 재시도
      currentHeaders = {
        'Content-Type': 'application/json',
        ...(typeof options.headers === 'object' && options.headers !== null 
          ? (options.headers as Record<string, string>) 
          : {}),
        'x-payment-authorization': authToken,
      };

      retries++;
      continue;
    }

    // 4단계: 응답 성공
    if (response.ok) {
      // 응답 헤더에서 새 세션 토큰 확인
      const newSessionToken = response.headers.get('x-402-session');
      if (newSessionToken) {
        // 5단계: 새 토큰 저장 (다음 요청부터 사용)
        saveX402SessionToken(newSessionToken);
      }

      return (await response.json()) as T;
    }

    // 오류 응답
    const errorText = await response.text();
    throw new Error(
      `API Error: ${response.statusText} - ${errorText}`
    );
  }

  throw new Error('x402Fetch failed: max retries exceeded');
}

