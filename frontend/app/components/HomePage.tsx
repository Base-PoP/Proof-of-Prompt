'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { Copy, Maximize2, Loader2, Share2, ArrowLeft } from 'lucide-react';
import { arenaApi, postsApi } from '../../lib/api';
import { useAuth } from '../hooks/useAuth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

interface ChatMessage {
  matchId?: string;
  prompt: string;
  response: string;
  modelId?: string;
  modelName?: string;
}

interface HomePageProps {
  onStartBattle?: (prompt: string) => void;
  onBack?: () => void;
  initialChatId?: string | null;
}

export function HomePage({ onStartBattle, onBack, initialChatId }: HomePageProps) {
  const { user, userAddress, requireAuth, isAuthenticated } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [currentMessage, setCurrentMessage] = useState<ChatMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load chat from history if initialChatId is provided
  useEffect(() => {
    if (initialChatId) {
      loadChatFromHistory(initialChatId);
    }
  }, [initialChatId]);

  const loadChatFromHistory = async (chatId: string) => {
    setIsLoading(true);
    try {
      // Get post data from postsApi
      const post = await postsApi.getPost(chatId);
      setCurrentMessage({
        prompt: post.prompt,
        response: post.response,
        modelId: post.modelId,
        modelName: post.modelName,
      });
    } catch (err) {
      setError('채팅을 불러오는데 실패했습니다.');
      console.error('Failed to load chat:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToHome = () => {
    setCurrentMessage(null);
    setPrompt('');
    setError(null);
    if (onBack) {
      onBack();
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const userId = user?.wallet?.address;
      const match = await arenaApi.createMatch(prompt, userId);
      
      // 단일 응답만 사용 (A 응답 사용)
      setCurrentMessage({
        matchId: match.matchId,
        prompt: match.prompt,
        response: match.responseA,
        modelId: match.modelAId,
      });
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '응답 생성 실패');
      console.error('Failed to create match:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!currentMessage) return;

    // 권한 체크
    requireAuth(async () => {
      setIsSharing(true);
      try {
        await postsApi.createPost(
          currentMessage.prompt,
          currentMessage.response,
          userAddress || undefined,
          currentMessage.modelId,
          currentMessage.modelName || 'AI Model'
        );
        toast.success('포스트가 공유되었습니다!', {
          description: 'Dashboard 탭에서 확인할 수 있습니다.',
        });
      } catch (err) {
        toast.error('공유 실패', {
          description: err instanceof Error ? err.message : '다시 시도해주세요',
        });
        console.error('Failed to share post:', err);
      } finally {
        setIsSharing(false);
      }
    }, '프롬프트를 공유하려면 지갑을 연결해주세요');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // 메시지가 없을 때 - 초기 화면
  if (!currentMessage) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-16">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm max-w-3xl w-full">
            {error}
          </div>
        )}

        {/* Main Title */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 tracking-tight" style={{ color: '#0052FF' }}>
            Find the best AI for you
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Compare answers across top AI models and share your feedback
          </p>
        </div>


        {/* Input Area */}
        <div className="w-full max-w-3xl">
          <div className="bg-gray-50 rounded-xl border-2 border-gray-200 focus-within:border-[#0052FF] shadow-sm transition-all duration-200 overflow-hidden">
            <Textarea
              placeholder="Ask anything..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full min-h-[140px] px-6 py-5 bg-transparent !border-none focus:ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 !shadow-none text-base resize-none placeholder:text-gray-400"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSubmit();
                }
              }}
            />
            
            {/* 구분선 */}
            <div className="border-t border-gray-200"></div>
            
            <div className="flex items-center justify-between px-6 py-3 bg-white">
              <div className="text-xs text-gray-400">
                Press <kbd className="px-2 py-1 bg-white rounded text-gray-500 font-mono text-xs border border-gray-200 shadow-sm">Ctrl/Cmd + Enter</kbd> to submit
              </div>
              
              <Button
                onClick={handleSubmit}
                disabled={!prompt.trim() || isLoading}
                className="rounded-lg px-7 py-2.5 font-medium transition-all disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: !prompt.trim() || isLoading ? '#93b5fd' : '#0052FF',
                  opacity: !prompt.trim() || isLoading ? 0.6 : 1,
                  color: '#FFFFFF'
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
            </div>
          </div>

          {/* Hint Text */}
          <p className="text-center text-sm text-gray-400 mt-6">
            Ask questions, get insights, or explore creative ideas with AI
          </p>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-400">
            Powered by{' '}
            <span className="font-semibold" style={{ color: '#0052FF' }}>
              Base
            </span>{' '}
            blockchain
          </p>
        </div>
      </div>
    );
  }

  // 채팅 화면 - 단일 답변
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Back Button */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToHome}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>새로운 채팅</span>
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Current Prompt with Share Button */}
      <div className="flex justify-end items-start gap-3 mb-6">
        {/* Share Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleShare}
          disabled={isSharing}
          className="mt-1 shrink-0"
          title="프롬프트와 답변 공유"
        >
          {isSharing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
        </Button>
        
        {/* Prompt Message Bubble */}
        <div className="max-w-2xl bg-white border border-gray-200 rounded-2xl px-5 py-3 shadow-sm">
          <p className="text-base text-gray-800 leading-relaxed">{currentMessage.prompt}</p>
        </div>
      </div>

      {/* AI Response */}
      <div className="mb-6">
        <Card className="p-6 hover:shadow-xl transition-all duration-300 border-2 max-h-[600px] flex flex-col" style={{ borderColor: '#0052FF20' }}>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-700">AI Assistant</h3>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleCopy(currentMessage.response)}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Copy response"
              >
                <Copy className="w-4 h-4 text-gray-500" />
              </button>
              <button 
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Expand"
              >
                <Maximize2 className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto text-gray-700 leading-relaxed prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {currentMessage.response}
            </ReactMarkdown>
          </div>
        </Card>
      </div>

      {/* New Prompt Input */}
      <div className="mt-8">
        <Card className="p-4 border-2 border-gray-200 focus-within:border-[#0052FF] shadow-sm transition-all duration-200">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Textarea
              placeholder="다음 배틀을 시작하려면 새로운 질문을 입력하세요..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="flex-1 min-h-[50px] resize-none !border-none focus:ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 !shadow-none"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSubmit();
                }
              }}
            />
            <Button 
              className="px-8 h-auto sm:h-10 transition-all hover:scale-105 active:scale-95"
              style={{ backgroundColor: '#0052FF' }}
              onClick={handleSubmit}
              disabled={isLoading || !prompt.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Next Battle'
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 mt-6">
        <p>AI 답변이 마음에 드셨나요? 공유 버튼을 눌러 Battle 탭에 포스팅하세요! 🎯</p>
        <p className="mt-2">
          Powered by <span style={{ color: '#0052FF' }}>Base</span> blockchain
        </p>
      </div>
    </div>
  );
}
