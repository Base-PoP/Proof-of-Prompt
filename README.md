# 🎯 LM Battle - AI Model Comparison Platform

AI 모델들을 실시간으로 비교하고 투표하는 Web3 플랫폼

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Base](https://img.shields.io/badge/Base-Blockchain-blue)](https://base.org/)

---

## 📋 목차

- [프로젝트 소개](#-프로젝트-소개)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [시작하기](#-시작하기)
- [프로젝트 구조](#-프로젝트-구조)
- [개발 가이드](#-개발-가이드)
- [개선 사항](#-개선-사항)
- [기여하기](#-기여하기)
- [라이선스](#-라이선스)

---

## 🚀 프로젝트 소개

LM Battle은 다양한 AI 언어 모델(GPT-4, Claude, Gemini 등)의 응답을 실시간으로 비교하고, 커뮤니티 투표를 통해 최고의 모델을 선정하는 Web3 기반 플랫폼입니다.

### 핵심 가치

- **투명성**: Base 블록체인 기반 투표 기록
- **공정성**: 블라인드 테스트로 편견 없는 평가
- **보상**: 참여자에게 크레딧 및 토큰 보상
- **커뮤니티**: 사용자 주도 AI 모델 평가

---

## ✨ 주요 기능

### 🔐 지갑 연결
- Privy를 통한 간편한 지갑 연결
- 이메일/소셜 로그인 지원
- Base Mainnet & Sepolia 지원

### ⚔️ AI 배틀
- 동일한 프롬프트에 대한 여러 AI 모델 응답 비교
- 블라인드 테스트로 공정한 평가
- 실시간 투표 결과

### 🏆 리더보드
- 모델별 승률 및 순위
- 카테고리별 통계
- 사용자 기여도 랭킹

### 👤 프로필
- 개인 투표 히스토리
- 크레딧 잔액 조회
- 예치/인출 기능 (컨트랙트 배포 후)

---

## 🛠 기술 스택

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS + Radix UI
- **Language**: TypeScript 5

### Web3
- **Authentication**: Privy
- **Blockchain**: Base (L2)
- **Wallet Integration**: Wagmi + Viem
- **State Management**: Zustand + React Query

### Development
- **Package Manager**: pnpm
- **Linting**: ESLint
- **Version Control**: Git

---

## 🚀 시작하기

### 필수 요구사항

- Node.js 20+
- pnpm 8+
- Git

### 설치

```bash
# 저장소 클론
git clone https://github.com/your-username/lmarena.git
cd lmarena

# 프론트엔드 디렉토리로 이동
cd frontend

# 의존성 설치
pnpm install

# 환경변수 설정
cp env.template .env.local
# .env.local 파일을 열어 실제 값을 입력하세요
```

### 환경변수 설정

`.env.local` 파일에 다음 값을 입력하세요:

```env
# Privy App ID (필수)
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# WalletConnect Project ID (선택)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_id
```

### 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 프로덕션 빌드

```bash
pnpm build
pnpm start
```

---

## 📁 프로젝트 구조

```
lmarena/
├── frontend/
│   ├── app/
│   │   ├── components/          # React 컴포넌트
│   │   │   ├── ui/              # Radix UI 기반 컴포넌트
│   │   │   ├── BattlePage.tsx
│   │   │   ├── LeaderboardPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── WalletButton.tsx
│   │   │   └── WalletBalance.tsx
│   │   ├── hooks/               # Custom React Hooks
│   │   │   ├── use-wallet.ts
│   │   │   └── use-deposit-pool.ts
│   │   ├── providers/           # Context Providers
│   │   │   └── providers.tsx
│   │   ├── store/               # Zustand Stores
│   │   │   └── wallet-store.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/
│   │   ├── contracts/           # 스마트 컨트랙트 설정
│   │   │   └── deposit-pool-config.ts
│   │   └── utils.ts
│   ├── docs/                    # 프로젝트 문서
│   ├── public/                  # 정적 파일
│   ├── package.json
│   └── tsconfig.json
├── backend/                     # 백엔드 (구현 예정)
├── scripts/                     # 유틸리티 스크립트
│   ├── cleanup.sh
│   └── cleanup.ps1
├── feedback.md                  # 프로젝트 리뷰 & 피드백
├── QUICK_START_IMPROVEMENTS.md  # 즉시 적용 가능한 개선사항
└── README.md
```

---

## 📖 개발 가이드

### 주요 명령어

```bash
# 개발 서버 실행
pnpm dev

# 린트 검사
pnpm lint

# 타입 체크
pnpm tsc --noEmit

# 프로덕션 빌드
pnpm build

# 빌드 결과 실행
pnpm start
```

### 코드 스타일

- **TypeScript Strict Mode** 사용
- **ESLint** 규칙 준수
- **함수형 컴포넌트** 및 **Hooks** 사용
- **명확한 타입 정의** 필수

### 컴포넌트 작성 가이드

```typescript
// ✅ Good
'use client';

import { useState } from 'react';
import { Button } from './ui/button';

interface MyComponentProps {
  title: string;
  onSubmit: (value: string) => void;
}

export function MyComponent({ title, onSubmit }: MyComponentProps) {
  const [value, setValue] = useState('');

  return (
    <div>
      <h2>{title}</h2>
      <Button onClick={() => onSubmit(value)}>Submit</Button>
    </div>
  );
}
```

---

## 🔧 개선 사항

### 최근 개선 (2024-11-21)
- ✅ Privy 지갑 연결 통합
- ✅ Zustand 상태 관리 구현
- ✅ 예치 풀 컨트랙트 연동 준비
- ✅ 프로필 페이지 지갑 정보 표시
- ✅ 헤더 ETH 잔액 표시

### 진행 중
- 🔄 백엔드 API 개발
- 🔄 스마트 컨트랙트 구현
- 🔄 AI 모델 통합

### 계획 중
- 📋 테스트 코드 작성
- 📋 CI/CD 파이프라인 구축
- 📋 성능 최적화
- 📋 SEO 개선

자세한 내용은 다음 문서를 참고하세요:
- [📋 프로젝트 리뷰 & 피드백](./feedback.md)
- [🚀 즉시 적용 가능한 개선사항](./QUICK_START_IMPROVEMENTS.md)

---

## 🤝 기여하기

기여는 언제나 환영합니다!

### 기여 방법

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 개발 환경 설정

```bash
# 저장소 클론
git clone https://github.com/your-username/lmarena.git
cd lmarena

# 의존성 설치
cd frontend
pnpm install

# 개발 서버 실행
pnpm dev
```

---

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참고하세요.

---

## 🔗 링크

- **Website**: [Coming Soon]
- **Documentation**: [docs/](./frontend/docs/)
- **Base Chain**: [base.org](https://base.org/)
- **Privy**: [privy.io](https://privy.io/)

---

## 👥 팀

- **개발자**: [Your Name]
- **디자이너**: [Designer Name]
- **프로젝트 관리**: [PM Name]

---

## 📞 문의

질문이나 제안사항이 있으시면 이슈를 등록하거나 이메일로 연락주세요.

- **Email**: contact@lmbattle.com
- **Discord**: [Coming Soon]
- **Twitter**: [@lmbattle](https://twitter.com/lmbattle)

---

**Made with ❤️ on Base**

