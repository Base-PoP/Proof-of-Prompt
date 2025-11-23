// API 타입 공통 정의
export interface PromptItem {
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

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  achievedAt: string | null;
  claimed: boolean;
  rarity?: string | null;
  exp?: number;
  progress?: { current: number; target: number } | null;
}

export interface PaymentRequiredPayload {
  chainId: number;
  token: string;
  pay_to_address: string;
  amount: string;
  message?: string;
}
