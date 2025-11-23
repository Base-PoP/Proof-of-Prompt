'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Heart, Loader2, Clock, MessageSquare, X, Trash2 } from 'lucide-react';
import { promptsApi, arenaApi } from '../../lib/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { env } from '../../lib/config';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

export function DashboardPage({ onNewChat, onSelectPost, draftPost, onPostCreated }: DashboardPageProps) {
  const { requireAuth, userAddress } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
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
  }, [sortBy, selectedCategory, userAddress]);

  useEffect(() => {
    if (draftPost && lastSharedMatchIdRef.current !== draftPost.matchId) {
      // Auto-share without modal
      handleAutoShare();
      lastSharedMatchIdRef.current = draftPost.matchId;
    }
  }, [draftPost, userAddress]);

  const handleAutoShare = async () => {
    if (!draftPost) return;

    setIsSharing(true);
    const toastId = toast.loading('게시글을 공유하고 있습니다...');

    try {
      if (env.USE_MOCK_DATA) {
        // 테스트 모드: 로컬 스토리지에 바로 저장
        const created = await promptsApi.sharePrompt(
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
    } finally {
      setIsSharing(false);
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
    <div className="max-w-7xl mx-auto px-4 py-6">
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

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#0052FF' }}>
          대시보드
        </h1>
        <p className="text-gray-600">
          공유된 프롬프트를 클릭하여 대화 내용을 확인하세요
        </p>
      </div>

      {/* Sort and Category Filter */}
      <div className="mb-6 space-y-3">
        {/* Sort Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => setSortBy('latest')}
            variant={sortBy === 'latest' ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            style={sortBy === 'latest' ? { backgroundColor: '#0052FF' } : {}}
          >
            최신순
          </Button>
          <Button
            onClick={() => setSortBy('popular')}
            variant={sortBy === 'popular' ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            style={sortBy === 'popular' ? { backgroundColor: '#0052FF' } : {}}
          >
            인기순
          </Button>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setSelectedCategory(null)}
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            style={selectedCategory === null ? { backgroundColor: '#0052FF' } : {}}
          >
            전체
          </Button>
          {CATEGORIES.map(category => (
            <Button
              key={category}
              onClick={() => setSelectedCategory(category)}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              style={selectedCategory === category ? { backgroundColor: '#0052FF' } : {}}
            >
              {category}
            </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post) => (
              <Card
                key={post.id}
                onClick={() => handleCardClick(post.id)}
                className="p-5 border hover:shadow-lg transition-all duration-200 cursor-pointer group relative flex flex-col h-full"
                style={{ borderColor: '#E5E7EB' }}
              >
                {/* 삭제 버튼 - 자신의 게시글인 경우만 표시 */}
                {post.userName === userAddress && (
                  <button
                    onClick={(e) => handleDelete(post.id, e)}
                    className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    title="게시글 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {/* 제목 */}
                <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors pr-8">
                  {post.title || post.prompt.substring(0, 50) + '...'}
                </h3>

                {/* 프롬프트 미리보기 */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-1">
                  {post.prompt}
                </p>

                {/* 카테고리 */}
                {post.category && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[post.category] || 'bg-gray-100 text-gray-800'}`}
                    >
                      {post.category}
                    </span>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    {/* 모델 정보 */}
                    {post.modelName && (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {post.modelName}
                      </span>
                    )}
                    
                    {/* 시간 */}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTimeAgo(post.createdAt)}
                    </span>
                  </div>

                  {/* 좋아요 */}
                  <button
                    onClick={(e) => handleLike(post.id, e)}
                    className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                      post.isLiked
                        ? 'text-red-600'
                        : 'text-gray-600 hover:text-red-600'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`}
                    />
                    <span className="text-sm font-medium">{post.likes}</span>
                  </button>
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

