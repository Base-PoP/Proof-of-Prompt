'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Copy, Heart, Loader2, ArrowLeft, MessageSquare, Clock, Trash2 } from 'lucide-react';
import { postsApi } from '../../lib/api';
import { useAuth } from '../hooks/useAuth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { CodeBlock } from './CodeBlock';

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

interface ConversationPageProps {
  postId: string;
  onBack?: () => void;
}

export function ConversationPage({ postId, onBack }: ConversationPageProps) {
  const { requireAuth, userAddress } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedPost = await postsApi.getPost(postId, userAddress || undefined);
      setPost(fetchedPost);
    } catch (err) {
      setError(err instanceof Error ? err.message : '포스트를 불러올 수 없습니다');
      console.error('Failed to load post:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async () => {
    if (!post) return;

    // 권한 체크
    requireAuth(async () => {
      try {
        const result = await postsApi.likePost(post.id, undefined);
        
        if (result.ok) {
          setPost({
            ...post,
            likes: result.likes,
            isLiked: !post.isLiked,
          });
        }
      } catch (err) {
        toast.error('좋아요 실패', {
          description: err instanceof Error ? err.message : '다시 시도해주세요',
        });
        console.error('Failed to like post:', err);
      }
    }, '좋아요를 누르려면 지갑을 연결해주세요');
  };

  const handleDelete = async () => {
    if (!post) return;

    if (!confirm('정말 이 게시글을 삭제하시겠습니까?')) {
      return;
    }

    requireAuth(async () => {
      try {
        await postsApi.deletePost(post.id, userAddress || undefined);
        toast.success('게시글이 삭제되었습니다');
        if (onBack) {
          onBack();
        }
      } catch (err) {
        toast.error('게시글 삭제 실패', {
          description: '자신의 게시글만 삭제할 수 있습니다',
        });
        console.error('Failed to delete post:', err);
      }
    }, '게시글을 삭제하려면 지갑을 연결해주세요');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('복사되었습니다!');
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

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0052FF' }} />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || '포스트를 찾을 수 없습니다'}</p>
          <Button
            onClick={onBack}
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header with Back Button */}
      <div className="mb-6">
        <Button
          onClick={onBack}
          variant="ghost"
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          돌아가기
        </Button>
      </div>

      {/* Post Header Info */}
      <Card className="p-6 mb-6 border-2" style={{ borderColor: '#0052FF20' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold" style={{ backgroundColor: '#0052FF' }}>
              {post.userName ? post.userName[0].toUpperCase() : 'A'}
            </div>
            <div>
              <p className="text-base font-semibold text-gray-700">
                {post.userName || 'Anonymous'}
              </p>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(post.createdAt)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Model Info */}
            {post.modelName && (
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                <MessageSquare className="w-4 h-4" style={{ color: '#0052FF' }} />
                <span className="text-sm font-semibold" style={{ color: '#0052FF' }}>
                  {post.modelName}
                </span>
              </div>
            )}

            {/* Delete Button - 본인 게시글인 경우만 표시 */}
            {post.userName === userAddress && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all bg-red-50 text-red-600 hover:bg-red-100"
                title="게시글 삭제"
              >
                <Trash2 className="w-5 h-5" />
                <span className="text-sm font-medium">삭제</span>
              </button>
            )}

            {/* Like Button */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                post.isLiked
                  ? 'bg-red-50 text-red-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Heart
                className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`}
              />
              <span className="text-sm font-medium">{post.likes}</span>
            </button>
          </div>
        </div>
      </Card>

      {/* User Prompt */}
      <div className="flex justify-end mb-6">
        <div className="max-w-2xl">
          <Card className="p-5 bg-white border-2 border-gray-200">
            <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
              {post.prompt}
            </p>
          </Card>
        </div>
      </div>

      {/* AI Response */}
      <div className="mb-6">
        <Card className="p-6 border-2" style={{ borderColor: '#0052FF20' }}>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-700">
                {post.modelName || 'AI'} 답변
              </h3>
            </div>
            <button 
              onClick={() => handleCopy(post.response)}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title="답변 복사"
            >
              <Copy className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="prose prose-sm max-w-none
            prose-headings:font-bold prose-headings:text-gray-900
            prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-6
            prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-5
            prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-4
            prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-3
            prose-ul:my-3 prose-ul:list-disc prose-ul:pl-6 prose-ul:ml-0
            prose-ol:my-3 prose-ol:list-decimal prose-ol:pl-6 prose-ol:ml-0
            prose-li:text-gray-700 prose-li:mb-1 prose-li:marker:text-gray-500
            prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0
            prose-code:bg-gray-200 prose-code:text-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-[''] prose-code:after:content-['']
            prose-strong:text-gray-900 prose-strong:font-semibold
            prose-em:text-gray-700 prose-em:italic
            prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
            prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600
            prose-table:border-collapse prose-table:w-full prose-table:my-4
            prose-thead:bg-gray-50
            prose-th:border prose-th:border-gray-300 prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:text-gray-900
            prose-td:border prose-td:border-gray-300 prose-td:px-4 prose-td:py-2 prose-td:text-gray-700
            prose-tr:border-b prose-tr:border-gray-200
          ">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';
                  
                  if (!inline && language) {
                    return (
                      <CodeBlock language={language}>
                        {String(children).replace(/\n$/, '')}
                      </CodeBlock>
                    );
                  }
                  
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {post.response}
            </ReactMarkdown>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 mt-8">
        <p>
          Powered by <span style={{ color: '#0052FF' }}>Base</span> blockchain 🎯
        </p>
      </div>
    </div>
  );
}

