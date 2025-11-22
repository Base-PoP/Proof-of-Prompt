'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { Copy, Maximize2 } from 'lucide-react';

type VoteOption = 'left' | 'right' | 'tie' | 'both-bad' | null;

interface Battle {
  prompt: string;
  responseA: string;
  responseB: string;
}

interface BattlePageProps {
  problem?: {
    id: string;
    title: string;
    description: string;
  };
}

export function BattlePage({ problem }: BattlePageProps) {
  const [currentBattle, setCurrentBattle] = useState<Battle>({
    prompt: problem?.title || '안성맞춤의 반댓말은다? 로직을 도입드립니까?',
    responseA: problem?.description || '안성맞춤의 반댓말은다? 로직을 도입드립니까? 😊',
    responseB: '안녕! 😊\n오늘 기분 어때요?'
  });
  const [selectedVote, setSelectedVote] = useState<VoteOption>(null);
  const [userPrompt, setUserPrompt] = useState('');

  const handleVote = (vote: VoteOption) => {
    setSelectedVote(vote);
    setTimeout(() => {
      setSelectedVote(null);
    }, 1000);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Current Prompt */}
      <div className="text-center mb-6">
        <p className="text-xl font-medium leading-relaxed">{currentBattle.prompt}</p>
      </div>

      {/* Battle Arena - Two Responses */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Assistant A */}
        <Card className="p-6 hover:shadow-xl transition-all duration-300 border-2 min-h-[400px] flex flex-col group" style={{ borderColor: '#0052FF20' }}>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Assistant A</h3>
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
          <div className="flex-1 overflow-y-auto min-h-[300px] whitespace-pre-wrap text-gray-700 leading-relaxed">
            {currentBattle.responseA}
          </div>
        </Card>

        {/* Assistant B */}
        <Card className="p-6 hover:shadow-xl transition-all duration-300 border-2 min-h-[400px] flex flex-col group" style={{ borderColor: '#0052FF20' }}>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Assistant B</h3>
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
          <div className="flex-1 overflow-y-auto min-h-[300px] whitespace-pre-wrap text-gray-700 leading-relaxed">
            {currentBattle.responseB}
          </div>
        </Card>
      </div>

      {/* Voting Buttons */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        <Button
          variant="outline"
          onClick={() => handleVote('left')}
          className={`px-6 transition-all duration-200 ${
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
          className={`px-6 transition-all duration-200 ${
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
          className={`px-6 transition-all duration-200 ${
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
          className={`px-6 transition-all duration-200 ${
            selectedVote === 'right' 
              ? 'bg-blue-50 border-2 shadow-md scale-105' 
              : 'hover:bg-gray-50 hover:shadow-sm'
          }`}
          style={selectedVote === 'right' ? { borderColor: '#0052FF' } : {}}
        >
          Right is Better →
        </Button>
      </div>

      {/* Prompt Input Section */}
      <div className="mb-4">
        <Card className="p-4 border-2 shadow-sm hover:shadow-md transition-shadow duration-200" style={{ borderColor: '#0052FF20' }}>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Textarea
              placeholder="Ask a question to compare AI responses..."
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="flex-1 min-h-[50px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  // Ctrl/Cmd + Enter to submit
                }
              }}
            />
            <Button 
              className="px-8 h-auto sm:h-10 transition-all hover:scale-105 active:scale-95"
              style={{ backgroundColor: '#0052FF' }}
            >
              Start Battle
            </Button>
          </div>
        </Card>
      </div>

      {/* Stats/Info Section */}
      <div className="text-center text-sm text-gray-500">
        <p>투표를 통해 더 나은 AI 응답을 선택해주세요! 🎯</p>
        <p className="mt-2">
          Powered by <span style={{ color: '#0052FF' }}>Base</span> blockchain
        </p>
      </div>
    </div>
  );
}

