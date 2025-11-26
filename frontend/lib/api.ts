// API client utility for backend communication
import { env } from './config';
import { Category } from './constants';
import { PromptItem, AchievementItem, PaymentRequiredPayload } from './types';
import { x402Fetch, type X402PaymentPayload } from './x402-client';

const API_BASE_URL = env.API_URL;

// ---------- Generic API helper ----------
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export class PaymentRequiredError extends Error {
  constructor(
    public payment: PaymentRequiredPayload | X402PaymentPayload,
    public reason?: string,
    public allowanceRequired?: boolean
  ) {
    super('Payment Required');
    this.name = 'PaymentRequiredError';
  }
}

interface ApiFetchOptions extends RequestInit {
  x402?: { address: string; provider: unknown };
  skipX402?: boolean;
}

async function apiFetch<T>(endpoint: string, options?: ApiFetchOptions): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    // x402 사용 여부 결정
    const useX402 = !options?.skipX402 && (options?.x402 !== undefined);

    if (useX402 && options?.x402) {
      // x402 프로토콜 사용
      return await x402Fetch<T>(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers ?? {}),
        },
      }, 1);
    } else {
      // 기본 Fetch
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers ?? {}),
        },
      });

      if (response.status === 402) {
        const data = await response.json() as { payment: PaymentRequiredPayload; reason?: string; allowanceRequired?: boolean };
        throw new PaymentRequiredError(data.payment, data.reason, data.allowanceRequired);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(response.status, `API Error: ${response.statusText} - ${errorText}`);
      }
      return (await response.json()) as T;
    }
  } catch (e) {
    if (e instanceof ApiError || e instanceof PaymentRequiredError) throw e;
    throw new Error(`Network error: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

// ---------- Arena API ----------
export const arenaApi = {
  createChat: async (
    prompt: string,
    walletAddress?: string,
    userId?: string,
  ) =>
    apiFetch<{ matchId: number; prompt: string; response: string }>('/arena/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt, userId, walletAddress }),
    }),

  createChatStream: async (
    prompt: string,
    onChunk: (chunk: string) => void,
    onComplete: (matchId: number, prompt: string, fullResponse: string) => void,
    onError: (error: string) => void,
    paymentAuth?: string | null,
    walletAddress?: string,
  ) => {
    try {
      const headers: Record<string, string> = { 
        'Content-Type': 'application/json',
      };
      if (paymentAuth) {
        headers['x-payment-authorization'] = paymentAuth;
      }

      // x402Options를 사용하면 자동으로 402 처리 (향후 스트리밍 지원)
      const response = await fetch(`${API_BASE_URL}/arena/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, walletAddress }),
      });

      if (!response.ok) {
        if (response.status === 402) {
          const data = await response.json() as { payment: PaymentRequiredPayload; reason?: string; allowanceRequired?: boolean };
          throw new PaymentRequiredError(data.payment, data.reason, data.allowanceRequired);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No response body');
      let full = '';
      let matchId: number | null = null;
      let promptText = prompt;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6)) as { type: string; matchId?: number; prompt?: string; content?: string; error?: string };
            if (parsed.type === 'start' && parsed.matchId !== undefined) {
              matchId = parsed.matchId;
              promptText = parsed.prompt || prompt;
            } else if (parsed.type === 'chunk' && parsed.content) {
              full += parsed.content;
              onChunk(parsed.content);
            } else if (parsed.type === 'done' && matchId !== null) {
              onComplete(matchId, promptText, full);
            } else if (parsed.type === 'error') {
              onError(parsed.error || 'Unknown error');
            }
          } catch {
            // JSON 파싱 실패 무시
          }
        }
      }
    } catch (e) {
      if (e instanceof PaymentRequiredError) {
        throw e;
      }
      onError(e instanceof Error ? e.message : 'Failed to stream response');
    }
  },

  sharePrompt: async (
    matchId: number,
    walletAddress?: string,
    x402Options?: { address: string; provider: unknown }
  ) =>
    apiFetch<{
      ok: boolean;
      prompt: {
        id: number;
        matchId: number;
        title: string;
        prompt: string;
        response: string;
        userId?: number;
        modelId: number;
        modelName: string;
        modelProvider: string;
        likes: number;
        category: Category;
        createdAt: string;
      };
    }>('/arena/share', {
      method: 'POST',
      body: JSON.stringify({ matchId, walletAddress }),
      x402: x402Options,
    }),
};

