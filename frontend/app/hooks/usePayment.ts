import { useEffect, useRef, useState } from 'react';
import { useWalletClient, usePublicClient, useSignMessage } from 'wagmi';
import { maxUint256 } from 'viem';
import { PaymentRequiredError } from '../../lib/api';
import { USDC_ADDRESS, USDC_ABI } from '../../lib/contracts/usdc-config';

export type PaymentStatus = 'idle' | 'requires_signature' | 'authorizing' | 'processing';

type SetMessageFn = (v: { prompt: string; response: string; matchId?: string } | null) => void;
const AUTH_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface PaymentState {
  pendingPayment: {
    token: string;
    chainId?: number | string;
    pay_to_address?: string;
    amount: string;
    message?: string;
    price?: string;
    network?: string;
    prompt?: string;
    allowanceRequired?: boolean;
    reason?: string;
  } | null;
  paymentAuth: string | null;
  lastAuth: string | null;
  lastAuthAddress: string | null;
  status: PaymentStatus;
  setStatus: (s: PaymentStatus) => void;
  setPendingPayment: (p: PaymentState['pendingPayment']) => void;
  setPaymentAuth: (v: string | null) => void;
  setLastAuth: (v: string | null) => void;
  approveForPayment: (payment: PaymentState['pendingPayment']) => Promise<string>;
  signForPayment: (payment: PaymentState['pendingPayment']) => Promise<string>;
  handlePaymentError: (
    err: unknown,
    prompt: string,
    setPrompt: (v: string) => void,
    setCurrentMessage: SetMessageFn,
    setError: (v: string | null) => void,
    isPaymentRetry: boolean
  ) => boolean;
}

