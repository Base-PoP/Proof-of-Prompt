import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * 지갑 상태 타입 정의
 */
export interface WalletState {
  // 사용자 정보
  isAuthenticated: boolean;
  userAddress: string | null;
  userEmail: string | null;
  
  // 체인 정보
  chainId: number | null;
  
  // 연결 상태
  isConnecting: boolean;
  isDisconnecting: boolean;
  
  // Actions
  setAuthenticated: (isAuth: boolean) => void;
  setUserAddress: (address: string | null) => void;
  setUserEmail: (email: string | null) => void;
  setChainId: (chainId: number | null) => void;
  setConnecting: (isConnecting: boolean) => void;
  setDisconnecting: (isDisconnecting: boolean) => void;
  reset: () => void;
}

/**
 * 초기 상태
 */
const initialState = {
  isAuthenticated: false,
  userAddress: null,
  userEmail: null,
  chainId: null,
  isConnecting: false,
  isDisconnecting: false,
};

/**
 * 지갑 상태 관리 스토어
 * Zustand를 사용한 전역 상태 관리
 * localStorage에 영구 저장
 */
export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setAuthenticated: (isAuth) => set({ isAuthenticated: isAuth }),
      
      setUserAddress: (address) => set({ userAddress: address }),
      
      setUserEmail: (email) => set({ userEmail: email }),
      
      setChainId: (chainId) => set({ chainId }),
      
      setConnecting: (isConnecting) => set({ isConnecting }),
      
      setDisconnecting: (isDisconnecting) => set({ isDisconnecting }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'wallet-storage',
      storage: createJSONStorage(() => localStorage),
      // 민감한 정보는 저장하지 않음
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        userAddress: state.userAddress,
        chainId: state.chainId,
      }),
    }
  )
);

