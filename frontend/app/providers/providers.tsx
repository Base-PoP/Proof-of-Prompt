'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';

/**
 * 애플리케이션 Provider 통합
 * Privy, Wagmi, React Query를 통합한 Provider 컴포넌트
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // QueryClient 인스턴스 생성 (컴포넌트당 한 번만)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1분
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  // Wagmi 설정
  const wagmiConfig = useMemo(
    () =>
      createConfig({
        chains: [base, baseSepolia],
        transports: {
          [base.id]: http(),
          [baseSepolia.id]: http(),
        },
      }),
    []
  );

  // Privy 설정
  const privyConfig = useMemo(
    () => ({
      embeddedWallets: {
        createOnLogin: 'users-without-wallets' as const,
        requireUserPasswordOnCreate: false,
        noPromptOnSignature: false,
      },
      loginMethods: ['wallet', 'farcaster', 'email', 'google', 'twitter'] as any,
      appearance: {
        theme: 'light' as const,
        accentColor: '#0052FF' as `#${string}`,
        logo: 'https://www.base.org/favicon.png',
        showWalletLoginFirst: true,
        walletList: ['metamask', 'coinbase_wallet'] as any,
        showWalletList: true,
      },
      supportedChains: [base, baseSepolia],
      defaultChain: baseSepolia, // Base Sepolia Testnet 사용
      legal: {
        termsAndConditionsUrl: 'https://your-domain.com/terms',
        privacyPolicyUrl: 'https://your-domain.com/privacy',
      },
      // Privy는 기본적으로 localStorage를 사용하여 세션을 유지합니다
      // 추가 설정 없이도 자동으로 세션이 복원됩니다
    }),
    []
  );

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={privyConfig as any}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

