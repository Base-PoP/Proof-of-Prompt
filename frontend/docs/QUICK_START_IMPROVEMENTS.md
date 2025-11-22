# 🚀 즉시 적용 가능한 개선 사항

프로젝트를 빠르게 개선할 수 있는 체크리스트입니다.

---

## ✅ Phase 1: 정리 작업 (10분)

### 1. 중복 파일 제거

**Windows:**
```powershell
cd D:\Develop\Lmarena
.\scripts\cleanup.ps1
```

**Unix/Mac:**
```bash
cd /path/to/Lmarena
chmod +x scripts/cleanup.sh
./scripts/cleanup.sh
```

**수동으로 삭제:**
```
frontend/hooks/          → 삭제
frontend/providers/      → 삭제
frontend/store/          → 삭제
frontend/components/     → 삭제 (비어있으면)
frontend/lib/privy-config.ts → 삭제
frontend/lib/wagmi-config.ts → 삭제
```

### 2. 환경변수 설정

```bash
cd frontend
cp env.template .env.local
```

`.env.local` 파일을 열어 실제 값을 입력하세요:
```env
NEXT_PUBLIC_PRIVY_APP_ID=your_actual_privy_app_id
```

### 3. .gitignore 업데이트

`frontend/.gitignore`에 추가:
```gitignore
# Environment Variables
.env
.env.local
.env.production.local
.env.development.local
```

---

## ✅ Phase 2: 에러 처리 추가 (30분)

### 1. Toast 알림 라이브러리 설치

```bash
cd frontend
pnpm add sonner
```

### 2. Layout에 Toaster 추가

`frontend/app/layout.tsx`:
```typescript
import { Toaster } from 'sonner';

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          {children}
        </Providers>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
```

### 3. WalletButton에 에러 처리 추가

`frontend/app/components/WalletButton.tsx`:
```typescript
import { toast } from 'sonner';

const handleLogin = async () => {
  try {
    setConnecting(true);
    await login();
    toast.success('지갑이 연결되었습니다!');
  } catch (error) {
    toast.error('지갑 연결에 실패했습니다');
    console.error('Login failed:', error);
  } finally {
    setConnecting(false);
  }
};

const handleLogout = async () => {
  try {
    setDisconnecting(true);
    await logout();
    toast.success('지갑 연결이 해제되었습니다');
  } catch (error) {
    toast.error('로그아웃에 실패했습니다');
    console.error('Logout failed:', error);
  } finally {
    setDisconnecting(false);
  }
};

const handleCopyAddress = async () => {
  if (!address) return;
  
  try {
    await navigator.clipboard.writeText(address);
    toast.success('주소가 복사되었습니다');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  } catch (error) {
    toast.error('복사에 실패했습니다');
    console.error('Failed to copy:', error);
  }
};
```

---

## ✅ Phase 3: 미사용 UI 컴포넌트 제거 (15분)

### 현재 사용 중인 컴포넌트만 유지

**유지할 컴포넌트:**
- ✅ `button.tsx`
- ✅ `card.tsx`
- ✅ `avatar.tsx`
- ✅ `dropdown-menu.tsx`
- ✅ `input.tsx` (나중에 필요)
- ✅ `textarea.tsx` (나중에 필요)
- ✅ `dialog.tsx` (나중에 필요)

**삭제 검토 (나중에 필요하면 추가):**
```bash
cd frontend/app/components/ui

# 미사용 컴포넌트 삭제 (선택적)
rm accordion.tsx alert-dialog.tsx alert.tsx aspect-ratio.tsx
rm breadcrumb.tsx calendar.tsx carousel.tsx chart.tsx
rm checkbox.tsx collapsible.tsx command.tsx context-menu.tsx
rm drawer.tsx form.tsx hover-card.tsx input-otp.tsx
rm label.tsx menubar.tsx navigation-menu.tsx pagination.tsx
rm popover.tsx progress.tsx radio-group.tsx resizable.tsx
rm scroll-area.tsx select.tsx separator.tsx sheet.tsx
rm sidebar.tsx skeleton.tsx slider.tsx sonner.tsx
rm switch.tsx table.tsx toggle-group.tsx toggle.tsx
rm tooltip.tsx
```

