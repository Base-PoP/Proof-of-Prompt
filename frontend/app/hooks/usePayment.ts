import { useState } from 'react';
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
  status: PaymentStatus;
  setStatus: (s: PaymentStatus) => void;
  setPendingPayment: (p: PaymentState['pendingPayment']) => void;
  setPaymentAuth: (v: string | null) => void;
  setLastAuth: (v: string | null) => void;
  signForPayment: (payment: PaymentState['pendingPayment']) => Promise<string>;
  handlePaymentError: (err: any, prompt: string, setPrompt: (v: string) => void, setCurrentMessage: (v: any) => void, setError: (v: string | null) => void, isPaymentRetry: boolean) => boolean;
}

export function usePayment(): PaymentState {
  const [pendingPayment, setPendingPayment] = useState<PaymentState['pendingPayment']>(null);
  const [paymentAuth, setPaymentAuth] = useState<string | null>(null);
  const [lastAuth, setLastAuth] = useState<string | null>(null);
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const { signMessageAsync } = useSignMessage();

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
    status,
    setStatus,
    setPendingPayment,
    setPaymentAuth,
    setLastAuth,
    signForPayment,
    handlePaymentError,
  };
}
