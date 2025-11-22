// API client utility for backend communication
import { env } from './config';

const API_BASE_URL = env.API_URL;

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(
        response.status,
        `API Error: ${response.statusText} - ${errorText}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Arena API
export const arenaApi = {
  // Create a new match
  createMatch: async (prompt: string, userId?: string) => {
    return apiFetch<{
      matchId: string;
      prompt: string;
      responseA: string;
      responseB: string;
      modelAId: string;
      modelBId: string;
    }>('/arena/match', {
      method: 'POST',
      body: JSON.stringify({ prompt, userId }),
    });
  },

  // Submit a vote
  vote: async (matchId: string, chosen: 'A' | 'B' | 'TIE', userId?: string) => {
    return apiFetch<{
      ok: boolean;
      refChoice?: string;
      modelA?: { rating: number };
      modelB?: { rating: number };
      user?: { score: number };
      vote?: {
        referenceScore: number;
        consistencyScore: number;
        consensusScore: number;
        totalScore: number;
      };
    }>('/arena/vote', {
      method: 'POST',
      body: JSON.stringify({ 
        matchId: Number(matchId), 
        chosen, 
        userId: userId ? Number(userId) : 1 
      }),
    });
  },
};

// Leaderboard API
export const leaderboardApi = {
  // Get model rankings
  getModels: async () => {
    return apiFetch<Array<{
      rank: number;
      id: string;
      name: string;
      provider: string;
      rating: number;
      gamesPlayed: number;
    }>>('/leaderboard/models');
  },

  // Get user rankings
  getUsers: async () => {
    return apiFetch<Array<{
      rank: number;
      id: string;
      nickname: string;
      score: number;
    }>>('/leaderboard/users');
  },
};

// 로컬 스토리지 기반 Posts 관리 (백엔드 준비 전 임시)
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
}

const localPostsStorage = {
  getPosts(): LocalPost[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(POSTS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // 초기 샘플 데이터
    const samplePosts: LocalPost[] = [
      {
        id: '1',
        prompt: 'React에서 useEffect의 cleanup 함수는 언제 실행되나요?',
        response: '# useEffect Cleanup 함수\n\n`useEffect`의 cleanup 함수는 다음 상황에서 실행됩니다:\n\n1. **컴포넌트가 언마운트될 때**: 컴포넌트가 DOM에서 제거되기 직전에 실행됩니다.\n\n2. **의존성 배열이 변경되어 effect가 다시 실행되기 전**: 새로운 effect가 실행되기 전에 이전 effect의 cleanup이 먼저 실행됩니다.\n\n```javascript\nuseEffect(() => {\n  // effect 실행\n  const subscription = subscribeToSomething();\n  \n  return () => {\n    // cleanup 함수\n    subscription.unsubscribe();\n  };\n}, [dependency]);\n```\n\nCleanup 함수는 메모리 누수를 방지하고, 이벤트 리스너나 타이머를 정리하는 데 중요합니다.',
        userName: 'Developer1',
        modelId: 'gpt-4',
        modelName: 'GPT-4',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        likes: 12,
      },
      {
        id: '2',
        prompt: 'TypeScript에서 제네릭을 사용하는 이유는 무엇인가요?',
        response: '# TypeScript 제네릭의 장점\n\n제네릭(Generics)은 타입을 파라미터화하여 재사용 가능한 컴포넌트를 만드는 기능입니다.\n\n## 주요 이점:\n\n1. **타입 안정성**: 컴파일 타임에 타입 체크가 가능합니다.\n2. **코드 재사용성**: 여러 타입에 대해 동일한 로직을 사용할 수 있습니다.\n3. **가독성 향상**: 명시적인 타입 정보로 코드를 이해하기 쉽습니다.\n\n```typescript\nfunction identity<T>(arg: T): T {\n  return arg;\n}\n\nconst result1 = identity<string>("hello");\nconst result2 = identity<number>(42);\n```\n\n제네릭을 사용하면 any를 사용하지 않고도 유연한 코드를 작성할 수 있습니다.',
        userName: 'TypeScriptPro',
        modelId: 'claude-3-opus',
        modelName: 'Claude 3 Opus',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        likes: 8,
      },
      {
        id: '3',
        prompt: 'Next.js의 Server Components와 Client Components의 차이점은?',
        response: '# Server Components vs Client Components\n\n## Server Components (기본값)\n- 서버에서만 렌더링\n- 번들 크기 감소\n- 데이터베이스 직접 접근 가능\n- useState, useEffect 사용 불가\n\n## Client Components\n- `"use client"` 지시어 필요\n- 브라우저에서 실행\n- 상호작용(이벤트 핸들러) 가능\n- React hooks 사용 가능\n\n```jsx\n// Server Component\nexport default async function Page() {\n  const data = await fetchData();\n  return <div>{data}</div>;\n}\n\n// Client Component\n"use client";\nexport default function Interactive() {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => setCount(count + 1)}>{count}</button>;\n}\n```',
        userName: 'NextJSExpert',
        modelId: 'gpt-3.5-turbo',
        modelName: 'GPT-3.5 Turbo',
        createdAt: new Date(Date.now() - 10800000).toISOString(),
        likes: 15,
      },
      {
        id: '4',
        prompt: 'async/await과 Promise의 차이점을 설명해주세요',
        response: '# async/await vs Promise\n\n## Promise\n```javascript\nfetchData()\n  .then(data => processData(data))\n  .then(result => console.log(result))\n  .catch(error => console.error(error));\n```\n\n## async/await\n```javascript\ntry {\n  const data = await fetchData();\n  const result = await processData(data);\n  console.log(result);\n} catch (error) {\n  console.error(error);\n}\n```\n\n### 주요 차이점:\n1. **가독성**: async/await이 더 읽기 쉽습니다\n2. **에러 처리**: try-catch로 일관성 있게 처리\n3. **디버깅**: 스택 트레이스가 더 명확합니다',
        userName: 'JSMaster',
        modelId: 'gpt-4',
        modelName: 'GPT-4',
        createdAt: new Date(Date.now() - 14400000).toISOString(),
        likes: 23,
      },
      {
        id: '5',
        prompt: 'CSS Flexbox와 Grid의 사용 시나리오는?',
        response: '# Flexbox vs Grid\n\n## Flexbox - 1차원 레이아웃\n- 행 또는 열 방향의 레이아웃\n- 동적 크기 조정이 필요할 때\n- 네비게이션 바, 버튼 그룹 등\n\n```css\n.container {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n```\n\n## Grid - 2차원 레이아웃\n- 행과 열을 동시에 제어\n- 복잡한 페이지 레이아웃\n- 카드 그리드, 대시보드 등\n\n```css\n.container {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 20px;\n}\n```',
        userName: 'CSSNinja',
        modelId: 'claude-3-sonnet',
        modelName: 'Claude 3 Sonnet',
        createdAt: new Date(Date.now() - 18000000).toISOString(),
        likes: 19,
      },
      {
        id: '6',
        prompt: 'REST API와 GraphQL의 장단점은?',
        response: '# REST API vs GraphQL\n\n## REST API 장점\n- 단순하고 이해하기 쉬움\n- HTTP 캐싱 활용 가능\n- 표준화된 상태 코드\n\n## REST API 단점\n- Over-fetching/Under-fetching\n- 여러 엔드포인트 호출 필요\n\n## GraphQL 장점\n- 필요한 데이터만 요청\n- 단일 엔드포인트\n- 강력한 타입 시스템\n\n## GraphQL 단점\n- 학습 곡선이 높음\n- 캐싱이 복잡함\n- 서버 부하 증가 가능성',
        userName: 'APIExpert',
        modelId: 'gpt-4-turbo',
        modelName: 'GPT-4 Turbo',
        createdAt: new Date(Date.now() - 21600000).toISOString(),
        likes: 31,
      },
      {
        id: '7',
        prompt: 'Docker와 가상 머신의 차이는 무엇인가요?',
        response: '# Docker vs 가상 머신\n\n## Docker 컨테이너\n- OS 커널 공유\n- 빠른 시작 시간 (초 단위)\n- 적은 리소스 사용\n- 격리 수준이 상대적으로 낮음\n\n## 가상 머신\n- 완전한 OS 포함\n- 느린 시작 시간 (분 단위)\n- 많은 리소스 필요\n- 높은 격리 수준\n\n## 사용 시나리오\n- **Docker**: 마이크로서비스, CI/CD, 개발 환경\n- **VM**: 완전한 격리 필요, 다른 OS 실행',
        userName: 'DevOpsGuru',
        modelId: 'claude-3-opus',
        modelName: 'Claude 3 Opus',
        createdAt: new Date(Date.now() - 25200000).toISOString(),
        likes: 27,
      },
      {
        id: '8',
        prompt: 'JWT 토큰의 보안 이슈와 해결 방법은?',
        response: '# JWT 보안 가이드\n\n## 주요 보안 이슈\n\n1. **XSS 공격**: localStorage에 저장 시 취약\n2. **토큰 탈취**: HTTPS 필수\n3. **만료 시간**: 적절한 expiration 설정\n\n## 해결 방법\n\n```javascript\n// 1. HttpOnly 쿠키 사용\nres.cookie("token", jwt, {\n  httpOnly: true,\n  secure: true,\n  sameSite: "strict"\n});\n\n// 2. 짧은 Access Token + Refresh Token\nconst accessToken = jwt.sign(payload, secret, { expiresIn: "15m" });\nconst refreshToken = jwt.sign(payload, secret, { expiresIn: "7d" });\n```',
        userName: 'SecurityExpert',
        modelId: 'gpt-4',
        modelName: 'GPT-4',
        createdAt: new Date(Date.now() - 28800000).toISOString(),
        likes: 42,
      },
    ];
    localPostsStorage.savePosts(samplePosts);
    return samplePosts;
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

// 테스트 모드: 백엔드 대신 로컬 스토리지 사용
const USE_MOCK_DATA = env.USE_MOCK_DATA;

// Posts API (프롬프트 공유 기능)
export const postsApi = {
  // 포스트 생성 (프롬프트 + 답변 공유)
  createPost: async (prompt: string, response: string, userId?: string, modelId?: string, modelName?: string) => {
    // 테스트 모드: 로컬 스토리지 사용
    if (USE_MOCK_DATA) {
      console.log('🧪 Test mode: Using local storage for createPost');
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

    try {
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
    } catch (error) {
      console.warn('Backend not available, using local storage');
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
  },

  // 포스트 목록 조회
  getPosts: async (limit: number = 20, offset: number = 0) => {
    // 테스트 모드: 로컬 스토리지 사용
    if (USE_MOCK_DATA) {
      console.log('🧪 Test mode: Using local storage for getPosts');
      const posts = localPostsStorage.getPosts();
      const likes = localPostsStorage.getLikes();
      return posts
        .slice(offset, offset + limit)
        .map((post) => ({
          ...post,
          isLiked: likes[post.id] || false,
        }));
    }

    try {
      return await apiFetch<Array<{
        id: string;
        prompt: string;
        response: string;
        userId?: string;
        userName?: string;
        modelId?: string;
        modelName?: string;
        createdAt: string;
        likes: number;
      }>>(`/posts?limit=${limit}&offset=${offset}`);
    } catch (error) {
      console.warn('Backend not available, using local storage');
      const posts = localPostsStorage.getPosts();
      const likes = localPostsStorage.getLikes();
      return posts
        .slice(offset, offset + limit)
        .map((post) => ({
          ...post,
          isLiked: likes[post.id] || false,
        }));
    }
  },

  // 단일 포스트 조회
  getPost: async (postId: string) => {
    // 테스트 모드: 로컬 스토리지 사용
    if (USE_MOCK_DATA) {
      console.log('🧪 Test mode: Using local storage for getPost');
      const posts = localPostsStorage.getPosts();
      const likes = localPostsStorage.getLikes();
      const post = posts.find((p) => p.id === postId);
      if (!post) {
        throw new Error('Post not found');
      }
      return {
        ...post,
        isLiked: likes[post.id] || false,
      };
    }

    try {
      return await apiFetch<{
        id: string;
        prompt: string;
        response: string;
        userId?: string;
        userName?: string;
        modelId?: string;
        modelName?: string;
        createdAt: string;
        likes: number;
      }>(`/posts/${postId}`);
    } catch (error) {
      console.warn('Backend not available, using local storage');
      const posts = localPostsStorage.getPosts();
      const likes = localPostsStorage.getLikes();
      const post = posts.find((p) => p.id === postId);
      if (!post) {
        throw new Error('Post not found');
      }
      return {
        ...post,
        isLiked: likes[post.id] || false,
      };
    }
  },

  // 포스트 좋아요
  likePost: async (postId: string, userId?: string) => {
    // 테스트 모드: 로컬 스토리지 사용
    if (USE_MOCK_DATA) {
      console.log('🧪 Test mode: Using local storage for likePost');
      const posts = localPostsStorage.getPosts();
      const likes = localPostsStorage.getLikes();
      const isLiked = likes[postId] || false;
      
      const updatedPosts = posts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            likes: isLiked ? post.likes - 1 : post.likes + 1,
          };
        }
        return post;
      });
      
      likes[postId] = !isLiked;
      localPostsStorage.savePosts(updatedPosts);
      localPostsStorage.saveLikes(likes);
      
      const updatedPost = updatedPosts.find((p) => p.id === postId);
      return {
        ok: true,
        likes: updatedPost?.likes || 0,
      };
    }

    try {
      return await apiFetch<{
        ok: boolean;
        likes: number;
      }>(`/posts/${postId}/like`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
    } catch (error) {
      console.warn('Backend not available, using local storage');
      const posts = localPostsStorage.getPosts();
      const likes = localPostsStorage.getLikes();
      const isLiked = likes[postId] || false;
      
      const updatedPosts = posts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            likes: isLiked ? post.likes - 1 : post.likes + 1,
          };
        }
        return post;
      });
      
      likes[postId] = !isLiked;
      localPostsStorage.savePosts(updatedPosts);
      localPostsStorage.saveLikes(likes);
      
      const updatedPost = updatedPosts.find((p) => p.id === postId);
      return {
        ok: true,
        likes: updatedPost?.likes || 0,
      };
    }
  },
};

// Health check
export const healthCheck = async () => {
  return apiFetch<{ ok: boolean }>('/health');
};

export { ApiError };
