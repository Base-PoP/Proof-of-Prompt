# React Key Warning 해결 방법

## 문제 설명

```
Each child in a list should have a unique "key" prop.
Check the render method of `Fragment`. It was passed a child from Sg.
```

이 경고는 Privy 라이브러리 내부에서 발생하는 React 경고입니다. `Sg`는 Privy의 내부 컴포넌트로 보입니다.

## 원인

1. **Privy 라이브러리 내부 이슈**: Privy `@privy-io/react-auth` v3.7.0이 React 19와 완전히 호환되지 않을 수 있음
2. **React 19의 엄격한 검사**: React 19는 이전 버전보다 더 엄격한 key prop 검사를 수행

## 해결 방법

### 방법 1: Privy 최신 버전으로 업데이트 (권장)

```bash
cd frontend
pnpm update @privy-io/react-auth @privy-io/wagmi
```

### 방법 2: React 경고 억제 (임시 방법)

개발 중에는 이 경고를 무시하고, Privy 팀이 React 19 호환성을 개선할 때까지 기다릴 수 있습니다.

`next.config.mjs`에 다음 설정 추가:

```javascript
const nextConfig = {
  // ... 기존 설정
  
  // React 경고 억제 (개발 환경에서만)
  reactStrictMode: true,
  
  webpack: (config, { isServer, dev }) => {
    // ... 기존 webpack 설정
    
    // 개발 환경에서 특정 경고 억제
    if (dev && !isServer) {
      config.infrastructureLogging = {
        level: 'error',
      };
    }
    
    return config;
  },
};
```

### 방법 3: React 18로 다운그레이드 (비권장)

React 19가 아직 안정화되지 않았다면 React 18로 다운그레이드:

```bash
cd frontend
pnpm remove react react-dom @types/react @types/react-dom
pnpm add react@^18 react-dom@^18 @types/react@^18 @types/react-dom@^18
```

### 방법 4: Privy 설정 간소화

일부 설정이 문제를 일으킬 수 있으므로 최소 설정으로 시작:

```typescript
const privyConfig = useMemo(
  () => ({
    loginMethods: ['wallet', 'email'],
    appearance: {
      theme: 'light' as const,
      accentColor: '#0052FF' as `#${string}`,
    },
  }),
  []
);
```

## 현재 상태

- ✅ 기능적으로는 문제없음 (경고일 뿐, 에러 아님)
- ⚠️ 콘솔에 경고 메시지만 표시됨
- 🔄 Privy 팀이 React 19 호환성 개선 중일 가능성 높음

## 권장 조치

1. **단기**: 경고를 무시하고 개발 계속 (기능에는 영향 없음)
2. **중기**: Privy 업데이트 모니터링 및 정기적 업데이트
3. **장기**: Privy가 React 19 완전 지원할 때까지 대기

## 참고

- [React Keys 문서](https://react.dev/link/warning-keys)
- [Privy GitHub Issues](https://github.com/privy-io/privy-js/issues)
- React 19는 2024년 12월에 정식 출시되어 아직 많은 라이브러리가 완전히 호환되지 않을 수 있음
