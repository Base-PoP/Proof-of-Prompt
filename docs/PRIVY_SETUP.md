# Privy 인증 설정 가이드

## 1. Origin 불일치 에러 해결

### 에러 메시지
```
origins don't match "https://auth.privy.io" "http://localhost:3000"
```

### 원인
Privy 대시보드에서 허용된 도메인(Allowed Domains)에 로컬 개발 서버 URL이 등록되지 않아 발생하는 CORS 에러입니다.

### 해결 방법

1. **Privy Dashboard 접속**
   - [https://dashboard.privy.io](https://dashboard.privy.io) 로그인
   - 해당 앱 선택

2. **Allowed Domains 설정**
   - **Settings** → **Allowed domains** 섹션으로 이동
   - 다음 URL들을 추가:
     - 개발 환경: `http://localhost:3000` (포트 번호 필수)
     - 프로덕션: `https://yourdomain.com`

3. **주의사항**
   - ✅ 프로토콜(`http://` 또는 `https://`) 필수
   - ✅ localhost는 반드시 포트 번호 포함 (`http://localhost:3000`)
   - ✅ 와일드카드는 서브도메인에만 사용 가능 (`*.yourdomain.com`)
   - ⚠️ 프로덕션 배포 시 보안을 위해 `localhost` 제거 권장

### Allowed Domains 규칙

#### ✅ 허용되는 형식
```
https://www.example.com
https://example.com
http://localhost:3000
https://*.yourdomain.com (서브도메인 와일드카드)
```

#### ❌ 허용되지 않는 형식
```
http://localhost (포트 번호 없음)
https://example.com/path (경로 포함)
*.com (도메인 와일드카드)
*-sometext.domain.com (부분 와일드카드)
```

---

## 2. 세션 유지 (Session Persistence)

### 현재 구현 상태

Privy는 기본적으로 **localStorage**를 사용하여 세션을 자동으로 유지합니다.

#### 자동 세션 복원 메커니즘

1. **Privy 기본 동작**
   - 사용자가 로그인하면 인증 토큰과 지갑 정보가 `localStorage`에 저장됨
   - 페이지 새로고침 시 자동으로 세션 복원
   - 브라우저를 닫았다가 다시 열어도 세션 유지

2. **현재 코드의 세션 유지 로직**

   [`useAuth.ts`](file:///d:/Develop/Lmarena/frontend/app/hooks/useAuth.ts#L26-L39)에서 추가 세션 복원 로직 구현:

   ```typescript
   // localStorage에서 Privy 연결 정보 확인
   const privyConnections = localStorage.getItem('privy:connections');
   if (privyConnections) {
     const connections = JSON.parse(privyConnections);
     if (Array.isArray(connections) && connections.length > 0) {
       walletAddress = connections[0].address;
     }
   }
   ```

   이 로직은 Privy의 `user` 객체가 아직 준비되지 않았을 때도 localStorage에서 직접 지갑 주소를 가져와 세션을 유지합니다.

### 세션 유지 관련 설정

[`providers.tsx`](file:///d:/Develop/Lmarena/frontend/app/providers/providers.tsx#L41-L67)의 Privy 설정:

```typescript
const privyConfig = useMemo(
  () => ({
    embeddedWallets: {
      createOnLogin: 'users-without-wallets',
      requireUserPasswordOnCreate: false,
      noPromptOnSignature: false,
    },
    // ... 기타 설정
    // Privy는 기본적으로 localStorage를 사용하여 세션을 유지합니다
    // 추가 설정 없이도 자동으로 세션이 복원됩니다
  }),
  []
);
```

### 세션 만료 및 로그아웃

1. **자동 로그아웃**
   - 사용자가 명시적으로 로그아웃하기 전까지 세션 유지
   - 보안 토큰 만료 시 자동으로 재인증 시도

2. **수동 로그아웃**
   ```typescript
   const { logout } = useAuth();
   logout(); // localStorage 정리 및 세션 종료
   ```

### 세션 보안 강화 (선택사항)

보안이 중요한 애플리케이션의 경우 다음 옵션을 고려할 수 있습니다:

1. **세션 타임아웃 구현**
   ```typescript
   // 일정 시간 후 자동 로그아웃
   useEffect(() => {
     const timeout = setTimeout(() => {
       if (isAuthenticated) {
         logout();
         toast.info('보안을 위해 자동 로그아웃되었습니다.');
       }
     }, 30 * 60 * 1000); // 30분

     return () => clearTimeout(timeout);
   }, [isAuthenticated, logout]);
   ```

2. **민감한 작업 시 재인증 요구**
   ```typescript
   // 중요한 트랜잭션 전 재인증
   const performSensitiveAction = async () => {
     // 사용자에게 서명 요청 등으로 재인증
     await wallet.signMessage('재인증 확인');
     // 작업 수행
   };
   ```

---

## 3. 환경 변수 설정

`.env.local` 파일에 Privy App ID 설정:

```env
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
```

**중요**: `.env.local` 파일은 `.gitignore`에 포함되어야 합니다.

---

## 4. 트러블슈팅

### 세션이 유지되지 않는 경우

1. **브라우저 localStorage 확인**
   - 개발자 도구 → Application → Local Storage
   - `privy:connections`, `privy:token` 등의 키가 있는지 확인

2. **브라우저 설정 확인**
   - 쿠키 및 사이트 데이터가 차단되지 않았는지 확인
   - 시크릿 모드에서는 세션이 유지되지 않을 수 있음

3. **Privy App ID 확인**
   - 환경 변수가 올바르게 설정되었는지 확인
   - 대시보드의 App ID와 일치하는지 확인

### CORS 에러가 계속 발생하는 경우

1. **Allowed Domains 재확인**
   - 대시보드에서 설정이 저장되었는지 확인
   - 프로토콜과 포트 번호가 정확한지 확인

2. **브라우저 캐시 삭제**
   - 하드 리프레시 (Ctrl+Shift+R 또는 Cmd+Shift+R)
   - 브라우저 캐시 완전 삭제

3. **개발 서버 재시작**
   ```bash
   pnpm dev
   ```

---

## 5. 참고 자료

- [Privy Documentation](https://docs.privy.io/welcome)
- [Privy Dashboard](https://dashboard.privy.io)
- [Allowed Domains 설정 가이드](https://docs.privy.io/recipes/dashboard/allowed-domains)
