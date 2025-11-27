'use client';

import { useWallet } from '@/app/hooks/use-wallet';
import { useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Wallet, Droplets } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { USDC_ADDRESS, FAUCET_ADDRESS, FAUCET_ABI } from '@/lib/contracts/usdc-config';

/**
 * 헤더에 표시되는 USDC 잔액 컴포넌트
 */
export function WalletBalance() {
  const { isAuthenticated, address, chainId } = useWallet();
  const [isMounted, setIsMounted] = useState(false);

  // 클라이언트에서만 마운트
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // USDC 잔액 조회
  const { data: balanceData, isLoading, refetch: refetchBalance } = useBalance({
    address: address as `0x${string}` | undefined,
    chainId: chainId,
    token: USDC_ADDRESS,
    query: {
      enabled: isMounted && isAuthenticated && !!address,
    },
  });

  // Faucet 청구 가능 여부 확인
  const { data: canClaim, refetch: refetchCanClaim } = useReadContract({
    address: FAUCET_ADDRESS,
    abi: FAUCET_ABI,
    functionName: 'canClaim',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: isMounted && isAuthenticated && !!address,
    },
  });

  // Faucet claim 트랜잭션
  const { writeContract, data: txHash, isPending: isClaiming } = useWriteContract();

  // 트랜잭션 완료 대기
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // 트랜잭션 완료 시 잔액 및 상태 갱신
  useEffect(() => {
    if (isConfirmed) {
      toast.success('100 USDC 받기 완료!');
      refetchBalance();
      refetchCanClaim();
    }
  }, [isConfirmed, refetchBalance, refetchCanClaim]);

  const handleClaim = async () => {
    if (!canClaim) {
      toast.error('24시간 후에 다시 받을 수 있습니다');
      return;
    }

    try {
      writeContract({
        address: FAUCET_ADDRESS,
        abi: FAUCET_ABI,
        functionName: 'claim',
      });
    } catch (error) {
      console.error('Faucet claim error:', error);
      toast.error('토큰 받기 실패');
    }
  };

  // 클라이언트 마운트 전이거나 지갑이 연결되지 않았으면 표시 안 함
  if (!isMounted || !isAuthenticated || !address) {
    return null;
  }

  // wagmi의 useBalance는 token decimals를 자동으로 처리하여 formatted를 제공함
  const balance = balanceData ? parseFloat(balanceData.formatted).toFixed(2) : '0.00';
  const isClaimInProgress = isClaiming || isConfirming;

  return (
    <div className="flex items-center gap-2">
      {/* Faucet 버튼 */}
      <button
        onClick={handleClaim}
        disabled={isClaimInProgress || !canClaim}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          borderColor: canClaim ? '#10B981' : '#9CA3AF',
          backgroundColor: canClaim ? '#ECFDF5' : '#F3F4F6',
          color: canClaim ? '#059669' : '#6B7280'
        }}
        title={canClaim ? '100 USDC 받기' : '24시간 후 다시 받을 수 있습니다'}
      >
        <Droplets className="w-4 h-4" />
        <span className="text-sm font-medium">
          {isClaimInProgress ? '처리중...' : 'Faucet'}
        </span>
      </button>

      {/* 잔액 표시 */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
        style={{ borderColor: '#0052FF40', backgroundColor: '#EEF5FF' }}
      >
        <Wallet className="w-4 h-4" style={{ color: '#0052FF' }} />
        <span className="text-sm font-medium" style={{ color: '#0052FF' }}>
          {isLoading ? 'Loading...' : `${balance} USDC`}
        </span>
      </div>
    </div>
  );
}

