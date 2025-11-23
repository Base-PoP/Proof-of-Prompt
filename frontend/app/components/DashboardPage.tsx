'use client';

import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Heart, Loader2, Clock, MessageSquare, X, Trash2 } from 'lucide-react';
import { postsApi, arenaApi } from '../../lib/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { env } from '../../lib/config';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  const [error, setError] = useState<string | null>(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postTags, setPostTags] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    if (draftPost) {
      setShowCreateModal(true);
      setPostTitle(''); // 제목 초기화
    }
  }, [draftPost]);

  const loadPosts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedPosts = await postsApi.getPosts(20, 0, userAddress || undefined);
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
        const result = await postsApi.likePost(postId, userAddress || undefined);
        
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
        await postsApi.deletePost(postId, userAddress || undefined);
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

  const getUniqueTags = () => {
    const tagSet = new Set<string>();
    posts.forEach(post => {
      post.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  };

  const filteredPosts = selectedTag
    ? posts.filter(post => post.tags?.includes(selectedTag))
    : posts;

  // 정렬된 게시글
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === 'popular') {
      return b.likes - a.likes; // 좋아요 많은 순
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // 최신순
  });

  const handleCreatePost = async () => {
    if (!draftPost) return;
    if (!postTitle.trim()) {
      toast.error('제목을 입력해주세요');
      return;
    }

    setIsCreatingPost(true);
    try {
      // 태그 파싱: # 제거 및 공백으로 분리
      const tags = postTags
        .split(/[\s,]+/)
        .map(tag => tag.replace(/^#/, '').trim())
        .filter(tag => tag.length > 0);

      const result = await arenaApi.createPost(
        Number(draftPost.matchId),
        postTitle,
        userAddress || undefined,
        tags.length > 0 ? tags : undefined
      );

      // 새로운 포스트를 목록 맨 앞에 추가
      const newPost: Post = {
        id: result.post.id.toString(), // 실제 post ID 사용
        title: result.post.title,
        prompt: result.post.prompt,
        response: result.post.response,
        modelId: result.post.modelId.toString(),
        modelName: result.post.modelName,
        createdAt: result.post.createdAt,
        likes: 0,
        isLiked: false,
        tags: result.post.tags || [],
      };

      setPosts(prev => [newPost, ...prev]);

      toast.success('게시글이 작성되었습니다!', {
        description: `모델: ${result.post.modelName} (${result.post.modelProvider})`,
      });

      setShowCreateModal(false);
      setPostTitle('');
      setPostTags('');
      
      // draftPost 초기화
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (err) {
      toast.error('게시글 작성 실패', {
        description: err instanceof Error ? err.message : '다시 시도해주세요',
      });
      console.error('Failed to create post:', err);
    } finally {
      setIsCreatingPost(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* 게시글 작성 모달 */}
      {showCreateModal && draftPost && (
        <>
          {/* 오버레이 */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowCreateModal(false)}
          />
          
          {/* 모달 컨텐츠 */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold" style={{ color: '#0052FF' }}>게시글 작성</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowCreateModal(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* 제목 입력 */}
                <div className="mb-4">
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">제목</label>
                  <input
                    type="text"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="게시글 제목을 입력하세요"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={100}
                  />
                </div>

                {/* 태그 입력 */}
                <div className="mb-4">
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">태그</label>
                  <input
                    type="text"
                    value={postTags}
                    onChange={(e) => setPostTags(e.target.value)}
                    placeholder="#코딩 #수학 #AI (공백으로 구분)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1"># 제외하고 입력해도 됩니다 (예: 코딩 수학)</p>
                </div>

                {/* 프롬프트 (읽기 전용) */}
                <div className="mb-4">
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">질문</label>
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <p className="text-gray-800">{draftPost.prompt}</p>
                  </div>
                </div>

                {/* AI 응답 (읽기 전용) */}
                <div className="mb-6">
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">AI 응답</label>
                  <div className="p-4 bg-gray-50 rounded-lg border max-h-96 overflow-y-auto">
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {draftPost.response}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                  >
                    취소
                  </Button>
                  <Button
                    onClick={handleCreatePost}
                    disabled={isCreatingPost || !postTitle.trim()}
                    style={{ backgroundColor: '#0052FF' }}
                  >
                    {isCreatingPost ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        게시 중...
                      </>
                    ) : (
                      '게시하기'
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

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

      {/* Sort and Tag Filter */}
      {!isLoading && posts.length > 0 && (
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
              전체
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

          {/* Tag Filter */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setSelectedTag(null)}
              variant={selectedTag === null ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              style={selectedTag === null ? { backgroundColor: '#0052FF' } : {}}
            >
              전체
            </Button>
            {getUniqueTags().map(tag => (
              <Button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                variant={selectedTag === tag ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                style={selectedTag === tag ? { backgroundColor: '#0052FF' } : {}}
              >
                #{tag}
              </Button>
            ))}
          </div>
        </div>
      )}

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

      {!isLoading && sortedPosts.length === 0 && posts.length > 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">해당 카테고리의 포스트가 없습니다</p>
        </div>
      )}

      {!isLoading && sortedPosts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedPosts.map((post) => (
            <Card
              key={post.id}
              onClick={() => handleCardClick(post.id)}
              className="p-5 border hover:shadow-lg transition-all duration-200 cursor-pointer group relative"
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
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {post.prompt}
              </p>

              {/* 태그 */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {post.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-gray-500">
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

