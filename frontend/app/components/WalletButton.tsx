'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { Button } from './ui/button';
import { useWalletStore } from '@/app/store/wallet-store';
import { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Copy, Check } from 'lucide-react';

/**
 * 지갑 연결 버튼 컴포넌트
 * Privy를 사용한 지갑 연결 및 사용자 정보 표시
 */
export function WalletButton() {
  const { login, logout, ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { address, chain } = useAccount();
  
  const {
    setAuthenticated,
    setUserAddress,
    setUserEmail,
    setChainId,
    setConnecting,
    setDisconnecting,
    isConnecting,
    isDisconnecting,
  } = useWalletStore();

  // 클라이언트 마운트 상태
  const [isMounted, setIsMounted] = useState(false);

  // 클라이언트에서만 마운트
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Privy 인증 상태를 Zustand 스토어에 동기화 (클라이언트에서만)
  useEffect(() => {
    if (!isMounted) return;
    
    setAuthenticated(authenticated);
    
    if (authenticated && user) {
      // 지갑 주소 설정
      const walletAddress = user.wallet?.address || address || null;
      setUserAddress(walletAddress);
      
      // 이메일 설정
      const email = user.email?.address || null;
      setUserEmail(email);
      
      // 체인 ID 설정
      if (chain) {
        setChainId(chain.id);
      }
    } else {
      setUserAddress(null);
      setUserEmail(null);
      setChainId(null);
    }
  }, [isMounted, authenticated, user, address, chain, setAuthenticated, setUserAddress, setUserEmail, setChainId]);

  // 로그인 처리
  const handleLogin = async () => {
    try {
      setConnecting(true);
      await login();
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setConnecting(false);
    }
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      setDisconnecting(true);
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setDisconnecting(false);
    }
  };

  // 주소 복사 상태
  const [copied, setCopied] = useState(false);

  // 주소 복사 처리
  const handleCopyAddress = async () => {
    if (!address) return;
    
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  // 주소 포맷팅 (0x1234...5678)
  const formatAddress = (addr: string | undefined) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // 체인 이름 가져오기
  const getChainName = () => {
    if (!chain) return 'Unknown';
    return chain.name;
  };

  // 클라이언트 마운트 전이거나 Privy 초기화 대기 중
  if (!isMounted || !ready) {
    return (
      <Button disabled variant="outline">
        Loading...
      </Button>
    );
  }

  // 인증되지 않은 상태 - 로그인 버튼
  if (!authenticated) {
    return (
      <Button
        onClick={handleLogin}
        disabled={isConnecting}
        className="bg-black hover:bg-gray-800"
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>
    );
  }

  // 인증된 상태 - 사용자 정보 드롭다운
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 bg-white hover:bg-gray-50"
        >
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
              {address ? address.slice(2, 4).toUpperCase() : 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline-block">
            {formatAddress(address)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* 지갑 주소 with Copy Button */}
        <div className="px-2 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-500 block mb-1">Address</span>
              <span className="font-mono text-sm block truncate">{formatAddress(address)}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 flex-shrink-0"
              onClick={handleCopyAddress}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* 이메일 (있는 경우) */}
        {user?.email?.address && (
          <DropdownMenuItem className="flex flex-col items-start gap-1">
            <span className="text-xs text-gray-500">Email</span>
            <span className="text-sm">{user.email.address}</span>
          </DropdownMenuItem>
        )}

        {/* 체인 정보 */}
        <DropdownMenuItem className="flex flex-col items-start gap-1">
          <span className="text-xs text-gray-500">Network</span>
          <span className="text-sm">{getChainName()}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        
        {/* 로그아웃 */}
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isDisconnecting}
          className="text-red-600 cursor-pointer"
        >
          {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

