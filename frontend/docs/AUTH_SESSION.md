# 로그인 세션 유지 가이드

## 개요
Privy와 Zustand를 사용한 인증 세션 관리 시스템입니다.

## 구현 내용

### 1. useAuth 훅 (`app/hooks/useAuth.ts`)

**주요 기능:**
- Privy 인증 상태와 Zustand 스토어 자동 동기화
- `ready` 상태로 Privy 초기화 확인
- 권한 체크 기능 (`requireAuth`, `checkAuth`)

```typescript
const { isAuthenticated, userAddress, ready, requireAuth } = useAuth();
```

**동작 방식:**
1. Privy의 `authenticated`, `user`, `address` 상태 감시
2. 변경 시 Zustand 스토어에 자동 동기화
3. 로그아웃 시 스토어 초기화

### 2. Zustand 스토어 (`app/store/wallet-store.ts`)

**영구 저장 설정:**
```typescript
persist(
  (set) => ({ /* state and actions */ }),
  {
    name: 'wallet-storage',
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
      isAuthenticated: state.isAuthenticated,
      userAddress: state.userAddress,
      chainId: state.chainId,
    }),
  }
)
```

**저장되는 데이터:**
- `isAuthenticated`: 인증 상태
- `userAddress`: 지갑 주소
- `chainId`: 체인 ID

### 3. ProfilePage 로딩 처리

**로딩 순서:**
1. `isMounted` 체크 (클라이언트 렌더링 확인)
2. `ready` 체크 (Privy 초기화 완료 확인)
3. 인증 정보 표시

```typescript
if (!isMounted) return null;

if (!ready) {
  return <LoadingSpinner message="프로필을 불러오는 중..." />;
}

// 프로필 렌더링
```

### 4. 세션 유지 흐름

**초기 로드 시:**
1. 페이지 로드 → Privy SDK 초기화
2. localStorage에서 Privy 세션 자동 복원
3. `ready`가 `true`로 변경
4. `authenticated`와 `user` 정보 로드
5. useAuth 훅이 Zustand 스토어 업데이트
6. ProfilePage에서 정보 표시

**새로고침 시:**
1. Privy SDK가 localStorage에서 세션 자동 복원
2. Zustand도 localStorage에서 상태 복원
3. useAuth가 두 상태 동기화 확인
4. 일관된 인증 상태 유지

## 문제 해결

### 새로고침 시 프로필 정보가 사라지는 경우

**원인:**
- Privy `ready` 상태가 `true`가 되기 전에 렌더링
- Zustand 스토어와 Privy 상태 불일치

**해결:**
- ProfilePage에서 `ready` 상태 확인
- `ready`가 `false`면 로딩 UI 표시

### 로그인 후 페이지 이동 시 정보 유실

**원인:**
- useAuth 훅이 마운트되지 않은 페이지

**해결:**
- 모든 페이지에서 useAuth 훅 사용
- 또는 layout.tsx에서 전역으로 useAuth 호출

## 테스트 체크리스트

- [ ] 로그인 후 새로고침 → 로그인 상태 유지
- [ ] 프로필 페이지에서 지갑 정보 표시
- [ ] 페이지 이동 후 인증 상태 유지
- [ ] 로그아웃 후 새로고침 → 로그아웃 상태 유지
- [ ] 좋아요/공유 시 권한 체크 작동

## API

### useAuth 반환값

```typescript
{
  isAuthenticated: boolean;    // 인증 여부
  userAddress: string | null;  // 지갑 주소
  user: PrivyUser;             // Privy 사용자 객체
  login: () => void;           // 로그인 함수
  logout: () => void;          // 로그아웃 함수
  requireAuth: (action, msg) => void;  // 권한 필요 작업
  checkAuth: () => boolean;    // 인증 상태 확인
  promptLogin: (msg) => void;  // 로그인 프롬프트
  ready: boolean;              // Privy 초기화 완료 여부
}
```

### requireAuth 사용 예시

```typescript
const { requireAuth } = useAuth();

const handleShare = async () => {
  requireAuth(async () => {
    await postsApi.createPost(...);
    toast.success('공유 완료!');
  }, '프롬프트를 공유하려면 지갑을 연결해주세요');
};
```

## 주의사항

1. **hydration 오류 방지**: 클라이언트 컴포넌트에서 `isMounted` 체크 필수
2. **ready 상태 확인**: Privy 정보 사용 전 `ready` 확인
3. **스토어 동기화**: useAuth 훅이 자동으로 처리하므로 수동 업데이트 불필요
4. **localStorage**: 민감한 정보(private key 등)는 저장하지 않음

## 브라우저 호환성

- localStorage 지원 브라우저 필요
- 시크릿 모드에서는 세션 유지 제한될 수 있음