---

## ✅ Phase 4: 타입 안전성 개선 (20분)

### 1. 공통 타입 정의 파일 생성

`frontend/types/index.ts`:
```typescript
// Wallet Types
export type Address = `0x${string}`;

export interface UserProfile {
  address: Address;
  email: string | null;
  chainId: number;
  username: string;
}

// Transaction Types
export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  USAGE = 'usage',
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  credits?: number;
  date: string;
  status: 'pending' | 'completed' | 'failed';
  reason?: string;
}

// Battle Types
export interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  votes: number;
  createdAt: string;
}

export interface AIResponse {
  model: string;
  response: string;
  timestamp: number;
}

// Page Types
export type Page = 'landing' | 'battle' | 'leaderboard' | 'profile';
```

### 2. Type Guard 함수 추가

`frontend/lib/utils.ts`에 추가:
```typescript
import type { Address } from '@/types';

export function isValidAddress(address: string | undefined): address is Address {
  return !!address && address.startsWith('0x') && address.length === 42;
}

export function isValidChainId(chainId: number | null): chainId is number {
  return chainId !== null && chainId > 0;
}
```

---

## ✅ Phase 5: 성능 최적화 기초 (20분)

### 1. Loading 상태 추가

`frontend/app/loading.tsx`:
```typescript
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div 
          className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"
          style={{ borderColor: '#0052FF' }}
        />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
```

### 2. Error 경계 추가

`frontend/app/error.tsx`:
```typescript
'use client';

import { useEffect } from 'react';
import { Button } from './components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
        <p className="text-gray-600 mb-6">{error.message}</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
```

### 3. Not Found 페이지 추가

`frontend/app/not-found.tsx`:
```typescript
import Link from 'next/link';
import { Button } from './components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4" style={{ color: '#0052FF' }}>
          404
        </h1>
        <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-6">
          The page you are looking for does not exist.
        </p>
        <Link href="/">
          <Button>Go Home</Button>
        </Link>
      </div>
    </div>
  );
}
```

---

## ✅ 검증 체크리스트

완료 후 다음 사항을 확인하세요:

```bash
# 1. 린트 에러 확인
cd frontend
pnpm lint

# 2. 타입 체크
pnpm tsc --noEmit

# 3. 빌드 테스트
pnpm build

# 4. 개발 서버 실행
pnpm dev
```

### 브라우저에서 확인:
- [ ] 지갑 연결 성공 시 토스트 알림 표시
- [ ] 지갑 연결 해제 시 토스트 알림 표시
- [ ] 주소 복사 시 토스트 알림 표시
- [ ] 에러 발생 시 에러 페이지 표시
- [ ] 존재하지 않는 페이지 접근 시 404 페이지 표시

---

## 📊 예상 소요 시간

| Phase | 작업 | 시간 |
|-------|------|------|
| 1 | 정리 작업 | 10분 |
| 2 | 에러 처리 | 30분 |
| 3 | UI 정리 | 15분 |
| 4 | 타입 안전성 | 20분 |
| 5 | 성능 최적화 | 20분 |
| **합계** | | **1시간 35분** |

---

## 🎯 다음 단계

이 개선 작업 완료 후:

1. **Git Commit**
   ```bash
   git add .
   git commit -m "chore: project cleanup and improvements
   
   - Remove duplicate files and directories
   - Add error handling with toast notifications
   - Improve type safety
   - Add loading and error pages
   - Update environment variable setup"
   ```

2. **백엔드 개발 계획 수립**
   - API 엔드포인트 설계
   - 데이터베이스 스키마 설계
   - 인증/인가 로직 구현

3. **테스트 환경 구축**
   - Vitest 설정
   - 테스트 코드 작성 시작

---

**작성일**: 2024-11-21  
**버전**: 1.0

