import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { Copy, Maximize2, Loader2, Share2, ArrowLeft } from 'lucide-react';
import { arenaApi, promptsApi } from '../../lib/api';
import { env } from '../../lib/config';
import { useAuth } from '../hooks/useAuth';
import { usePayment } from '../hooks/usePayment';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { CodeBlock } from './CodeBlock';
const AUTH_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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
  initialChat?: { prompt: string; response: string; matchId?: string } | null;
  onChatCreated?: (matchId: string, prompt: string, response: string) => void;
  chatHistory?: ChatHistoryItem[];
  onShareToDashboard?: (sharedPromptId: string) => void;
  resetKey?: number;
}

export function HomePage({ onBack, initialChatId, initialChat, onChatCreated, chatHistory = [], onShareToDashboard, resetKey }: HomePageProps) {
  const { requireAuth, userAddress } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [currentMessage, setCurrentMessage] = useState<ChatMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharedPromptIds, setSharedPromptIds] = useState<Set<string>>(new Set());
  const { pendingPayment, setPendingPayment, status: paymentStatus, setStatus: setPaymentStatus, paymentAuth, setPaymentAuth, lastAuth, setLastAuth, lastAuthAddress, isWalletReady, approveForPayment, signForPayment, isAuthValidForAddress, handlePaymentError } = usePayment(userAddress || undefined);

  // 이번 결제 플로우에서 이미 approve를 완료했는지 추적
  const hasApprovedInFlowRef = useRef(false);
  // 결제 재시도 횟수 추적
  const paymentRetryCountRef = useRef(0);

  // 로컬 저장소에 공유된 matchId 기록
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('sharedPromptIds');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[];
        setSharedPromptIds(new Set(parsed));
      } catch (e) {
        console.error('Failed to load sharedPromptIds', e);
      }
    }
  }, []);

  // walletClient가 준비되면 대기 중인 결제 자동 처리
  const pendingApproveRef = useRef<{ payment: typeof pendingPayment; prompt: string } | null>(null);

  // handleSubmitWithPrompt의 최신 참조를 유지하는 ref (useEffect 의존성 문제 해결)
  const handleSubmitWithPromptRef = useRef<((promptText: string, isPaymentRetry: boolean, authPayload?: string | null) => Promise<void>) | null>(null);

  useEffect(() => {
    // walletClient가 준비되고, 대기 중인 결제가 있으면 자동 처리
    if (isWalletReady && pendingApproveRef.current && paymentStatus === 'requires_signature') {
      const { payment, prompt: pendingPrompt } = pendingApproveRef.current;
      pendingApproveRef.current = null;

      (async () => {
        setPaymentStatus('authorizing');
        try {
          await approveForPayment(payment);
          hasApprovedInFlowRef.current = true;
          const authPayloadSigned = await signForPayment(payment);
          setPaymentAuth(authPayloadSigned);
          setLastAuth(authPayloadSigned);
          setPendingPayment(null);
          // ref를 통해 최신 함수 호출
          await handleSubmitWithPromptRef.current?.(pendingPrompt, true, authPayloadSigned);
        } catch (err) {
          console.error('Auto approve failed:', err);
          setError(err instanceof Error ? err.message : '결제 승인 실패');
          setPaymentStatus('requires_signature');
          hasApprovedInFlowRef.current = false;
          paymentRetryCountRef.current = 0;
        }
      })();
    }
  }, [isWalletReady, paymentStatus, approveForPayment, signForPayment, setPaymentAuth, setLastAuth, setPendingPayment, setPaymentStatus]);

  // Load chat from history if initialChatId is provided
  useEffect(() => {
    if (initialChat) {
      setCurrentMessage({
        matchId: initialChat.matchId,
        prompt: initialChat.prompt,
        response: initialChat.response,
      });
      return;
    }
    if (initialChatId && chatHistory.length > 0) {
      const selectedChat = chatHistory.find(chat => chat.id === initialChatId);
      if (selectedChat) {
        setCurrentMessage({
          matchId: selectedChat.matchId,
          prompt: selectedChat.prompt,
          response: selectedChat.response,
        });
        return;
      }
    }
    if (!initialChatId && !initialChat) {
      setCurrentMessage(null);
    }
  }, [initialChatId, initialChat, chatHistory]);

  const markShared = (matchId: string) => {
    setSharedPromptIds(prev => {
      const next = new Set(prev);
      next.add(matchId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('sharedPromptIds', JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  const handleBackToHome = () => {
    setCurrentMessage(null);
    setPrompt('');
    setError(null);
    if (onBack) {
      onBack();
    }
  };

  // 외부에서 새로운 채팅 신호가 올 때 입력/상태 초기화
  useEffect(() => {
    if (resetKey !== undefined) {
      setPrompt('');
      setCurrentMessage(null);
      setError(null);
    }
  }, [resetKey]);

  const handleSubmitWithPrompt = useCallback(async (promptText: string, isPaymentRetry: boolean = false, authPayload?: string | null) => {
    if (!promptText.trim()) return;

    if (!userAddress) {
      const ok = requireAuth(() => {}, '지갑을 연결해주세요');
      if (!ok) return;
    }

    setIsLoading(true);
    setError(null);
    setPaymentStatus('processing');

    // 결제 재시도가 아닐 때만 상태 초기화
    if (!isPaymentRetry) {
      setPendingPayment(null);
      hasApprovedInFlowRef.current = false;
      paymentRetryCountRef.current = 0;
    }

    const currentPrompt = promptText.trim();
    
    // 프롬프트는 바로 비우되, 응답이 오기 전까지 currentMessage는 설정하지 않음 (402 시 화면 깜빡임 방지)
    if (!isPaymentRetry) {
      setPrompt('');
    }

    try {
      const parseAuthTs = (auth?: string | null) => {
        if (!auth) return 0;
        try {
          const raw = typeof window === 'undefined' ? Buffer.from(auth, 'base64').toString('utf8') : atob(auth);
          const parsed = JSON.parse(raw);
          return Number(parsed?.payload?.timestamp ?? parsed?.timestamp ?? 0);
        } catch {
          return 0;
        }
      };
      const isFresh = (auth?: string | null) => {
        const ts = parseAuthTs(auth);
        return ts > 0 && Date.now() - ts < AUTH_TTL_MS;
      };
      // auth가 현재 지갑 주소와 일치하고 유효한지 확인
      const isValidAuth = (auth?: string | null) => {
        return isFresh(auth) && isAuthValidForAddress(auth, userAddress);
      };
      // authPayload도 주소 검증 필요 (다른 지갑의 auth 사용 방지)
      const validAuthPayload = authPayload && isAuthValidForAddress(authPayload, userAddress) ? authPayload : null;
      const authForRequest =
        validAuthPayload ??
        (isValidAuth(paymentAuth)
          ? paymentAuth
          : isValidAuth(lastAuth)
            ? lastAuth
            : null);
      await arenaApi.createChatStream(
        currentPrompt,
        // onChunk: 실시간 충크 추가
        (chunk: string) => {
          setCurrentMessage(prev => {
            if (prev) return { ...prev, response: prev.response + chunk };
            return { prompt: currentPrompt, response: chunk };
          });
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
          setPaymentAuth(null);
          setPendingPayment(null);
          setLastAuth((paymentAuth ?? authPayload ?? lastAuth) || null);
          setPaymentStatus('idle');
        },
        // onError: 에러 처리
        (errorMsg: string) => {
          setError(errorMsg);
          setIsLoading(false);
          setPaymentStatus('idle');
        },
        authForRequest, // x402 auth payload
        userAddress || undefined
      );
    } catch (err: unknown) {
      // 에러에서 직접 payment 정보 추출 (상태 업데이트는 비동기이므로)
      const paymentErr = err as { name?: string; payment?: typeof pendingPayment; allowanceRequired?: boolean; reason?: string };
      const errorPayment = paymentErr?.payment ? { ...paymentErr.payment, prompt: currentPrompt, allowanceRequired: paymentErr.allowanceRequired, reason: paymentErr.reason } : null;
      const isAllowanceError = paymentErr?.allowanceRequired === true;

      const handled = handlePaymentError(err, currentPrompt, setPrompt, setCurrentMessage, setError, isPaymentRetry);
      if (handled && errorPayment) {
        // 자동 승인 후 재시도 시도 (에러에서 추출한 payment 사용)
        if (userAddress) {
          if (isWalletReady) {
            // walletClient가 준비되어 있으면 바로 처리
            try {
              setPaymentStatus('authorizing');

              // 이미 approve/서명을 완료한 상태에서 다시 402가 오면
              // 기존 서명으로 재시도 (새 서명 요청하지 않음)
              if (hasApprovedInFlowRef.current && authPayload) {
                paymentRetryCountRef.current += 1;
                const MAX_RETRIES = 3;

                if (paymentRetryCountRef.current > MAX_RETRIES) {
                  console.error('Max payment retries exceeded');
                  setError('결제 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
                  setPaymentStatus('idle');
                  setIsLoading(false);
                  hasApprovedInFlowRef.current = false;
                  paymentRetryCountRef.current = 0;
                  return;
                }

                // allowanceRequired 에러인 경우 블록체인 동기화를 위한 대기
                if (isAllowanceError) {
                  console.log(`Allowance sync delay detected. Waiting before retry (${paymentRetryCountRef.current}/${MAX_RETRIES})...`);
                  const delayMs = Math.min(2000 * Math.pow(2, paymentRetryCountRef.current - 1), 8000);
                  await new Promise(resolve => setTimeout(resolve, delayMs));
                } else {
                  // 다른 에러인 경우에도 짧은 대기 후 재시도
                  console.log(`Payment retry (${paymentRetryCountRef.current}/${MAX_RETRIES})...`);
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }

                // 기존 서명으로 재시도 (새 서명 요청하지 않음)
                await handleSubmitWithPrompt(currentPrompt, true, authPayload);
                return;
              }

              // 첫 번째 approve 시도
              await approveForPayment(errorPayment);
              hasApprovedInFlowRef.current = true;

              const authPayloadSigned = await signForPayment(errorPayment);
              setPaymentAuth(authPayloadSigned);
              setLastAuth(authPayloadSigned);
              setPendingPayment(null);
              await handleSubmitWithPrompt(currentPrompt, true, authPayloadSigned);
              return;
            } catch (signErr) {
              console.error('Auto sign failed:', signErr);
              setError(signErr instanceof Error ? signErr.message : '결제 승인 실패');
              setPaymentStatus('requires_signature');
              setIsLoading(false);
              hasApprovedInFlowRef.current = false;
              paymentRetryCountRef.current = 0;
              return;
            }
          } else {
            // walletClient가 준비되지 않았으면 대기열에 추가 (준비되면 자동 처리)
            console.log('Wallet not ready, queuing payment for auto-approval...');
            pendingApproveRef.current = { payment: errorPayment, prompt: currentPrompt };
          }
        }
        setIsLoading(false);
        setPaymentStatus('requires_signature');
        setPrompt(currentPrompt);
        setCurrentMessage(null);
        setLastAuth(null);
      } else if (handled) {
        // payment 정보가 없는 경우
        setIsLoading(false);
        setPaymentStatus('requires_signature');
        setPrompt(currentPrompt);
        setCurrentMessage(null);
        setLastAuth(null);
      } else {
        setError(err instanceof Error ? err.message : '응답 생성 실패');
        console.error('Failed to create chat:', err);
        setIsLoading(false);
        setPaymentStatus('idle');
        if (!isPaymentRetry) {
          setPrompt(currentPrompt);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveForPayment, handlePaymentError, isWalletReady, lastAuth, lastAuthAddress, paymentAuth, pendingPayment, requireAuth, setLastAuth, setPaymentAuth, setPaymentStatus, setPendingPayment, userAddress, onChatCreated]);

  // handleSubmitWithPrompt ref 업데이트 (useEffect 의존성 문제 해결)
  useEffect(() => {
    handleSubmitWithPromptRef.current = handleSubmitWithPrompt;
  }, [handleSubmitWithPrompt]);

  // 기존 handleSubmit은 현재 prompt 상태를 사용
  const handleSubmit = useCallback(async () => {
    await handleSubmitWithPrompt(prompt, false, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, handleSubmitWithPrompt]);

  const handleApprove = async () => {
    if (!pendingPayment || !pendingPayment.prompt) return;
    const pendingPrompt = pendingPayment.prompt;

    // 수동 승인 버튼 클릭 시 상태 초기화
    hasApprovedInFlowRef.current = false;
    paymentRetryCountRef.current = 0;

    if (!isWalletReady) {
      // walletClient가 준비되지 않았으면 대기열에 추가 (준비되면 자동 처리)
      console.log('Wallet not ready, queuing payment for auto-approval...');
      pendingApproveRef.current = { payment: pendingPayment, prompt: pendingPrompt };
      setPaymentStatus('authorizing'); // 로딩 상태 표시
      return;
    }

    requireAuth(async () => {
      setPaymentStatus('authorizing');
      try {
        await approveForPayment(pendingPayment);
        hasApprovedInFlowRef.current = true;
        const authPayloadSigned = await signForPayment(pendingPayment);
        setPaymentAuth(authPayloadSigned);
        setLastAuth(authPayloadSigned);
        setPendingPayment(null);
        await handleSubmitWithPrompt(pendingPrompt, true, authPayloadSigned);
      } catch (err) {
        console.error('Approve failed:', err);
        setError(err instanceof Error ? err.message : '결제 승인 실패');
        hasApprovedInFlowRef.current = false;
        paymentRetryCountRef.current = 0;
      } finally {
        setPaymentStatus('idle');
      }
    }, '지갑을 연결해주세요');
  };

  const handleShare = async () => {
    if (!currentMessage || !currentMessage.matchId) return;
    const matchId = currentMessage.matchId;

    const agreed = confirm('대화 내용에 개인정보가 포함되지 않았음을 확인했으며, 공개에 동의하시나요?');
    if (!agreed) return;

    if (sharedPromptIds.has(matchId)) {
      toast.error('이미 공유된 대화입니다', {
        description: '대시보드에서 확인하세요.',
      });
      return;
    }

    const toastId = toast.loading('게시글을 공유하고 있습니다...');
    requireAuth(async () => {
      try {
        setIsLoading(true);
        const wallet = userAddress || undefined;
        if (env.USE_MOCK_DATA) {
          const created = await promptsApi.sharePrompt(
            currentMessage.prompt,
            currentMessage.response,
            wallet,
            undefined,
            undefined
          );
          toast.success('게시글이 공유되었습니다!', {
            id: toastId,
            description: '대시보드에서 확인하세요.',
          });
          const newId = created.promptId?.toString?.() || '';
          markShared(matchId);
          onShareToDashboard?.(newId);
          return;
        }
        const result = await arenaApi.sharePrompt(Number(matchId), wallet);
        const sharedId = result.prompt?.id?.toString?.() || '';
        toast.success('게시글이 공유되었습니다!', {
          id: toastId,
          description: '대시보드에서 확인하세요.',
        });
        markShared(matchId);
        onShareToDashboard?.(sharedId);
      } catch (err) {
        toast.error('게시글 공유 실패', {
          id: toastId,
          description: err instanceof Error ? err.message : '다시 시도해주세요',
        });
        console.error('Failed to share prompt:', err);
      } finally {
        setIsLoading(false);
      }
    }, '게시글을 작성하려면 지갑을 연결해주세요');
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('복사되었습니다!');
    } catch (err) {
      toast.error('복사에 실패했습니다');
      console.error(err);
    }
  };

  // 메시지가 없을 때 - 초기 화면
  if (!currentMessage) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-16">
        {/* Payment Alert */}
        {pendingPayment && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm max-w-3xl w-full flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold flex items-center gap-2">
                💳 결제 승인 필요
              </p>
              <p className="mt-1 text-blue-600">
                {pendingPayment.message || 'AI 모델 사용을 위해 승인만 진행하면 됩니다.'}
                {pendingPayment.allowanceRequired && <span className="ml-1">(USDC 승인 부족)</span>}
              </p>
            </div>
          <Button 
            onClick={handleApprove} 
            disabled={paymentStatus === 'authorizing' || paymentStatus === 'processing'}
            className="whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white"
          >
            {paymentStatus === 'authorizing' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                승인 중...
              </>
            ) : (
                '결제 승인하기'
              )}
            </Button>
          </div>
        )}

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
                onClick={() => handleSubmit()}
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

      {/* Payment Alert - 채팅 화면에도 표시 */}
      {pendingPayment && !paymentAuth && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold flex items-center gap-2">
              💳 결제 승인 필요
            </p>
            <p className="mt-1 text-blue-600">
              {pendingPayment.message || 'AI 모델 사용을 위해 승인만 진행하면 됩니다.'}
              {pendingPayment.allowanceRequired && <span className="ml-1">(USDC 승인 부족)</span>}
            </p>
          </div>
          <Button 
            onClick={handleApprove} 
            disabled={paymentStatus === 'authorizing' || paymentStatus === 'processing'}
            className="whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white"
          >
            {paymentStatus === 'authorizing' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                승인 중...
              </>
            ) : (
              '결제 승인하기'
            )}
          </Button>
        </div>
      )}

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
          title={currentMessage?.matchId && sharedPromptIds.has(currentMessage.matchId) ? '이미 공유된 대화입니다' : '게시글 작성하기'}
          disabled={isLoading || !!(currentMessage?.matchId && sharedPromptIds.has(currentMessage.matchId))}
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
        <Card className="p-6 hover:shadow-xl transition-all duration-300 border-2 h-[800px] flex flex-col" style={{ borderColor: '#0052FF20' }}>
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
                    code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: ReactNode }) {
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
