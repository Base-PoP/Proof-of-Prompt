'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Heart, Loader2, Clock, Trash2 } from 'lucide-react';
import { promptsApi, arenaApi } from '../../lib/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { env } from '../../lib/config';
import { Category, CATEGORIES, CATEGORY_COLORS } from '../../lib/constants';

interface Post {
  id: string;
  title?: string;
  prompt: string;
  response: string;
  userId?: string;
  userName?: string;
  modelId?: string;
  modelName?: string;
  createdAt: string;
  likes: number;
  isLiked?: boolean;
  tags?: string[];
  category?: Category;
}

interface DashboardPageProps {
  onNewChat?: () => void;
  onSelectPost?: (postId: string) => void;
  draftPost?: { matchId: string; prompt: string; response: string } | null;
  onPostCreated?: () => void;
}

const sortChipClass = (active: boolean) =>
  `px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
    active
      ? 'bg-[#0052FF] text-white border-transparent shadow-[0_12px_30px_rgba(0,82,255,0.22)]'
      : 'bg-white text-[#1f3b66] border-[#d7e3f7] hover:bg-[#eef3ff]'
  }`;

const categoryChipClass = (active: boolean) =>
  `px-4 py-2 rounded-full text-sm font-medium transition-all border ${
    active
      ? 'bg-[#0052FF] text-white border-transparent shadow-[0_12px_30px_rgba(0,82,255,0.22)]'
      : 'bg-white text-[#1f3b66] border-[#d7e3f7] hover:bg-[#eef3ff]'
  }`;

