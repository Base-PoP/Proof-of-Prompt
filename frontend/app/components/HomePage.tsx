'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { Copy, Maximize2, Loader2 } from 'lucide-react';
import { arenaApi } from '../../lib/api';
import { usePrivy } from '@privy-io/react-auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type VoteOption = 'left' | 'right' | 'tie' | 'both-bad' | null;

interface Battle {
  matchId?: string;
  prompt: string;
  responseA: string;
  responseB: string;
  modelAId?: string;
  modelBId?: string;
}

interface HomePageProps {
  onStartBattle?: (prompt: string) => void;
}

export function HomePage({ onStartBattle }: HomePageProps) {
  const { user } = usePrivy();
  const [prompt, setPrompt] = useState('');
  const [currentBattle, setCurrentBattle] = useState<Battle | null>(null);
  const [selectedVote, setSelectedVote] = useState<VoteOption>(null);
  const [refChoice, setRefChoice] = useState<'A' | 'B' | 'TIE' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const userId = user?.wallet?.address;
      const match = await arenaApi.createMatch(prompt, userId);
      
      setCurrentBattle({
        matchId: match.matchId,
        prompt: match.prompt,
        responseA: match.responseA,
        responseB: match.responseB,
        modelAId: match.modelAId,
        modelBId: match.modelBId,
      });
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '매치 생성 실패');
      console.error('Failed to create match:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (vote: VoteOption) => {
    if (!currentBattle?.matchId || !vote) return;

    setSelectedVote(vote);
    setIsVoting(true);
    setError(null);

    try {
      const userId = user?.wallet?.address;
      let chosen: 'A' | 'B' | 'TIE';
      
      if (vote === 'left') chosen = 'A';
      else if (vote === 'right') chosen = 'B';
      else chosen = 'TIE';

      const result = await arenaApi.vote(currentBattle.matchId, chosen, userId);
      
      console.log('투표 결과:', result);
      
      if (result.ok) {
        setRefChoice(result.refChoice as 'A' | 'B' | 'TIE');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '투표 실패');
      console.error('Failed to vote:', err);
      setSelectedVote(null);
    } finally {
      setIsVoting(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // 배틀이 없을 때 - 초기 화면
  if (!currentBattle) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm max-w-3xl w-full">
            {error}
          </div>
        )}

        {/* Main Title */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4" style={{ color: '#0052FF' }}>
            Find the best AI for you
          </h1>
          <p className="text-lg text-gray-600">
            Compare answers across top AI models, share your feedback and power our public{' '}
            <span className="text-blue-600 cursor-pointer hover:underline">leaderboard</span>
          </p>
        </div>

        {/* AI Model Icons */}
        <div className="flex gap-3 mb-8">
          {['🤖', '🧠', '💡', '⚡', '🎯', '🔮', '✨', '🎨'].map((icon, i) => (
            <div
              key={i}
              className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-2xl hover:scale-110 transition-transform"
            >
              {icon}
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="w-full max-w-3xl">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <Textarea
              placeholder="Ask anything..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full min-h-[120px] border-none focus:ring-0 text-lg resize-none"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSubmit();
                }
              }}
            />
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <span className="text-xl">➕</span>
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <span className="text-xl">🌐</span>
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <span className="text-xl">🖼️</span>
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <span className="text-xl">💻</span>
                </button>
              </div>
              
              <Button
                onClick={handleSubmit}
                disabled={!prompt.trim() || isLoading}
                className="rounded-full px-6"
                style={{ backgroundColor: '#0052FF' }}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="text-base font-semibold">Battle!</span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Powered by{' '}
            <span className="font-semibold" style={{ color: '#0052FF' }}>
              Base
            </span>{' '}
            blockchain 🎯
          </p>
        </div>
      </div>
    );
  }

  // 배틀 화면
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Current Prompt - Message Bubble */}
      <div className="flex justify-end mb-6">
        <div className="max-w-2xl bg-white border border-gray-200 rounded-2xl px-5 py-3 shadow-sm">
          <p className="text-base text-gray-800 leading-relaxed">{currentBattle.prompt}</p>
        </div>
      </div>

      {/* Battle Arena - Two Responses */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Assistant A */}
        <Card className={`p-6 hover:shadow-xl transition-all duration-300 border-2 max-h-[600px] flex flex-col group ${
          refChoice === 'A' ? 'ring-2 ring-blue-500' : ''
        }`} style={{ borderColor: refChoice === 'A' ? '#0052FF' : '#0052FF20' }}>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-700">Assistant A</h3>
              {refChoice === 'A' && (
                <span className="px-2 py-1 text-xs font-semibold rounded-full" style={{ backgroundColor: '#0052FF', color: 'white' }}>
                  AI 선택 ✨
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleCopy(currentBattle.responseA)}
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
          <div className="flex-1 overflow-y-auto whitespace-pre-wrap text-gray-700 leading-relaxed prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {currentBattle.responseA}
            </ReactMarkdown>
          </div>
        </Card>

        {/* Assistant B */}
        <Card className={`p-6 hover:shadow-xl transition-all duration-300 border-2 max-h-[600px] flex flex-col group ${
          refChoice === 'B' ? 'ring-2 ring-blue-500' : ''
        }`} style={{ borderColor: refChoice === 'B' ? '#0052FF' : '#0052FF20' }}>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-700">Assistant B</h3>
              {refChoice === 'B' && (
                <span className="px-2 py-1 text-xs font-semibold rounded-full" style={{ backgroundColor: '#0052FF', color: 'white' }}>
                  AI 선택 ✨
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleCopy(currentBattle.responseB)}
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
          <div className="flex-1 overflow-y-auto whitespace-pre-wrap text-gray-700 leading-relaxed prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {currentBattle.responseB}
            </ReactMarkdown>
          </div>
        </Card>
      </div>

      {/* Voting Buttons */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        <Button
          variant="outline"
          onClick={() => handleVote('left')}
          disabled={isVoting || refChoice !== null}
          className={`px-6 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            selectedVote === 'left' 
              ? 'bg-blue-50 border-2 shadow-md scale-105' 
              : 'hover:bg-gray-50 hover:shadow-sm'
          }`}
          style={selectedVote === 'left' ? { borderColor: '#0052FF' } : {}}
        >
          ← Left is Better
        </Button>
        <Button
          variant="outline"
          onClick={() => handleVote('tie')}
          disabled={isVoting || refChoice !== null}
          className={`px-6 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            selectedVote === 'tie' 
              ? 'bg-blue-50 border-2 shadow-md scale-105' 
              : 'hover:bg-gray-50 hover:shadow-sm'
          }`}
          style={selectedVote === 'tie' ? { borderColor: '#0052FF' } : {}}
        >
          It&apos;s a tie 🤝
        </Button>
        <Button
          variant="outline"
          onClick={() => handleVote('both-bad')}
          disabled={isVoting || refChoice !== null}
          className={`px-6 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            selectedVote === 'both-bad' 
              ? 'bg-blue-50 border-2 shadow-md scale-105' 
              : 'hover:bg-gray-50 hover:shadow-sm'
          }`}
          style={selectedVote === 'both-bad' ? { borderColor: '#0052FF' } : {}}
        >
          Both are bad ⚠️
        </Button>
        <Button
          variant="outline"
          onClick={() => handleVote('right')}
          disabled={isVoting || refChoice !== null}
          className={`px-6 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            selectedVote === 'right' 
              ? 'bg-blue-50 border-2 shadow-md scale-105' 
              : 'hover:bg-gray-50 hover:shadow-sm'
          }`}
          style={selectedVote === 'right' ? { borderColor: '#0052FF' } : {}}
        >
          Right is Better →
        </Button>
      </div>

      {/* New Prompt Input */}
      <div className="mt-8">
        <Card className="p-4 border-2 shadow-sm hover:shadow-md transition-shadow duration-200" style={{ borderColor: '#0052FF20' }}>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Textarea
              placeholder="다음 배틀을 시작하려면 새로운 질문을 입력하세요..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="flex-1 min-h-[50px] resize-none"
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
        <p>투표를 통해 더 나은 AI 응답을 선택해주세요! 🎯</p>
        <p className="mt-2">
          Powered by <span style={{ color: '#0052FF' }}>Base</span> blockchain
        </p>
      </div>
    </div>
  );
}
