import { useEffect, useRef, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { useWalletStore } from '../store/wallet-store';
import { toast } from 'sonner';

/**
 * 인증 및 권한 관리 훅
 */
export function useAuth() {
  const { authenticated, ready, user, login, logout } = usePrivy();
  const { address } = useAccount();
  const {
    isAuthenticated,
    userAddress,
    setAuthenticated,
    setUserAddress,
    setUserEmail,
    reset,
  } = useWalletStore();

  // 이전 지갑 주소를 추적하여 지갑 전환 감지
  const previousAddressRef = useRef<string | null>(null);
  const isHandlingWalletChange = useRef(false);

  // 지갑 변경 처리 함수
  const handleWalletChange = useCallback(async (newAddress: string, oldAddress: string) => {
    if (isHandlingWalletChange.current) return;
    isHandlingWalletChange.current = true;

    console.log(`Wallet changed from ${oldAddress} to ${newAddress}`);

    // 기존 세션 로그아웃
    try {
      await logout();
      reset();

      // 새 지갑으로 로그인 요청
      toast.info('지갑이 변경되었습니다. 다시 연결해주세요.', {
        action: {
          label: '연결하기',
          onClick: () => login(),
        },
      });
    } catch (error) {
      console.error('Failed to handle wallet change:', error);
    } finally {
      isHandlingWalletChange.current = false;
    }
  }, [logout, reset, login]);

  // Privy 인증 상태를 Zustand 스토어와 동기화
  useEffect(() => {
    let walletAddress = address || user?.wallet?.address;

    // Fallback: Check localStorage for Privy connections if user object is not ready
    if (!walletAddress) {
      try {
        const privyConnections = localStorage.getItem('privy:connections');
        if (privyConnections) {
          const connections = JSON.parse(privyConnections);
          if (Array.isArray(connections) && connections.length > 0) {
            walletAddress = connections[0].address;
          }
        }
      } catch (e) {
        console.error('Failed to parse privy:connections', e);
      }
    }

    // 지갑 주소 변경 감지 및 처리
    if (walletAddress && previousAddressRef.current &&
        walletAddress.toLowerCase() !== previousAddressRef.current.toLowerCase() &&
        authenticated && !isHandlingWalletChange.current) {
      // 지갑이 변경되었고, 이전에 인증된 상태였다면
      handleWalletChange(walletAddress, previousAddressRef.current);
      return;
    }

    // 현재 주소 저장 (첫 연결 시에만)
    if (walletAddress && authenticated) {
      previousAddressRef.current = walletAddress;
    }

    if (walletAddress) {
      setAuthenticated(true);
      setUserAddress(walletAddress);
      setUserEmail(user?.email?.address || null);
    } else if (!authenticated && ready) {
      // Only reset if we are sure we are not authenticated and Privy is ready
      // And we couldn't find any address in localStorage
      previousAddressRef.current = null;
      reset();
    }
  }, [authenticated, ready, address, user, setAuthenticated, setUserAddress, setUserEmail, reset, handleWalletChange]);

  /**
   * 권한이 필요한 작업 실행
   * 로그인되지 않은 경우 로그인 프롬프트 표시
   */
  const requireAuth = (action: () => void | Promise<void>, message?: string) => {
    if (!isAuthenticated) {
      toast.error(message || '이 기능을 사용하려면 지갑을 연결해주세요', {
        action: {
          label: '지갑 연결',
          onClick: () => login(),
        },
      });
      return false;
    }
    action();
    return true;
  };

  /**
   * 권한 체크만 수행 (액션 없이)
   */
  const checkAuth = (): boolean => {
    return isAuthenticated;
  };

  /**
   * 로그인 프롬프트 표시
   */
  const promptLogin = (message?: string) => {
    toast.error(message || '지갑을 연결해주세요', {
      action: {
        label: '지갑 연결',
        onClick: () => login(),
      },
    });
  };

  return {
    isAuthenticated,
    userAddress,
    user,
    login,
    logout,
    requireAuth,
    checkAuth,
    promptLogin,
    ready, // Privy 준비 상태 추가
  };
}

