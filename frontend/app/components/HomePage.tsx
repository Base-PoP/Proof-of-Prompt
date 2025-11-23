import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { Copy, Maximize2, Loader2, Share2, ArrowLeft } from 'lucide-react';
import { arenaApi } from '../../lib/api';
import { useAuth } from '../hooks/useAuth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { CodeBlock } from './CodeBlock';

interface ChatMessage {
  matchId?: string;
  prompt: string;
  response: string;
  modelId?: string;
  modelName?: string;
}

interface ChatHistoryItem {
  id: string;
  matchId: string;
  title: string;
  prompt: string;
  response: string;
  timestamp: string;
}

interface HomePageProps {
  onStartBattle?: (prompt: string) => void;
  onBack?: () => void;
  initialChatId?: string | null;
  onChatCreated?: (matchId: string, prompt: string, response: string) => void;
  chatHistory?: ChatHistoryItem[];
  onShareToDashboard?: (matchId: string, prompt: string, response: string) => void;
}

export function HomePage({ onBack, initialChatId, onChatCreated, chatHistory = [], onShareToDashboard }: HomePageProps) {
  const { requireAuth } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [currentMessage, setCurrentMessage] = useState<ChatMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load chat from history if initialChatId is provided
  useEffect(() => {
    if (initialChatId && chatHistory.length > 0) {
      const selectedChat = chatHistory.find(chat => chat.id === initialChatId);
      if (selectedChat) {
        setCurrentMessage({
          matchId: selectedChat.matchId,
          prompt: selectedChat.prompt,
          response: selectedChat.response,
        });
      }
    } else if (!initialChatId) {
      // New chat - clear current message
      setCurrentMessage(null);
    }
  }, [initialChatId, chatHistory]);

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

    // 초기 메시지 설정 (프롬프트만 표시)
    setCurrentMessage({
      prompt: prompt.trim(),
      response: '',
    });

    const currentPrompt = prompt.trim();
    setPrompt('');

    try {
      await arenaApi.createChatStream(
        currentPrompt,
        // onChunk: 실시간 충크 추가
        (chunk: string) => {
          setCurrentMessage(prev => prev ? {
            ...prev,
            response: prev.response + chunk
          } : null);
        },
        // onComplete: 완료 시 matchId 저장 및 히스토리 추가
        (matchId: number, promptText: string, fullResponse: string) => {
          setCurrentMessage({
            matchId: matchId.toString(),
            prompt: promptText,
            response: fullResponse,
          });

          if (onChatCreated) {
            onChatCreated(matchId.toString(), promptText, fullResponse);
          }

          setIsLoading(false);
        },
        // onError: 에러 처리
        (errorMsg: string) => {
          setError(errorMsg);
          setIsLoading(false);
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '응답 생성 실패');
      console.error('Failed to create chat:', err);
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!currentMessage || !currentMessage.matchId) return;

    // 게시글 작성 페이지로 이동 (로그인 체크)
    requireAuth(() => {
      if (onShareToDashboard) {
        onShareToDashboard(
          currentMessage.matchId!,
          currentMessage.prompt,
          currentMessage.response
        );
      }
    }, '게시글을 작성하려면 지갑을 연결해주세요');
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('복사되었습니다!');
    } catch (err) {
      toast.error('복사에 실패했습니다');
    }
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
          className="mt-1 shrink-0"
          title="게시글 작성하기"
        >
          <Share2 className="w-4 h-4" />
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
          <div className="flex-1 overflow-y-scroll scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {isLoading && !currentMessage.response ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#0052FF' }} />
                <span className="text-sm">AI가 답변을 생성하고 있습니다...</span>
              </div>
            ) : (
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
                  {currentMessage.response}
                </ReactMarkdown>
              </div>
            )}
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
