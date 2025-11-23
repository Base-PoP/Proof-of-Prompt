'use client';

import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Trophy, TrendingUp, TrendingDown, Users, Loader2, X, Gift, Heart } from 'lucide-react';
import { leaderboardApi, usersApi } from '../../lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ModelRanking {
  rank: number;
  id: number;
  name: string;
  provider: string;
  rating: number;
  totalMatches: number;
  postedMatches: number;
  adoptionRate: number;
}

interface UserRanking {
  rank: number;
  id: number;
  nickname: string;
  score: number;
  totalLikes: number;
  postsCount: number;
}

interface PopularPost {
  id: number;
  title: string;
  prompt: string;
  response: string;
  modelName: string;
  likes: number;
  createdAt: string;
  tags: string[];
}

export function LeaderboardPage() {
  const [modelRankings, setModelRankings] = useState<ModelRanking[]>([]);
  const [userRankings, setUserRankings] = useState<UserRanking[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<{ nickname: string; posts: PopularPost[] } | null>(null);
  const [isLoadingUserPosts, setIsLoadingUserPosts] = useState(false);

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

  const handleUserClick = async (walletAddress: string) => {
    setIsLoadingUserPosts(true);
    setSelectedUser(null);
    
    try {
      const profileData = await usersApi.getUserProfile(walletAddress);
      setSelectedUser({
        nickname: walletAddress,
        posts: profileData.popularPosts
      });
    } catch (err) {
      console.error('Failed to fetch user posts:', err);
    } finally {
      setIsLoadingUserPosts(false);
    }
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
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Adoption Rate</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Posted</th>
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
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-sm font-semibold" style={{ color: '#0052FF' }}>
                              {model.adoptionRate.toFixed(1)}%
                            </span>
                            <span className="text-xs text-gray-400">
                              {model.totalMatches} matches
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-medium text-gray-700">
                            {model.postedMatches}
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
            <p>Based on share rate: posts shared / total responses</p>
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
                          <div>
                            <button
                              onClick={() => handleUserClick(user.nickname)}
                              className="text-sm font-medium hover:underline text-left transition-colors"
                              style={{ color: '#0052FF' }}
                            >
                              {user.nickname}
                            </button>
                            <p className="text-xs text-gray-500">{user.postsCount} posts</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <p className="text-sm font-semibold" style={{ color: '#0052FF' }}>
                              {user.score.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-400">
                              {user.totalLikes} likes
                            </p>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          
          <div className="mt-3 text-center text-xs text-gray-500">
            <p>Based on total likes × 10</p>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-4 mt-8">
        <Card className="p-4 border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1" style={{ borderColor: '#0052FF20', background: 'linear-gradient(135deg, #EEF5FF 0%, #FFFFFF 100%)' }}>
          <h3 className="text-sm mb-2 font-semibold" style={{ color: '#0052FF' }}>
            💡 모델 순위 집계 방식
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            각 모델은 사용자들이 공유한 게시글의 좋아요 수를 기반으로 순위가 매겨집니다. 총 좋아요 수 × 10점으로 계산됩니다.
          </p>
        </Card>
        
        <Card className="p-4 border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1" style={{ borderColor: '#0052FF20', background: 'linear-gradient(135deg, #EEF5FF 0%, #FFFFFF 100%)' }}>
          <h3 className="text-sm mb-2 font-semibold" style={{ color: '#0052FF' }}>
            ⭐ 포인트 획득 방법
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            흥미로운 프롬프트와 답변을 공유하고, 다른 사용자들의 좋아요를 받으면 포인트를 획득할 수 있습니다.
          </p>
        </Card>
        
        <Card className="p-4 border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1" style={{ borderColor: '#0052FF20', background: 'linear-gradient(135deg, #EEF5FF 0%, #FFFFFF 100%)' }}>
          <h3 className="text-sm mb-2 font-semibold" style={{ color: '#0052FF' }}>
            🏆 순위 상승 팁
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            꾸준한 참여와 양질의 콘텐츠 공유를 통해 리더보드 순위를 올릴 수 있습니다. 상위권 유저는 특별 뱃지를 획득합니다!
          </p>
        </Card>
      </div>

      <div className="mt-6 text-center text-sm text-gray-500">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
      </div>

      {/* User Posts Modal */}
      {(selectedUser || isLoadingUserPosts) && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#0052FF20' }}>
              <div>
                <h2 className="text-xl font-semibold mb-1" style={{ color: '#0052FF' }}>
                  인기 공유 프롬프트
                </h2>
                {selectedUser && (
                  <p className="text-sm text-gray-600">
                    {selectedUser.nickname.slice(0, 6)}...{selectedUser.nickname.slice(-4)}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
              {isLoadingUserPosts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0052FF' }} />
                </div>
              ) : selectedUser && selectedUser.posts.length > 0 ? (
                <div className="space-y-4">
                  {selectedUser.posts.map((post, index) => (
                    <div
                      key={post.id}
                      className="p-5 rounded-lg border-2 hover:shadow-md transition-all duration-150"
                      style={{ borderColor: '#0052FF20' }}
                    >
                      {/* Rank Badge */}
                      <div className="flex items-start gap-4 mb-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0"
                          style={{
                            backgroundColor:
                              index === 0
                                ? '#FFD700'
                                : index === 1
                                ? '#C0C0C0'
                                : index === 2
                                ? '#CD7F32'
                                : '#0052FF',
                          }}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold mb-2">{post.title}</h3>
                          <p className="text-sm text-gray-700 mb-3 line-clamp-2">{post.prompt}</p>
                          
                          {/* Tags */}
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {post.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 text-xs rounded-full"
                                  style={{
                                    backgroundColor: '#EEF5FF',
                                    color: '#0052FF',
                                  }}
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Meta Info */}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" style={{ color: '#FF6B6B' }} />
                              {post.likes} 좋아요
                            </span>
                            <span className="text-blue-600">{post.modelName}</span>
                            <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500 mb-2">
                    아직 공유한 프롬프트가 없습니다
                  </p>
                  <p className="text-xs text-gray-400">
                    첫 프롬프트를 공유하고 좋아요를 받아보세요!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