// ---------- Leaderboard API ----------
export const leaderboardApi = {
  getModels: async () =>
    apiFetch<Array<{ rank: number; id: number; name: string; provider: string; rating: number; totalMatches: number; postedMatches: number; adoptionRate: number }>>('/leaderboard/models'),
  getUsers: async () =>
    apiFetch<Array<{ rank: number; id: number; nickname: string; score: number; totalLikes: number; postsCount: number }>>('/leaderboard/users'),
};

// ---------- Local storage helpers (mock mode) ----------
const POSTS_STORAGE_KEY = 'lmarena_posts';
const LIKES_STORAGE_KEY = 'lmarena_post_likes';

interface LocalPost {
  id: string;
  prompt: string;
  response: string;
  userId?: string;
  userName?: string;
  modelId?: string;
  modelName?: string;
  createdAt: string;
  likes: number;
  title?: string;
  category?: Category;
}

const localPostsStorage = {
  getPosts(): LocalPost[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(POSTS_STORAGE_KEY);
    if (stored) return JSON.parse(stored) as LocalPost[];
    const empty: LocalPost[] = [];
    localPostsStorage.savePosts(empty);
    return empty;
  },
  savePosts(posts: LocalPost[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
  },
  getLikes(): Record<string, boolean> {
    if (typeof window === 'undefined') return {};
    const stored = localStorage.getItem(LIKES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  },
  saveLikes(likes: Record<string, boolean>) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likes));
  },
};

const USE_MOCK_DATA = env.USE_MOCK_DATA;

// ---------- Prompts API (used by Dashboard) ----------
export const promptsApi = {
  getPrompts: async (
    limit: number = 20,
    offset: number = 0,
    walletAddress?: string,
    sort: 'latest' | 'popular' = 'latest',
    category?: Category
  ) => {
    if (USE_MOCK_DATA) {
      const posts = localPostsStorage.getPosts();
      const likes = localPostsStorage.getLikes();
      const filtered = category ? posts.filter(p => p.category === category) : posts;
      if (sort === 'popular') {
        filtered.sort((a, b) => b.likes - a.likes);
      } else {
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return filtered.slice(offset, offset + limit).map(p => ({
        ...p,
        isLiked: likes[p.id] || false,
        title: p.title || 'Untitled',
        category: p.category || '기타',
      }));
    }
    let url = `/prompts?limit=${limit}&offset=${offset}`;
    if (walletAddress) url += `&walletAddress=${encodeURIComponent(walletAddress)}`;
    if (sort) url += `&sort=${sort}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    return await apiFetch<Array<{
      id: string;
      title: string;
      prompt: string;
      response: string;
      userId?: string;
      userName?: string;
      modelId?: string;
      modelName?: string;
      createdAt: string;
      likes: number;
      isLiked?: boolean;
      category: Category;
    }>>(url);
  },

  getPrompt: async (postId: string, walletAddress?: string) => {
    if (USE_MOCK_DATA) {
      const posts = localPostsStorage.getPosts();
      const likes = localPostsStorage.getLikes();
      const post = posts.find(p => p.id === postId);
      if (!post) throw new Error('포스트를 찾을 수 없습니다');
      return {
        ...post,
        id: post.id,
        title: post.title || 'Untitled',
        category: (post.category as Category) || '기타',
        isLiked: likes[postId] || false,
      };
    }
    let url = `/prompts/${postId}`;
    if (walletAddress) url += `?walletAddress=${encodeURIComponent(walletAddress)}`;
    return await apiFetch<{
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
      category: Category;
    }>(url);
  },

  sharePrompt: async (
    prompt: string,
    response: string,
    userId?: string,
    modelId?: string,
    modelName?: string
  ) => {
    if (!USE_MOCK_DATA) throw new Error('sharePrompt is only available in mock mode');
    const posts = localPostsStorage.getPosts();
    const newPost: LocalPost = {
      id: Date.now().toString(),
      prompt,
      response,
      userId,
      userName: userId ? `User ${userId.slice(0, 6)}` : 'Anonymous',
      modelId,
      modelName,
      createdAt: new Date().toISOString(),
      likes: 0,
      title: 'Auto-generated Title',
      category: '기타',
    };
    posts.unshift(newPost);
    localPostsStorage.savePosts(posts);
    return {
      promptId: newPost.id,
      prompt: newPost.prompt,
      response: newPost.response,
      userId: newPost.userId,
      modelId: newPost.modelId,
      modelName: newPost.modelName,
      createdAt: newPost.createdAt,
      title: newPost.title,
      category: newPost.category,
    };
  },

  likePrompt: async (postId: string, userId?: string) => {
    if (USE_MOCK_DATA) {
      const posts = localPostsStorage.getPosts();
      const likes = localPostsStorage.getLikes();
      const isLiked = likes[postId] || false;
      const updated = posts.map(p =>
        p.id === postId ? { ...p, likes: isLiked ? p.likes - 1 : p.likes + 1 } : p
      );
      likes[postId] = !isLiked;
      localPostsStorage.savePosts(updated);
      localPostsStorage.saveLikes(likes);
      const post = updated.find(p => p.id === postId);
      return { ok: true, liked: !isLiked, likes: post?.likes ?? 0 };
    }
    return await apiFetch<{ ok: boolean; liked?: boolean; likes: number; userId?: string; userName?: string }>(`/prompts/${postId}/like`, {
      method: 'POST',
      body: JSON.stringify({ walletAddress: userId }),
    });
  },

  deletePrompt: async (postId: string, userId?: string) => {
    if (USE_MOCK_DATA) {
      const posts = localPostsStorage.getPosts().filter(p => p.id !== postId);
      localPostsStorage.savePosts(posts);
      return { ok: true, message: 'Post deleted' };
    }
    return await apiFetch<{ ok: boolean; message: string }>(`/prompts/${postId}`, {
      method: 'DELETE',
      body: JSON.stringify({ walletAddress: userId }),
    });
  },

  updatePrompt: async (promptId: string, title: string, category: Category, walletAddress?: string) => {
    if (USE_MOCK_DATA) {
      const posts = localPostsStorage.getPosts().map(p =>
        p.id === promptId ? { ...p, title, category } : p
      );
      localPostsStorage.savePosts(posts);
      return { ok: true };
    }
    return await apiFetch<{ ok: boolean }>(`/prompts/${promptId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title, category, walletAddress }),
    });
  },
};