export function usePayment(currentAddress?: string): PaymentState {
  const loadStoredAuth = () => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('lastPaymentAuth');
    if (!saved || saved === 'null' || saved === 'undefined') return null;
    try {
      const parsed = JSON.parse(saved) as { address?: string; auth?: string };
      if (parsed?.auth && parsed?.address && parsed.address.toLowerCase() === currentAddress?.toLowerCase()) {
        return parsed as { address: string; auth: string };
      }
      // 주소 불일치 시에도 auth는 반환해 동일 서명 재사용을 허용
      if (parsed?.auth) {
        return { address: parsed.address, auth: parsed.auth };
      }
      return null;
    } catch {
      return null;
    }
  };

  const isAuthFresh = (auth?: string | null) => {
    if (!auth) return false;
    try {
      const raw = typeof window === 'undefined' ? Buffer.from(auth, 'base64').toString('utf8') : atob(auth);
      const parsed = JSON.parse(raw);
      const ts = Number(parsed?.payload?.timestamp ?? parsed?.timestamp ?? 0);
      if (!ts) return false;
      return Date.now() - ts < AUTH_TTL_MS;
    } catch {
      return false;
    }
  };

  const stored = loadStoredAuth();
  const initialAuth = stored?.auth && isAuthFresh(stored.auth) ? stored.auth : null;

  const [pendingPayment, setPendingPayment] = useState<PaymentState['pendingPayment']>(null);
  const [paymentAuth, setPaymentAuth] = useState<string | null>(initialAuth);
  const [lastAuth, setLastAuthState] = useState<string | null>(initialAuth);
  const [lastAuthAddress, setLastAuthAddress] = useState<string | null>(stored?.address ?? null);
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { signMessageAsync } = useSignMessage();
  const prevAddressRef = useRef<string | undefined>(currentAddress);

  // 지갑 주소가 바뀌면 저장된 서명 무효화
  useEffect(() => {
    const prev = prevAddressRef.current?.toLowerCase?.();
    const curr = currentAddress?.toLowerCase?.();
    // 주소가 존재하고, 이전 주소도 존재하며 서로 다를 때만 무효화
    if (prev && curr && prev !== curr) {
      prevAddressRef.current = currentAddress;
      // 주소가 바뀌더라도 서명 세션은 유지 (멀티 탭 동일 주소 지원)
      setLastAuthAddress(null);
    } else {
      prevAddressRef.current = currentAddress;
    }
  }, [currentAddress]);

  const setLastAuth = (value: string | null) => {
    setLastAuthState(value);
    setPaymentAuth(value);
    if (value && isAuthFresh(value)) {
      setLastAuthAddress(currentAddress?.toLowerCase?.() || null);
    }
    if (typeof window !== 'undefined') {
      if (value) {
        localStorage.setItem('lastPaymentAuth', JSON.stringify({ address: currentAddress, auth: value }));
      } else {
        localStorage.removeItem('lastPaymentAuth');
      }
    }
  };

  const approveForPayment = async (payment: PaymentState['pendingPayment']) => {
    if (!walletClient) throw new Error('Wallet not connected');
    if (!publicClient) throw new Error('RPC client unavailable');
    if (!payment?.pay_to_address) throw new Error('pay_to_address missing');

    const txHash = await walletClient.writeContract({
      address: (payment.token || USDC_ADDRESS) as `0x${string}`,
      abi: [
        ...USDC_ABI,
        {
          name: 'approve',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [{ name: 'success', type: 'bool' }],
        },
      ] as const,
      functionName: 'approve',
      args: [payment.pay_to_address as `0x${string}`, maxUint256],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });
    // 승인 후 별도 토큰은 저장하지 않지만, 결제 재시도를 트리거하기 위해 dummy auth 반환
    return txHash;
  };

  const signForPayment = async (payment: PaymentState['pendingPayment']) => {
    if (!payment) throw new Error('No payment to sign');
    if (!walletClient) throw new Error('Wallet not connected');
    const address = walletClient.account.address;
    const price = payment.price || (Number(payment.amount || '0') / 1e6).toFixed(2);
    const network = payment.network || 'base-sepolia';
    const description = payment.message || 'API usage';
    const payload = {
      chainId: Number(payment.chainId ?? 84532),
      token: payment.token,
      pay_to_address: payment.pay_to_address as string,
      amount: payment.amount,
      price,
      network,
      description,
      timestamp: Date.now(),
    };
    const message = `I authorize payment for ${payload.price} USD (${payload.amount} ${payload.token}) to ${payload.pay_to_address} on ${payload.network} chain for: ${payload.description}`;
    const signature = await signMessageAsync({ message });
    const raw = JSON.stringify({ payload, signature, address, timestamp: payload.timestamp });
    const encoded = typeof window !== 'undefined' ? btoa(unescape(encodeURIComponent(raw))) : raw;
    return encoded;
  };

  const handlePaymentError = (
    err: unknown,
    prompt: string,
    setPrompt: (v: string) => void,
    setCurrentMessage: SetMessageFn,
    setError: (v: string | null) => void,
    isPaymentRetry: boolean
  ) => {
    const paymentErr = err as { name?: string; payment?: PaymentState['pendingPayment']; allowanceRequired?: boolean; reason?: string };
    if (err instanceof PaymentRequiredError || paymentErr?.name === 'PaymentRequiredError') {
      const allowanceRequired = paymentErr?.allowanceRequired;
      const reason = paymentErr?.reason;
      if (paymentErr.payment) {
        setPendingPayment({ ...paymentErr.payment, prompt, allowanceRequired, reason });
      }
      setPaymentAuth(null);
      setError(null);
      setStatus('requires_signature');
      if (!isPaymentRetry) {
        setPrompt(prompt);
        setCurrentMessage(null);
      }
      return true;
    }
    return false;
  };

  return {
    pendingPayment,
    paymentAuth,
    lastAuth,
    lastAuthAddress,
    status,
    setStatus,
    setPendingPayment,
    setPaymentAuth,
    setLastAuth,
    approveForPayment,
    signForPayment,
    handlePaymentError,
  };
}
