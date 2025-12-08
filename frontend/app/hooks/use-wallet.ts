'use client';

import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { useWalletStore } from '@/app/store/wallet-store';
import { baseSepolia } from 'viem/chains';

/**
 * 지갑 관련 기능을 통합한 커스텀 훅
 * Privy와 Wagmi의 기능을 조합하여 편리하게 사용
 */
export function useWallet() {
  const { authenticated, user, login, logout, ready } = usePrivy();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const {
    setAuthenticated,
    setUserAddress,
    setUserEmail,
    setChainId,
    setConnecting,
  } = useWalletStore();

  // Zustand 상태 업데이트
  // Privy와 Wagmi의 상태 변화를 감지하여 Zustand 스토어에 반영
  useEffect(() => {
    setAuthenticated(authenticated);
    setUserAddress(address || null);
    setUserEmail(user?.email?.address || null);
    setChainId(chainId || null);
  }, [authenticated, address, user, chainId, setAuthenticated, setUserAddress, setUserEmail, setChainId]);

  // Base Sepolia로 전환
  const switchToBaseSepolia = async () => {
    try {
      setConnecting(true);
      await switchChain({ chainId: baseSepolia.id });
    } catch (error) {
      console.error('Failed to switch to Base Sepolia', error);
    } finally {
      setConnecting(false);
    }
  };

  // 현재 네트워크가 Base Sepolia인지 확인
  const isCorrectNetwork = chainId === baseSepolia.id;

  return {
    isAuthenticated: authenticated,
    user,
    address,
    isConnected,
    chainId,
    login,
    logout,
    ready,
    switchToBaseSepolia,
    isCorrectNetwork,
    isConnecting: useWalletStore.getState().isConnecting,
    isDisconnecting: useWalletStore.getState().isDisconnecting,
  };
}

