import { useEffect, useRef, useState } from 'react';
import { useWalletClient, usePublicClient } from 'wagmi';
import { maxUint256 } from 'viem';
import { PaymentRequiredError } from '../../lib/api';
import { USDC_ADDRESS, USDC_ABI } from '../../lib/contracts/usdc-config';

export type PaymentStatus = 'idle' | 'requires_signature' | 'authorizing' | 'processing';

type SetMessageFn = (v: { prompt: string; response: string; matchId?: string } | null) => void;

export interface PaymentState {
  pendingPayment: {
    token: string;
    pay_to_address?: string;
    amount: string;
    message?: string;
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
      return null;
    } catch {
      return null;
    }
  };

  const [pendingPayment, setPendingPayment] = useState<PaymentState['pendingPayment']>(null);
  const [paymentAuth, setPaymentAuth] = useState<string | null>(loadStoredAuth()?.auth ?? null);
  const [lastAuth, setLastAuthState] = useState<string | null>(loadStoredAuth()?.auth ?? null);
  const [lastAuthAddress, setLastAuthAddress] = useState<string | null>(loadStoredAuth()?.address ?? null);
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const prevAddressRef = useRef<string | undefined>(currentAddress);

  // 지갑 주소가 바뀌면 저장된 서명 무효화
  useEffect(() => {
    const prev = prevAddressRef.current?.toLowerCase?.();
    const curr = currentAddress?.toLowerCase?.();
    // 주소가 존재하고, 이전 주소도 존재하며 서로 다를 때만 무효화
    if (prev && curr && prev !== curr) {
      prevAddressRef.current = currentAddress;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('lastPaymentAuth');
      }
      setPaymentAuth(null);
      setLastAuthState(null);
      setLastAuthAddress(null);
      setPendingPayment(null);
      setStatus('idle');
    } else {
      prevAddressRef.current = currentAddress;
    }
  }, [currentAddress]);

  const setLastAuth = (value: string | null) => {
    setLastAuthState(value);
    setPaymentAuth(value);
    setLastAuthAddress(currentAddress?.toLowerCase?.() || null);
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
    handlePaymentError,
  };
}
