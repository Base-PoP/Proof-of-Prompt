# API 타입 및 응답 구조 (프론트/백엔드 공통 참고)

## 결제 402 payload
```ts
interface PaymentRequiredPayload {
  chainId: number;
  token: string;
  pay_to_address: string;
  amount: string; // 6 decimals
  message?: string;
}
```

## 프롬프트/대시보드
```ts
interface PromptItem {
  id: string;
  title: string;
  prompt: string;
  response: string;
  userId?: string;
  userName?: string;
  modelId?: string;
  modelName?: string;
  modelProvider?: string;
  createdAt: string;
  likes: number;
  isLiked?: boolean;
  category?: string;
}
```

## 업적
```ts
interface AchievementItem {
  id: string;
  title: string;
  description: string;
  achievedAt: string | null;
  claimed: boolean;
  rarity?: string | null;
  exp?: number;
  progress?: { current: number; target: number } | null;
}
```

## 사용자 프로필
```ts
interface UserProfileResponse {
  user: { id: number; nickname: string; createdAt: string };
  stats: {
    totalPrompts: number;
    totalLikes: number;
    score: number;
    level: number;
    currentXP: number;
    nextLevelXP: number;
  };
  popularPrompts: PromptItem[];
}
```

## 유저 공유 프롬프트 목록
```ts
type UserSharedPromptsResponse = Array<PromptItem>;
```

## 리더보드
```ts
interface ModelRanking {
  rank: number;
  id: number;
  name: string;
  provider: string;
  rating: number;
  totalMatches: number;
  postedMatches: number;
  adoptionRate: number;
}

interface UserRanking {
  rank: number;
  id: number;
  nickname: string;
  score: number;
  totalLikes: number;
  postsCount: number;
}
```