export function DashboardPage({ onSelectPost, draftPost, onPostCreated }: DashboardPageProps) {
  const { requireAuth, userAddress } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');
  const [hasMore, setHasMore] = useState(true);
  const lastSharedMatchIdRef = useRef<string | null>(null);
  const LIMIT = 20;

  const loadPrompts = async (append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const offset = append ? posts.length : 0;
      const data = await promptsApi.getPrompts(
        LIMIT,
        offset,
        userAddress || undefined,
        sortBy,
        selectedCategory || undefined
      );

      setPosts(prev => append ? [...prev, ...data] : data);
      setHasMore(data.length === LIMIT);
    } catch (err) {
      setError('게시글을 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    // 필터/정렬 변경 시 목록을 초기 로드
    loadPrompts(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, selectedCategory, userAddress]);

  // 주간 보상 카운트다운 (테스트 기본 1분)
  // Weekly reward countdown removed (unused in UI)

  useEffect(() => {
    if (draftPost && lastSharedMatchIdRef.current !== draftPost.matchId) {
      // Auto-share without modal
      handleAutoShare();
      lastSharedMatchIdRef.current = draftPost.matchId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftPost, userAddress]);

  const handleAutoShare = async () => {
    if (!draftPost) return;

    const toastId = toast.loading('게시글을 공유하고 있습니다...');

    try {
      if (env.USE_MOCK_DATA) {
        // 테스트 모드: 로컬 스토리지에 바로 저장
        await promptsApi.sharePrompt(
          draftPost.prompt,
          draftPost.response,
          userAddress || undefined,
          undefined,
          undefined
        );

      await loadPrompts(false); // 목록을 새로고침해 일관성 유지

        toast.success('게시글이 공유되었습니다!', {
          id: toastId,
          description: `제목과 카테고리가 자동 생성되었습니다.`,
        });

        if (onPostCreated) {
          onPostCreated();
        }
        return;
      }

      const result = await arenaApi.sharePrompt(
        Number(draftPost.matchId),
        userAddress || undefined
      );

      // 새 게시글을 바로 볼 수 있도록 필터 초기화 후 목록 새로고침
      setSelectedCategory(null);
      setSortBy('latest');
      await loadPrompts(false);

      toast.success('게시글이 공유되었습니다!', {
        id: toastId,
        description: `제목과 카테고리가 자동 생성되었습니다.`,
      });

      if (onPostCreated) {
        onPostCreated();
      }

      // 공유 완료 후 대시보드가 최신 상태로 유지되도록 카드 보기
      if (posts.length > 0 && onSelectPost) {
        const latestId = result?.prompt?.id?.toString?.() || posts[0].id;
        onSelectPost(latestId);
      }
    } catch (err) {
      toast.error('게시글 공유 실패', {
        id: toastId,
        description: err instanceof Error ? err.message : '다시 시도해주세요',
      });
      console.error('Failed to create post:', err);
    }
  };

  const handleCardClick = (postId: string) => {
    if (onSelectPost) {
      onSelectPost(postId);
    }
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      loadPrompts(true);
    }
  };

  const handleLike = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 카드 클릭 이벤트 전파 방지
    
    // 권한 체크
    requireAuth(async () => {
      try {
        const result = await promptsApi.likePrompt(postId, userAddress || undefined);
        
        if (result.ok) {
          setPosts(posts.map(post => 
            post.id === postId 
              ? { ...post, likes: result.likes, isLiked: 'liked' in result ? result.liked : post.isLiked }
              : post
          ));
        }
      } catch (err) {
        toast.error('좋아요 실패', {
          description: err instanceof Error ? err.message : '다시 시도해주세요',
        });
        console.error('Failed to like post:', err);
      }
    }, '좋아요를 누르려면 지갑을 연결해주세요');
  };

  const handleDelete = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('정말 이 게시글을 삭제하시겠습니까?')) {
      return;
    }

    requireAuth(async () => {
      try {
        await promptsApi.deletePrompt(postId, userAddress || undefined);
        setPosts(prev => prev.filter(post => post.id !== postId));
        toast.success('게시글이 삭제되었습니다');
      } catch (err) {
        toast.error('게시글 삭제 실패', {
          description: '자신의 게시글만 삭제할 수 있습니다',
        });
        console.error('Failed to delete post:', err);
      }
    }, '게시글을 삭제하려면 지갑을 연결해주세요');
  };


  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return '방금 전';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
      {/* Weekly reward countdown */}
   

      {/* Test Mode Banner */}
      {env.USE_MOCK_DATA && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧪</span>
            <div>
              <p className="text-sm font-semibold text-blue-800">테스트 모드</p>
              <p className="text-xs text-blue-600">샘플 데이터를 사용하여 기능을 테스트하고 있습니다</p>
            </div>
          </div>
        </div>
      )}

      {/* Sort and Category Filter */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSortBy('latest')}
            className={sortChipClass(sortBy === 'latest')}
          >
            최신순
          </button>
          <button
            type="button"
            onClick={() => setSortBy('popular')}
            className={sortChipClass(sortBy === 'popular')}
          >
            인기순
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={categoryChipClass(selectedCategory === null)}
          >
            전체
          </button>
          {CATEGORIES.map(category => (
            <button
              type="button"
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={categoryChipClass(selectedCategory === category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0052FF' }} />
        </div>
      )}

      {/* Posts List */}
      {!isLoading && posts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">아직 공유된 포스트가 없습니다</p>
          <p className="text-gray-400 text-sm mt-2">
            Home에서 프롬프트를 입력하고 답변을 공유해보세요!
          </p>
        </div>
      )}

      {!isLoading && posts.length > 0 && (
        <>
          <div className="flex flex-col gap-4">
            {posts.map((post) => (
              <Card
                key={post.id}
                onClick={() => handleCardClick(post.id)}
                className="p-4 border border-[#e5eaf5] bg-white/95 hover:bg-white rounded-2xl shadow-[0_8px_28px_rgba(43,91,173,0.06)] hover:shadow-[0_12px_32px_rgba(43,91,173,0.1)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group relative flex flex-row items-start gap-3"
              >
                {/* 삭제 버튼 - 자신의 게시글인 경우만 표시 */}
                {post.userName === userAddress && (
                  <button
                    onClick={(e) => handleDelete(post.id, e)}
                    className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 z-10"
                    title="게시글 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {/* Left: Like Button */}
                <div className="flex flex-col items-center min-w-[54px] pt-0.5">
                  <button
                    onClick={(e) => handleLike(post.id, e)}
                    aria-pressed={!!post.isLiked}
                    className={`flex flex-col items-center gap-1 px-2 py-2 rounded-2xl border transition-all ${
                      post.isLiked
                        ? 'text-[#ff6b81] border-[#ffd8e1] bg-[#fff1f4] shadow-[0_8px_24px_rgba(255,105,140,0.18)]'
                        : 'text-[#9aa8c4] border-transparent hover:text-[#ff6b81] hover:bg-[#f7f9fe] hover:border-[#e5eaf5]'
                    }`}
                  >
                    <Heart
                      className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`}
                    />
                    <span className="text-[13px] font-semibold text-[#7a879f]">{post.likes}</span>
                  </button>
                </div>

                {/* Middle: Content */}
                <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-gray-900 group-hover:text-[#1b5cff] transition-colors truncate">
                        {post.title || 'Auto-generated Title'}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                        {post.prompt}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-[13px] text-[#98a2b3] shrink-0 pt-0.5">
                      <Clock className="w-4 h-4" />
                      <span>{formatTimeAgo(post.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {post.category && (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold border ${CATEGORY_COLORS[post.category]}`}>
                        {post.category}
                      </span>
                    )}
                    <div className="flex items-center gap-2 text-[13px] text-[#6b7a99]">
                      <div className="w-7 h-7 rounded-full bg-[#f1f5fb] text-[#365486] flex items-center justify-center text-[11px] font-bold">
                        US
                      </div>
                      <span className="truncate max-w-[220px]">{post.userName || 'User'}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                onClick={handleLoadMore}
                variant="outline"
                disabled={isLoadingMore}
                className="rounded-full px-6"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    불러오는 중...
                  </>
                ) : (
                  '더 보기'
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 mt-8">
        <p>
          Powered by <span style={{ color: '#0052FF' }}>Base</span> blockchain 🎯
        </p>
      </div>
    </div>
  );
}
