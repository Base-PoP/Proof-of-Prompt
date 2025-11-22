import { useEffect } from 'react';
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

  // Privy 인증 상태를 Zustand 스토어와 동기화
  useEffect(() => {
    if (authenticated && address) {
      setAuthenticated(true);
      setUserAddress(address);
      setUserEmail(user?.email?.address || null);
    } else if (!authenticated) {
      reset();
    }
  }, [authenticated, address, user, setAuthenticated, setUserAddress, setUserEmail, reset]);

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

