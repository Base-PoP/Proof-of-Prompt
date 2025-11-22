'use client';

import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Heart, Loader2, Clock, MessageSquare } from 'lucide-react';
import { postsApi } from '../../lib/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { env } from '../../lib/config';

interface Post {
  id: string;
  prompt: string;
  response: string;
  userId?: string;
  userName?: string;
  modelId?: string;
  modelName?: string;
  createdAt: string;
  likes: number;
  isLiked?: boolean;
}

interface DashboardPageProps {
  onNewChat?: () => void;
  onSelectPost?: (postId: string) => void;
}

export function DashboardPage({ onNewChat, onSelectPost }: DashboardPageProps) {
  const { requireAuth } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedPosts = await postsApi.getPosts(20, 0);
      setPosts(fetchedPosts);
    } catch (err) {
      setError(err instanceof Error ? err.message : '포스트 로드 실패');
      console.error('Failed to load posts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 카드 클릭 이벤트 전파 방지
    
    // 권한 체크
    requireAuth(async () => {
      try {
        const result = await postsApi.likePost(postId);
        
        if (result.ok) {
          setPosts(posts.map(post => 
            post.id === postId 
              ? { ...post, likes: result.likes, isLiked: !post.isLiked }
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

  const handleCardClick = (postId: string) => {
    if (onSelectPost) {
      onSelectPost(postId);
    }
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#0052FF' }}>
          대시보드
        </h1>
        <p className="text-gray-600">
          공유된 프롬프트를 클릭하여 대화 내용을 확인하세요
        </p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Card
              key={post.id}
              onClick={() => handleCardClick(post.id)}
              className="p-4 border-2 hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col"
              style={{ borderColor: '#0052FF20', minHeight: '280px' }}
            >
              {/* Post Header - 컴팩트 */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0" style={{ backgroundColor: '#0052FF' }}>
                    {post.userName ? post.userName[0].toUpperCase() : 'A'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-700 truncate">
                      {post.userName || 'Anonymous'}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{formatTimeAgo(post.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prompt Preview - 메인 콘텐츠 강조 */}
              <div className="mb-3 flex-shrink-0 flex-1">
                <p className="text-base font-medium text-gray-900 leading-relaxed line-clamp-4 group-hover:text-blue-600 transition-colors">
                  {post.prompt}
                </p>
              </div>

              {/* Model Info - 컴팩트 */}
              <div className="mb-2 flex-shrink-0">
                {post.modelName && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-gray-700 text-xs font-medium rounded-full">
                    <MessageSquare className="w-3 h-3" />
                    {post.modelName}
                  </span>
                )}
              </div>

              {/* Footer - 하단 고정 */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 flex-shrink-0">
                <button
                  onClick={(e) => handleLike(post.id, e)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full transition-all ${
                    post.isLiked
                      ? 'bg-red-50 text-red-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`}
                  />
                  <span className="text-sm font-medium">{post.likes}</span>
                </button>

                <span className="text-sm text-gray-500 group-hover:text-blue-600 transition-colors">
                  자세히 보기 →
                </span>
              </div>
            </Card>
          ))}
        </div>
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

