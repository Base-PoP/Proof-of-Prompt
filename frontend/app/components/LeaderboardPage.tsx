'use client';

import { Card } from './ui/card';
import { Trophy, TrendingUp, TrendingDown, Users, Zap } from 'lucide-react';

interface ModelRanking {
  rank: number;
  name: string;
  score: number;
  votes: number;
  change: number;
}

interface UserRanking {
  rank: number;
  username: string;
  score: number;
  promptsSubmitted: number;
  qualityRating: number;
  change: number;
}

export function LeaderboardPage() {
  const modelRankings: ModelRanking[] = [
    { rank: 1, name: 'GPT-4', score: 1285, votes: 15420, change: 2 },
    { rank: 2, name: 'Claude 3 Opus', score: 1268, votes: 14850, change: 1 },
    { rank: 3, name: 'Gemini Pro', score: 1242, votes: 13920, change: -1 },
    { rank: 4, name: 'Claude 3 Sonnet', score: 1215, votes: 12580, change: 0 },
    { rank: 5, name: 'GPT-3.5 Turbo', score: 1198, votes: 11340, change: -2 },
    { rank: 6, name: 'Llama 3', score: 1175, votes: 10230, change: 3 },
    { rank: 7, name: 'Mistral Large', score: 1156, votes: 9850, change: 1 },
    { rank: 8, name: 'Claude 3 Haiku', score: 1142, votes: 8920, change: -1 },
  ];

  const userRankings: UserRanking[] = [
    { rank: 1, username: 'PromptMaster', score: 8542, promptsSubmitted: 234, qualityRating: 9.2, change: 0 },
    { rank: 2, username: 'AIWhisperer', score: 8125, promptsSubmitted: 198, qualityRating: 9.0, change: 2 },
    { rank: 3, username: 'BaseBuilder', score: 7890, promptsSubmitted: 215, qualityRating: 8.8, change: -1 },
    { rank: 4, username: 'QueryQueen', score: 7654, promptsSubmitted: 187, qualityRating: 8.7, change: 1 },
    { rank: 5, username: 'PromptNinja', score: 7432, promptsSubmitted: 176, qualityRating: 8.5, change: -2 },
    { rank: 6, username: 'CodeCrafter', score: 7215, promptsSubmitted: 165, qualityRating: 8.4, change: 0 },
    { rank: 7, username: 'AIEnthusiast', score: 6998, promptsSubmitted: 154, qualityRating: 8.2, change: 3 },
    { rank: 8, username: 'BaseChamp', score: 6742, promptsSubmitted: 142, qualityRating: 8.0, change: 1 },
  ];

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return '#0052FF';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl mb-2" style={{ color: '#0052FF' }}>
          🏆 Leaderboards
        </h1>
        <p className="text-gray-600">
          Top models and prompt creators in the Base Battle arena
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Model Leaderboard */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-6 h-6" style={{ color: '#0052FF' }} />
            <h2 className="text-xl">Model Rankings</h2>
          </div>
          
          <div className="overflow-hidden border-2 shadow-sm flex flex-col bg-white rounded-xl" style={{ borderColor: '#0052FF20', height: '600px', minHeight: '600px', maxHeight: '600px' }}>
            <div className="overflow-x-auto flex-1" style={{ height: '100%', overflowY: 'auto' }}>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Model</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Elo</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Δ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {modelRankings.map((model) => (
                    <tr 
                      key={model.rank}
                      className="hover:bg-blue-50/30 transition-colors duration-150 border-l-4 border-transparent hover:border-gray-200"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {model.rank <= 3 && (
                            <Trophy 
                              className="w-4 h-4" 
                              style={{ color: getRankColor(model.rank) }}
                            />
                          )}
                          <span 
                            className="text-sm"
                            style={{ 
                              color: model.rank <= 3 ? getRankColor(model.rank) : '#000',
                              fontWeight: model.rank <= 3 ? '600' : '400'
                            }}
                          >
                            #{model.rank}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{model.name}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm" style={{ color: '#0052FF' }}>
                          {model.score}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {model.change > 0 ? (
                            <>
                              <TrendingUp className="w-3 h-3 text-green-600" />
                              <span className="text-xs text-green-600">+{model.change}</span>
                            </>
                          ) : model.change < 0 ? (
                            <>
                              <TrendingDown className="w-3 h-3 text-red-600" />
                              <span className="text-xs text-red-600">{model.change}</span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mt-3 text-center text-xs text-gray-500">
            <p>Based on head-to-head battle results</p>
          </div>
        </div>

        {/* User Leaderboard */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-6 h-6" style={{ color: '#0052FF' }} />
            <h2 className="text-xl">Prompt Creator Rankings</h2>
          </div>
          
          <div className="overflow-hidden border-2 shadow-sm flex flex-col bg-white rounded-xl" style={{ borderColor: '#0052FF20', height: '600px', minHeight: '600px', maxHeight: '600px' }}>
            <div className="overflow-x-auto flex-1" style={{ height: '100%', overflowY: 'auto' }}>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Score</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Δ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {userRankings.map((user) => (
                    <tr 
                      key={user.rank}
                      className="hover:bg-blue-50/30 transition-colors duration-150 border-l-4 border-transparent hover:border-gray-200"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {user.rank <= 3 && (
                            <Trophy 
                              className="w-4 h-4" 
                              style={{ color: getRankColor(user.rank) }}
                            />
                          )}
                          <span 
                            className="text-sm"
                            style={{ 
                              color: user.rank <= 3 ? getRankColor(user.rank) : '#000',
                              fontWeight: user.rank <= 3 ? '600' : '400'
                            }}
                          >
                            #{user.rank}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm">{user.username}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Zap className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs text-gray-500">
                              {user.qualityRating}/10 quality
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div>
                          <p className="text-sm" style={{ color: '#0052FF' }}>
                            {user.score.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {user.promptsSubmitted} prompts
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {user.change > 0 ? (
                            <>
                              <TrendingUp className="w-3 h-3 text-green-600" />
                              <span className="text-xs text-green-600">+{user.change}</span>
                            </>
                          ) : user.change < 0 ? (
                            <>
                              <TrendingDown className="w-3 h-3 text-red-600" />
                              <span className="text-xs text-red-600">{user.change}</span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mt-3 text-center text-xs text-gray-500">
            <p>Based on prompt quality and community engagement</p>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-4 mt-8">
        <Card className="p-4 border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1" style={{ borderColor: '#0052FF20', background: 'linear-gradient(135deg, #EEF5FF 0%, #FFFFFF 100%)' }}>
          <h3 className="text-sm mb-2 font-semibold" style={{ color: '#0052FF' }}>
            💡 How Model Rankings Work
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Models compete in head-to-head battles. Rankings are calculated using the Elo rating system based on user votes.
          </p>
        </Card>
        
        <Card className="p-4 border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1" style={{ borderColor: '#0052FF20', background: 'linear-gradient(135deg, #EEF5FF 0%, #FFFFFF 100%)' }}>
          <h3 className="text-sm mb-2 font-semibold" style={{ color: '#0052FF' }}>
            ⭐ Earn Points as a Creator
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Submit high-quality prompts that generate interesting battles. Points are awarded based on engagement and quality ratings.
          </p>
        </Card>
        
        <Card className="p-4 border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1" style={{ borderColor: '#0052FF20', background: 'linear-gradient(135deg, #EEF5FF 0%, #FFFFFF 100%)' }}>
          <h3 className="text-sm mb-2 font-semibold" style={{ color: '#0052FF' }}>
            🏆 Climb the Ranks
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Consistent participation and quality contributions help you climb both leaderboards. Top users earn special badges!
          </p>
        </Card>
      </div>

      <div className="mt-6 text-center text-sm text-gray-500">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}

