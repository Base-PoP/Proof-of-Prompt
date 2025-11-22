'use client';

import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Trophy, TrendingUp, TrendingDown, Users, Loader2 } from 'lucide-react';
import { leaderboardApi } from '../../lib/api';

interface ModelRanking {
  rank: number;
  id: string;
  name: string;
  provider: string;
  rating: number;
  gamesPlayed: number;
}

interface UserRanking {
  rank: number;
  id: string;
  nickname: string;
  score: number;
}

export function LeaderboardPage() {
  const [modelRankings, setModelRankings] = useState<ModelRanking[]>([]);
  const [userRankings, setUserRankings] = useState<UserRanking[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboards = async () => {
      try {
        // Fetch model rankings
        setIsLoadingModels(true);
        const models = await leaderboardApi.getModels();
        setModelRankings(models);
      } catch (err) {
        console.error('Failed to fetch model rankings:', err);
        setError('Failed to load model rankings');
      } finally {
        setIsLoadingModels(false);
      }

      try {
        // Fetch user rankings
        setIsLoadingUsers(true);
        const users = await leaderboardApi.getUsers();
        setUserRankings(users);
      } catch (err) {
        console.error('Failed to fetch user rankings:', err);
        setError('Failed to load user rankings');
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchLeaderboards();
  }, []);

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

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Model Leaderboard */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-6 h-6" style={{ color: '#0052FF' }} />
            <h2 className="text-xl">Model Rankings</h2>
          </div>
          
          <div className="overflow-hidden border-2 shadow-sm flex flex-col bg-white rounded-xl" style={{ borderColor: '#0052FF20', height: '600px', minHeight: '600px', maxHeight: '600px' }}>
            <div className="overflow-x-auto flex-1" style={{ height: '100%', overflowY: 'auto' }}>
              {isLoadingModels ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0052FF' }} />
                </div>
              ) : modelRankings.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No model rankings available
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Model</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Elo</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Games</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {modelRankings.map((model) => (
                      <tr 
                        key={model.id}
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
                          <div>
                            <p className="text-sm font-medium">{model.name}</p>
                            <p className="text-xs text-gray-500">{model.provider}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold" style={{ color: '#0052FF' }}>
                            {model.rating}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs text-gray-500">
                            {model.gamesPlayed}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
            <h2 className="text-xl">User Rankings</h2>
          </div>
          
          <div className="overflow-hidden border-2 shadow-sm flex flex-col bg-white rounded-xl" style={{ borderColor: '#0052FF20', height: '600px', minHeight: '600px', maxHeight: '600px' }}>
            <div className="overflow-x-auto flex-1" style={{ height: '100%', overflowY: 'auto' }}>
              {isLoadingUsers ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0052FF' }} />
                </div>
              ) : userRankings.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No user rankings available
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">User</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {userRankings.map((user) => (
                      <tr 
                        key={user.id}
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
                          <p className="text-sm">{user.nickname}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm font-semibold" style={{ color: '#0052FF' }}>
                            {user.score.toLocaleString()}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          
          <div className="mt-3 text-center text-xs text-gray-500">
            <p>Based on voting participation</p>
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

