'use client';

import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Trophy, Loader2, X, Heart, Users, Clock } from 'lucide-react';
import { leaderboardApi, usersApi } from '../../lib/api';
import { PromptItem } from '../../lib/types';
import { WEEKLY_REWARD_INTERVAL_MS, WEEKLY_REWARD_LABEL } from '../../lib/constants';

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

interface LeaderboardPageProps {
  onSelectPost?: (postId: string) => void;
}

export function LeaderboardPage({ onSelectPost }: LeaderboardPageProps) {
  const [modelRankings, setModelRankings] = useState<ModelRanking[]>([]);
  const [userRankings, setUserRankings] = useState<UserRanking[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<{ nickname: string; posts: PromptItem[] } | null>(null);
  const [isLoadingUserPosts, setIsLoadingUserPosts] = useState(false);
  const [userPostsError, setUserPostsError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(WEEKLY_REWARD_INTERVAL_MS);

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

  // 주간 보상 카운트다운
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = WEEKLY_REWARD_INTERVAL_MS - (elapsed % WEEKLY_REWARD_INTERVAL_MS);
      setCountdown(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return '#0052FF';
  };

  const handleUserClick = async (walletAddress: string) => {
    setIsLoadingUserPosts(true);
    setSelectedUser(null);
    setUserPostsError(null);
    
    try {
      const sharedPrompts = await usersApi.getUserSharedPrompts(walletAddress, 'likes');
      const normalizedPosts: PromptItem[] = sharedPrompts.map((p) => ({
        ...p,
        id: p.id.toString(),
      }));
      setSelectedUser({ nickname: walletAddress, posts: normalizedPosts });
    } catch (err) {
      console.error('Failed to fetch user posts:', err);
      setUserPostsError('공유된 프롬프트를 불러오지 못했습니다.');
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
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-800">
          <Clock className="w-4 h-4 text-blue-600" />
          <span className="font-medium">{WEEKLY_REWARD_LABEL}:</span>
          <span className="font-semibold text-blue-900">{formatCountdown(countdown)}</span>
        </div>
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
            <p>Score = (likes × 10) + shared prompts count</p>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-4 mt-8">
        <Card className="p-4 border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1" style={{ borderColor: '#0052FF20', background: 'linear-gradient(135deg, #EEF5FF 0%, #FFFFFF 100%)' }}>
          <h3 className="text-sm mb-2 font-semibold" style={{ color: '#0052FF' }}>
            💡 모델 랭킹 산정
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Adoption Rate = 공유된 횟수 / 전체 응답 수 × 100, 동률일 때는 Posted(공유된 카드 수) 많은 순으로 정렬합니다.
          </p>
        </Card>
        
        <Card className="p-4 border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1" style={{ borderColor: '#0052FF20', background: 'linear-gradient(135deg, #EEF5FF 0%, #FFFFFF 100%)' }}>
          <h3 className="text-sm mb-2 font-semibold" style={{ color: '#0052FF' }}>
            ⭐ 유저 점수
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            총 점수 = 좋아요 수 × 10 + 공유된 프롬프트 개수. 좋아요를 많이 받을수록 점수가 빠르게 올라갑니다.
          </p>
        </Card>
        
        <Card className="p-4 border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1" style={{ borderColor: '#0052FF20', background: 'linear-gradient(135deg, #EEF5FF 0%, #FFFFFF 100%)' }}>
          <h3 className="text-sm mb-2 font-semibold" style={{ color: '#0052FF' }}>
            🏆 공유 프롬프트 보기
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            유저 지갑을 클릭하면 좋아요 많은 순으로 공유 기록을 볼 수 있고, 항목을 클릭하면 상세 대화 페이지로 이동합니다.
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
              ) : userPostsError ? (
                <div className="text-center py-12 text-red-600 text-sm">
                  {userPostsError}
                </div>
              ) : selectedUser && selectedUser.posts.length > 0 ? (
                <div className="space-y-4">
                  {selectedUser.posts.map((post, index) => (
                    <button
                      key={post.id}
                      onClick={() => {
                        if (onSelectPost) {
                          onSelectPost(post.id.toString());
                        }
                        setSelectedUser(null);
                      }}
                      className="w-full text-left p-5 rounded-lg border-2 hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

                          {/* Meta Info */}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                              {post.category}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" style={{ color: '#FF6B6B' }} />
                              {post.likes} 좋아요
                            </span>
                            <span className="text-blue-600">{post.modelName}</span>
                            <span className="text-gray-400">{post.modelProvider}</span>
                            <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
                          </div>
                        </div>
                      </div>
                    </button>
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
