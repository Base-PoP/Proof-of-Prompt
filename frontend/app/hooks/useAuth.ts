import { useEffect, useRef, useCallback, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { useWalletStore } from '../store/wallet-store';
import { toast } from 'sonner';

const TARGET_CHAIN_ID = baseSepolia.id; // 84532
const TARGET_CHAIN_ID_HEX = `0x${TARGET_CHAIN_ID.toString(16)}`; // 0x14a34

// Base Sepolia 네트워크 정보
const BASE_SEPOLIA_CHAIN = {
  chainId: TARGET_CHAIN_ID_HEX,
  chainName: 'Base Sepolia',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://sepolia.base.org'],
  blockExplorerUrls: ['https://sepolia.basescan.org'],
};

// 지갑에서 직접 현재 체인 ID 가져오기
async function getWalletChainId(): Promise<number | null> {
  if (typeof window === 'undefined' || !window.ethereum) return null;
  try {
    const chainIdHex = (await window.ethereum.request({ method: 'eth_chainId' })) as string;
    return parseInt(chainIdHex, 16);
  } catch {
    return null;
  }
}

// 지갑에 네트워크 추가 및 전환
async function addAndSwitchNetwork(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ethereum) return false;

  try {
    // 먼저 네트워크 전환 시도
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: TARGET_CHAIN_ID_HEX }],
    });
    return true;
  } catch (switchError: unknown) {
    const error = switchError as { code?: number };
    // 4902: 네트워크가 없음 - 추가 필요
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [BASE_SEPOLIA_CHAIN],
        });
        return true;
      } catch (addError) {
        console.error('[Network] Failed to add network:', addError);
        return false;
      }
    }
    // 4001: 사용자가 거부
    if (error.code === 4001) {
      return false;
    }
    console.error('[Network] Switch error:', switchError);
    return false;
  }
}

/**
 * 인증 및 권한 관리 훅
 */
export function useAuth() {
  const { authenticated, ready, user, login, logout } = usePrivy();
  const { address, isConnected } = useAccount();
  const {
    isAuthenticated,
    userAddress,
    setAuthenticated,
    setUserAddress,
    setUserEmail,
    reset,
  } = useWalletStore();

  // 현재 지갑의 실제 체인 ID (wagmi가 아닌 지갑에서 직접)
  const [walletChainId, setWalletChainId] = useState<number | null>(null);

  // 네트워크 전환 시도 상태 추적
  const hasAttemptedSwitch = useRef(false);
  const isSwitching = useRef(false);

  // 이전 지갑 주소를 추적하여 지갑 전환 감지
  const previousAddressRef = useRef<string | null>(null);
  const isHandlingWalletChange = useRef(false);

  // 함수 참조를 안정적으로 유지 (무한 루프 방지)
  const logoutRef = useRef(logout);
  const loginRef = useRef(login);
  const resetRef = useRef(reset);

  useEffect(() => {
    logoutRef.current = logout;
    loginRef.current = login;
    resetRef.current = reset;
  }, [logout, login, reset]);

  // 지갑 변경 처리 함수 (의존성 없이 안정적)
  const handleWalletChange = useCallback(async (newAddress: string, oldAddress: string) => {
    if (isHandlingWalletChange.current) return;
    isHandlingWalletChange.current = true;

    console.log(`Wallet changed from ${oldAddress} to ${newAddress}`);

    // 기존 세션 로그아웃
    try {
      await logoutRef.current();
      resetRef.current();

      // 새 지갑으로 로그인 요청
      toast.info('지갑이 변경되었습니다. 다시 연결해주세요.', {
        action: {
          label: '연결하기',
          onClick: () => loginRef.current(),
        },
      });
    } catch (error) {
      console.error('Failed to handle wallet change:', error);
    } finally {
      isHandlingWalletChange.current = false;
    }
  }, []); // 빈 의존성 배열 - 함수가 절대 재생성되지 않음

  // 지갑 연결 시 실제 체인 ID 확인 및 네트워크 변경 이벤트 리스닝
  useEffect(() => {
    if (!isConnected) {
      setWalletChainId(null);
      hasAttemptedSwitch.current = false;
      return;
    }

    // 초기 체인 ID 가져오기
    getWalletChainId().then(setWalletChainId);

    // 네트워크 변경 이벤트 리스닝
    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      console.log(`[Network] Chain changed to ${newChainId}`);
      setWalletChainId(newChainId);
      hasAttemptedSwitch.current = false; // 새 네트워크에서 다시 시도 가능
    };

    if (window.ethereum) {
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [isConnected]);

  // 네트워크 자동 전환: Base Sepolia가 아니면 네트워크 추가 후 전환 요청
  useEffect(() => {
    if (!isConnected || walletChainId === null) return;
    if (walletChainId === TARGET_CHAIN_ID) {
      hasAttemptedSwitch.current = false;
      isSwitching.current = false;
      return;
    }
    if (hasAttemptedSwitch.current || isSwitching.current) return;

    const switchNetwork = async () => {
      isSwitching.current = true;
      hasAttemptedSwitch.current = true;

      console.log(`[Network] Current chain ${walletChainId}, switching to Base Sepolia (${TARGET_CHAIN_ID})`);
      toast.info('Base Sepolia 네트워크로 전환합니다...', { duration: 3000 });

      const success = await addAndSwitchNetwork();

      if (success) {
        toast.success('Base Sepolia 네트워크로 전환되었습니다!');
      } else {
        toast.error('네트워크 전환이 필요합니다. 지갑에서 Base Sepolia로 전환해주세요.', {
          duration: 5000,
        });
      }

      isSwitching.current = false;
    };

    switchNetwork();
  }, [isConnected, walletChainId]);

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

