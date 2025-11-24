import { useEffect, useRef, useState } from 'react';
import { useSignMessage } from 'wagmi';
import { PaymentRequiredError } from '../../lib/api';

export type PaymentStatus = 'idle' | 'requires_signature' | 'authorizing' | 'processing';

export interface PaymentState {
  pendingPayment: {
    token: string;
    pay_to_address?: string;
    amount: string;
    message?: string;
    prompt?: string;
  } | null;
  paymentAuth: string | null;
  lastAuth: string | null;
  lastAuthAddress: string | null;
  status: PaymentStatus;
  setStatus: (s: PaymentStatus) => void;
  setPendingPayment: (p: PaymentState['pendingPayment']) => void;
  setPaymentAuth: (v: string | null) => void;
  setLastAuth: (v: string | null) => void;
  signForPayment: (payment: PaymentState['pendingPayment']) => Promise<string>;
  handlePaymentError: (err: any, prompt: string, setPrompt: (v: string) => void, setCurrentMessage: (v: any) => void, setError: (v: string | null) => void, isPaymentRetry: boolean) => boolean;
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
  const { signMessageAsync } = useSignMessage();
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

  const signForPayment = async (payment: PaymentState['pendingPayment']) => {
    const nonce = `auth-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const message = `Pay ${payment?.amount} to ${payment?.pay_to_address || 'treasury'} at ${new Date().toISOString()} :: ${nonce}`;
    const signature = await signMessageAsync({ message });
    return JSON.stringify({ nonce, signature, message });
  };

  const handlePaymentError = (
    err: any,
    prompt: string,
    setPrompt: (v: string) => void,
    setCurrentMessage: (v: any) => void,
    setError: (v: string | null) => void,
    isPaymentRetry: boolean
  ) => {
    if (err instanceof PaymentRequiredError || err?.name === 'PaymentRequiredError') {
      setPendingPayment({ ...err.payment, prompt });
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
    signForPayment,
    handlePaymentError,
  };
}