// ---------- Posts API (for completeness) ----------
export const postsApi = {
  createPost: async (prompt: string, response: string, userId?: string, modelId?: string, modelName?: string) => {
    if (USE_MOCK_DATA) {
      const posts = localPostsStorage.getPosts();
      const newPost: LocalPost = {
        id: Date.now().toString(),
        prompt,
        response,
        userId,
        userName: userId ? `User ${userId.slice(0, 6)}` : 'Anonymous',
        modelId,
        modelName,
        createdAt: new Date().toISOString(),
        likes: 0,
        title: 'Auto-generated Title',
        category: '기타',
      };
      posts.unshift(newPost);
      localPostsStorage.savePosts(posts);
      return {
        postId: newPost.id,
        prompt: newPost.prompt,
        response: newPost.response,
        userId: newPost.userId,
        modelId: newPost.modelId,
        modelName: newPost.modelName,
        createdAt: newPost.createdAt,
      };
    }
    return await apiFetch<{
      postId: string;
      prompt: string;
      response: string;
      userId?: string;
      modelId?: string;
      modelName?: string;
      createdAt: string;
    }>('/posts', {
      method: 'POST',
      body: JSON.stringify({ prompt, response, userId, modelId, modelName }),
    });
  },
};

// ---------- Users API ----------
export const usersApi = {
  getUserProfile: async (walletAddress: string) =>
    apiFetch<{
      user: { id: number; nickname: string; createdAt: string };
      stats: { totalPrompts: number; totalLikes: number; score: number; level: number; currentXP: number; nextLevelXP: number };
      popularPrompts: Array<PromptItem>;
    }>(`/users/${walletAddress}/profile`),

  getAchievements: async (walletAddress: string) =>
    apiFetch<Array<AchievementItem>>(`/users/${walletAddress}/achievements`),

  claimAchievement: async (walletAddress: string, achievementId: string) =>
    apiFetch<{ ok: boolean; claimed: boolean }>(`/users/${walletAddress}/achievements/${achievementId}/claim`, {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    }),

  getUserSharedPrompts: async (walletAddress: string, sort: 'likes' | 'latest' = 'likes') =>
    apiFetch<Array<{
      id: number;
      title: string;
      prompt: string;
      category: string;
      modelName: string;
      modelProvider: string;
      likes: number;
      createdAt: string;
      response: string;
    }>>(`/users/${walletAddress}/shared-prompts?sort=${sort}`),
};

// ---------- Health check ----------
export const healthCheck = async () => apiFetch<{ ok: boolean }>('/health');

export { ApiError };
