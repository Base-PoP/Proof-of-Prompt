'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { DEPOSIT_POOL_ADDRESS, DEPOSIT_POOL_ABI, TransactionType, type DepositPoolTransaction } from '@/lib/contracts/deposit-pool-config';
import { useState } from 'react';

/**
 * 예치 풀 컨트랙트와 상호작용하는 커스텀 훅
 * 
 * 사용 예시:
 * ```tsx
 * const { 
 *   creditBalance, 
 *   transactions, 
 *   deposit, 
 *   withdraw,
 *   isLoading 
 * } = useDepositPool();
 * ```
 */
export function useDepositPool() {
  const { address, chainId } = useAccount();
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // 컨트랙트 주소 가져오기
  const contractAddress = chainId ? DEPOSIT_POOL_ADDRESS[chainId as keyof typeof DEPOSIT_POOL_ADDRESS] : undefined;

  // ========================================
  // Read Functions
  // ========================================

  /**
   * 사용자의 크레딧 잔액 조회
   */
  const { 
    data: creditBalance, 
    isLoading: isCreditBalanceLoading,
    refetch: refetchBalance 
  } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: DEPOSIT_POOL_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  /**
   * 트랜잭션 히스토리 조회
   */
  const { 
    data: transactionHistory,
    isLoading: isTransactionHistoryLoading,
    refetch: refetchTransactions
  } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: DEPOSIT_POOL_ABI,
    functionName: 'getTransactionHistory',
    args: address ? [address, BigInt(0), BigInt(50)] : undefined, // 최근 50개 트랜잭션
    query: {
      enabled: !!address && !!contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  /**
   * 환율 조회 (1 ETH = ? credits)
   */
  const { data: exchangeRate } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: DEPOSIT_POOL_ABI,
    functionName: 'getExchangeRate',
    query: {
      enabled: !!contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  // ========================================
  // Write Functions
  // ========================================

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * ETH 예치 (크레딧 받기)
   */
  const deposit = async (amountInEth: string) => {
    if (!contractAddress || !address) {
      throw new Error('Wallet not connected or contract not deployed');
    }

    setIsDepositing(true);
    try {
      const value = parseEther(amountInEth);
      
      writeContract({
        address: contractAddress as `0x${string}`,
        abi: DEPOSIT_POOL_ABI,
        functionName: 'deposit',
        value,
      });

      // 트랜잭션 완료 후 잔액 갱신
      await refetchBalance();
      await refetchTransactions();
    } catch (error) {
      console.error('Deposit failed:', error);
      throw error;
    } finally {
      setIsDepositing(false);
    }
  };

  /**
   * ETH 인출 (크레딧 소각)
   */
  const withdraw = async (amountInEth: string) => {
    if (!contractAddress || !address) {
      throw new Error('Wallet not connected or contract not deployed');
    }

    setIsWithdrawing(true);
    try {
      const amount = parseEther(amountInEth);
      
      writeContract({
        address: contractAddress as `0x${string}`,
        abi: DEPOSIT_POOL_ABI,
        functionName: 'withdraw',
        args: [amount],
      });

      // 트랜잭션 완료 후 잔액 갱신
      await refetchBalance();
      await refetchTransactions();
    } catch (error) {
      console.error('Withdraw failed:', error);
      throw error;
    } finally {
      setIsWithdrawing(false);
    }
  };

  // ========================================
  // Helper Functions
  // ========================================

  /**
   * 트랜잭션 히스토리를 UI용 포맷으로 변환
   */
  const formatTransactions = (txs: readonly DepositPoolTransaction[] | undefined) => {
    if (!txs) return [];

    return txs.map((tx) => ({
      id: `${tx.timestamp}-${tx.txType}`,
      type: tx.txType === TransactionType.DEPOSIT ? 'deposit' : 
            tx.txType === TransactionType.WITHDRAW ? 'withdraw' : 'usage',
      amount: parseFloat(formatEther(tx.amount)),
      credits: Number(tx.credits),
      date: new Date(Number(tx.timestamp) * 1000).toLocaleDateString('ko-KR'),
      status: 'completed' as const,
      reason: tx.reason || '',
    }));
  };

  /**
   * 크레딧을 숫자로 변환
   */
  const formatCredits = (credits: bigint | undefined) => {
    if (!credits) return 0;
    return Number(credits);
  };

  return {
    // 잔액 정보
    creditBalance: formatCredits(creditBalance),
    rawCreditBalance: creditBalance,
    exchangeRate: exchangeRate ? Number(exchangeRate) : 1000, // 기본값: 1 ETH = 1000 credits

    // 트랜잭션 히스토리
    transactions: formatTransactions(transactionHistory as readonly DepositPoolTransaction[] | undefined),
    rawTransactions: transactionHistory,

    // 액션
    deposit,
    withdraw,
    refetchBalance,
    refetchTransactions,

    // 상태
    isLoading: isCreditBalanceLoading || isTransactionHistoryLoading,
    isDepositing,
    isWithdrawing,
    isConfirming,
    isSuccess,

    // 컨트랙트 정보
    contractAddress,
    isContractDeployed: !!contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000',
  };
}

