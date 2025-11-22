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
      loginMethods: ['email', 'wallet', 'google', 'twitter'] as const,
      appearance: {
        theme: 'light' as const,
        accentColor: '#0052FF',
        logo: 'https://www.base.org/favicon.png',
        showWalletLoginFirst: true,
      },
      supportedChains: [base, baseSepolia],
      defaultChain: base,
      legal: {
        termsAndConditionsUrl: 'https://your-domain.com/terms',
        privacyPolicyUrl: 'https://your-domain.com/privacy',
      },
    }),
    []
  );

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={privyConfig}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

