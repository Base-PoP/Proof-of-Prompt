declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_API_URL?: string;
    NEXT_PUBLIC_PRIVY_APP_ID?: string;
    NEXT_PUBLIC_ENV?: string;
  }
}

// MetaMask/Ethereum Provider 타입
interface Window {
  ethereum?: {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    on: (event: string, callback: (data: unknown) => void) => void;
    removeListener: (event: string, callback: (data: unknown) => void) => void;
    isMetaMask?: boolean;
  };
}
