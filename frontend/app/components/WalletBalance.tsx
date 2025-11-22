'use client';

import { useWallet } from '@/app/hooks/use-wallet';
import { useBalance } from 'wagmi';
import { Wallet } from 'lucide-react';
import { formatEther } from 'viem';
import { useEffect, useState } from 'react';

/**
 * 헤더에 표시되는 ETH 잔액 컴포넌트
 */
export function WalletBalance() {
  const { isAuthenticated, address, chainId } = useWallet();
  const [isMounted, setIsMounted] = useState(false);

  // 클라이언트에서만 마운트
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ETH 잔액 조회
  const { data: balanceData, isLoading } = useBalance({
    address: address as `0x${string}` | undefined,
    chainId: chainId,
  });

  // 클라이언트 마운트 전이거나 지갑이 연결되지 않았으면 표시 안 함
  if (!isMounted || !isAuthenticated || !address) {
    return null;
  }

  const balance = balanceData ? parseFloat(formatEther(balanceData.value)).toFixed(4) : '0.0000';

  return (
    <div 
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
      style={{ borderColor: '#0052FF40', backgroundColor: '#EEF5FF' }}
    >
      <Wallet className="w-4 h-4" style={{ color: '#0052FF' }} />
      <span className="text-sm font-medium" style={{ color: '#0052FF' }}>
        {isLoading ? 'Loading...' : `${balance} ETH`}
      </span>
    </div>
  );
}

