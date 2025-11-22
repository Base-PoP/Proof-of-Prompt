'use client';

import { Card } from './ui/card';
import { Button } from './ui/button';
import { User, Award, BarChart3, Calendar, Wallet, Copy, ExternalLink, ArrowUpRight, ArrowDownRight, Coins, Gift } from 'lucide-react';
import { useState } from 'react';
import { useWallet } from '@/app/hooks/use-wallet';
import { base, baseSepolia } from 'viem/chains';
import { useDepositPool } from '@/app/hooks/use-deposit-pool';

export function ProfilePage() {
  const { isAuthenticated, address, user, chainId, login } = useWallet();
  const [activeTab, setActiveTab] = useState<'overview' | 'rewards'>('overview');
  
  // 예치 풀 컨트랙트 연동
  const {
    creditBalance,
    transactions: depositPoolTransactions,
    deposit,
    withdraw,
    isLoading: isDepositPoolLoading,
    isContractDeployed,
  } = useDepositPool();
  
  // 지갑 주소 포맷팅
  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // 체인 이름 가져오기
  const getChainName = () => {
    if (chainId === base.id) return 'Base Mainnet';
    if (chainId === baseSepolia.id) return 'Base Sepolia';
    return 'Unknown Network';
  };
  
  // Rewards data
  const [totalPoints] = useState(1250);
  const [claimablePoints] = useState(1000); // 클레임 가능한 포인트 (1000 이상)
  const CLAIM_THRESHOLD = 1000; // 클레임 가능한 최소 포인트
  const canClaim = claimablePoints >= CLAIM_THRESHOLD;

  const userStats = {
    username: user?.email?.address || (address ? formatAddress(address) : 'Guest User'),
    joinDate: '2024.01.15',
    totalVotes: 342,
    accuracy: 78,
    streak: 12,
    level: 5,
  };

  const recentVotes = [
    { id: 1, prompt: '안성맞춤의 반댓말은다?', winner: 'GPT-4', date: '2024.01.20' },
    { id: 2, prompt: 'Explain quantum computing', winner: 'Claude 3', date: '2024.01.19' },
    { id: 3, prompt: 'Write a haiku about AI', winner: 'Gemini Pro', date: '2024.01.18' },
  ];

  // 트랜잭션 히스토리 (컨트랙트 배포 전에는 빈 배열)
  const recentTransactions = isContractDeployed ? depositPoolTransactions : [];

  const rewardHistory = [
    { id: 1, type: 'vote', points: 10, description: '투표 완료', date: '2024.01.20' },
    { id: 2, type: 'vote', points: 10, description: '투표 완료', date: '2024.01.19' },
    { id: 3, type: 'streak', points: 50, description: '7일 연속 출석', date: '2024.01.18' },
    { id: 4, type: 'vote', points: 10, description: '투표 완료', date: '2024.01.17' },
    { id: 5, type: 'achievement', points: 100, description: '100회 투표 달성', date: '2024.01.15' },
  ];

  const handleClaimRewards = () => {
    // 클레임 로직 구현
    alert(`${claimablePoints} 포인트를 클레임했습니다!`);
    // 실제로는 백엔드 API 호출
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      alert('지갑 주소가 클립보드에 복사되었습니다!');
    }
  };

  const handleConnectWallet = () => {
    login();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Profile Header */}
      <Card className="p-8 mb-6 border-2 shadow-sm hover:shadow-md transition-shadow duration-200" style={{ borderColor: '#0052FF20' }}>
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl shadow-lg transition-transform hover:scale-105"
            style={{ backgroundColor: '#0052FF' }}
          >
            <User className="w-12 h-12" />
          </div>
          <div className="flex-1 w-full">
            <h1 className="text-2xl mb-2 font-semibold">{userStats.username}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Joined {userStats.joinDate}
              </span>
              <span className="flex items-center gap-1">
                <Award className="w-4 h-4" />
                Level {userStats.level}
              </span>
            </div>
            <Button className="transition-all hover:scale-105 active:scale-95" style={{ backgroundColor: '#0052FF' }}>
              Edit Profile
            </Button>
          </div>
        </div>
      </Card>

      {/* Credits & Wallet Section */}
      <Card className="p-6 mb-6 border-2 shadow-sm hover:shadow-md transition-shadow duration-200" style={{ borderColor: '#0052FF20' }}>
        <div className="flex items-center gap-2 mb-4">
          <Coins className="w-5 h-5" style={{ color: '#0052FF' }} />
          <h2 className="text-lg font-semibold">Credits & Transactions</h2>
        </div>

        {isAuthenticated && address ? (
          <div className="space-y-4">
            {/* Wallet Address */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#0052FF20' }}
                >
                  <Wallet className="w-5 h-5" style={{ color: '#0052FF' }} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Connected Wallet</p>
                  <p className="text-sm font-mono">{formatAddress(address)}</p>
                  {user?.email?.address && (
                    <p className="text-xs text-gray-500 mt-1">{user.email.address}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyAddress}
                  className="p-2 hover:bg-gray-200 rounded transition-colors"
                  title="Copy address"
                >
                  <Copy className="w-4 h-4 text-gray-600" />
                </button>
                <a
                  href={`https://basescan.org/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-gray-200 rounded transition-colors"
                  title="View on BaseScan"
                >
                  <ExternalLink className="w-4 h-4 text-gray-600" />
                </a>
              </div>
            </div>

            {/* Network Info */}
            <div className="p-4 bg-blue-50 rounded-lg border" style={{ borderColor: '#0052FF40' }}>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full bg-green-500 animate-pulse"
                />
                <p className="text-sm font-medium">
                  Connected to <span style={{ color: '#0052FF' }}>{getChainName()}</span>
                </p>
              </div>
            </div>

            {/* Credits Card */}
            <div className="p-6 rounded-lg border-2" style={{ borderColor: '#0052FF', background: 'linear-gradient(135deg, #EEF5FF 0%, #FFFFFF 100%)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#0052FF20' }}
                >
                  <Coins className="w-6 h-6" style={{ color: '#0052FF' }} />
                </div>
                <div>
                  <p className="text-xs text-gray-600">API Credits</p>
                  <p className="text-3xl font-bold" style={{ color: '#0052FF' }}>
                    {isContractDeployed ? (
                      isDepositPoolLoading ? 'Loading...' : `${creditBalance.toLocaleString()}`
                    ) : (
                      '--'
                    )}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                {isContractDeployed ? (
                  `≈ ${creditBalance} API calls remaining`
                ) : (
                  'Contract not deployed yet'
                )}
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  className="flex-1 flex items-center justify-center gap-1"
                  style={{ backgroundColor: '#0052FF' }}
                  disabled={!isContractDeployed}
                >
                  <ArrowDownRight className="w-4 h-4" />
                  Deposit ETH
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="flex-1 flex items-center justify-center gap-1"
                  disabled={!isContractDeployed}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Withdraw ETH
                </Button>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="mt-4">
              <h3 className="text-sm mb-3 font-semibold">Recent Transactions</h3>
              {isContractDeployed ? (
                recentTransactions.length > 0 ? (
                  <div className="space-y-2">
                    {recentTransactions.map((tx) => (
                      <div 
                        key={tx.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              tx.type === 'deposit' ? 'bg-green-100' : 
                              tx.type === 'withdraw' ? 'bg-orange-100' : 'bg-blue-100'
                            }`}
                          >
                            {tx.type === 'deposit' ? (
                              <ArrowDownRight className="w-4 h-4 text-green-600" />
                            ) : tx.type === 'withdraw' ? (
                              <ArrowUpRight className="w-4 h-4 text-orange-600" />
                            ) : (
                              <Coins className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm capitalize">{tx.type}</p>
                            <p className="text-xs text-gray-500">{tx.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {tx.type === 'usage' ? (
                            <p className="text-sm text-blue-600">
                              -{tx.credits} Credits
                            </p>
                          ) : (
                            <>
                              <p 
                                className={`text-sm ${
                                  tx.type === 'deposit' ? 'text-green-600' : 'text-orange-600'
                                }`}
                              >
                                {tx.type === 'deposit' ? '+' : '-'}{tx.amount} ETH
                              </p>
                              <p className="text-xs text-gray-500">
                                {tx.type === 'deposit' ? '+' : '-'}{tx.credits} Credits
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">No transactions yet</p>
                    <p className="text-xs text-gray-400 mt-1">Deposit ETH to get started</p>
                  </div>
                )
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Contract not deployed</p>
                  <p className="text-xs text-gray-400 mt-1">Waiting for deposit pool contract deployment</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: '#0052FF20' }}
            >
              <Wallet className="w-8 h-8" style={{ color: '#0052FF' }} />
            </div>
            <p className="text-gray-600 mb-4">Connect your wallet to start using Base Battle</p>
            <Button 
              onClick={handleConnectWallet}
              className="px-8"
              style={{ backgroundColor: '#0052FF' }}
            >
              Connect Wallet
            </Button>
          </div>
        )}
      </Card>

      {/* Tabs */}
      <Card className="p-6 mb-6 border-2 shadow-sm" style={{ borderColor: '#0052FF20' }}>
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            style={activeTab === 'overview' ? { borderColor: '#0052FF', color: '#0052FF' } : {}}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('rewards')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'rewards'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            style={activeTab === 'rewards' ? { borderColor: '#0052FF', color: '#0052FF' } : {}}
          >
            <Gift className="w-4 h-4" />
            Rewards
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-6 text-center border-2 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1" style={{ borderColor: '#0052FF20' }}>
                <div className="text-3xl mb-2 font-bold" style={{ color: '#0052FF' }}>
                  {userStats.totalVotes}
                </div>
                <div className="text-sm text-gray-600 font-medium">Total Votes</div>
              </Card>
              
              <Card className="p-6 text-center border-2 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1" style={{ borderColor: '#0052FF20' }}>
                <div className="text-3xl mb-2 font-bold" style={{ color: '#0052FF' }}>
                  {userStats.accuracy}%
                </div>
                <div className="text-sm text-gray-600 font-medium">Accuracy</div>
              </Card>
              
              <Card className="p-6 text-center border-2 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1" style={{ borderColor: '#0052FF20' }}>
                <div className="text-3xl mb-2 font-bold" style={{ color: '#0052FF' }}>
                  {userStats.streak}
                </div>
                <div className="text-sm text-gray-600 font-medium">Day Streak 🔥</div>
              </Card>
              
              <Card className="p-6 text-center border-2 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1" style={{ borderColor: '#0052FF20' }}>
                <div className="text-3xl mb-2 font-bold" style={{ color: '#0052FF' }}>
                  {userStats.level}
                </div>
                <div className="text-sm text-gray-600 font-medium">Level</div>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="p-6 border-2 shadow-sm hover:shadow-md transition-shadow duration-200" style={{ borderColor: '#0052FF20' }}>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5" style={{ color: '#0052FF' }} />
                <h2 className="text-lg font-semibold">Recent Voting History</h2>
              </div>
              
              <div className="space-y-3">
                {recentVotes.map((vote) => (
                  <div 
                    key={vote.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-blue-50/30 transition-all duration-150 hover:shadow-sm"
                  >
                    <div className="flex-1">
                      <p className="text-sm mb-1">{vote.prompt}</p>
                      <p className="text-xs text-gray-500">
                        Voted for: <span style={{ color: '#0052FF' }}>{vote.winner}</span>
                      </p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {vote.date}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Achievements Section */}
            <Card className="p-6 mt-6 border-2 shadow-sm hover:shadow-md transition-shadow duration-200" style={{ borderColor: '#0052FF20' }}>
              <h2 className="text-lg mb-4 flex items-center gap-2 font-semibold">
                <Award className="w-5 h-5" style={{ color: '#0052FF' }} />
                Achievements
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['First Vote', '10 Votes', '100 Votes', '7 Day Streak'].map((achievement, idx) => (
                  <div 
                    key={idx}
                    className="p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg text-center border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1"
                    style={{ borderColor: '#0052FF40' }}
                  >
                    <div className="text-2xl mb-2">🏆</div>
                    <div className="text-xs font-medium">{achievement}</div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {activeTab === 'rewards' && (
          <div className="space-y-6">
            {/* Points Overview */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-6 border-2 shadow-sm" style={{ borderColor: '#0052FF20', background: 'linear-gradient(135deg, #EEF5FF 0%, #FFFFFF 100%)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#0052FF20' }}
                  >
                    <Coins className="w-6 h-6" style={{ color: '#0052FF' }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total Points</p>
                    <p className="text-3xl font-bold" style={{ color: '#0052FF' }}>
                      {totalPoints.toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">누적된 모든 포인트</p>
              </Card>

              <Card className={`p-6 border-2 shadow-sm ${canClaim ? 'border-green-500' : ''}`} style={{ borderColor: canClaim ? '#10B981' : '#0052FF20', background: canClaim ? 'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 100%)' : 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${canClaim ? 'bg-green-100' : ''}`}
                    style={canClaim ? {} : { backgroundColor: '#0052FF20' }}
                  >
                    <Gift className={`w-6 h-6 ${canClaim ? 'text-green-600' : ''}`} style={canClaim ? {} : { color: '#0052FF' }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Claimable Points</p>
                    <p className={`text-3xl font-bold ${canClaim ? 'text-green-600' : ''}`} style={canClaim ? {} : { color: '#0052FF' }}>
                      {claimablePoints.toLocaleString()}
                    </p>
                  </div>
                </div>
                {canClaim ? (
                  <div>
                    <p className="text-xs text-green-600 mb-3 font-medium">클레임 가능합니다!</p>
                    <Button 
                      onClick={handleClaimRewards}
                      className="w-full"
                      style={{ backgroundColor: '#10B981' }}
                    >
                      Claim Rewards
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    {CLAIM_THRESHOLD - claimablePoints} 포인트 더 필요합니다
                  </p>
                )}
              </Card>
            </div>

            {/* Reward History */}
            <Card className="p-6 border-2 shadow-sm" style={{ borderColor: '#0052FF20' }}>
              <div className="flex items-center gap-2 mb-4">
                <Coins className="w-5 h-5" style={{ color: '#0052FF' }} />
                <h2 className="text-lg font-semibold">Reward History</h2>
              </div>
              
              <div className="space-y-3">
                {rewardHistory.map((reward) => (
                  <div 
                    key={reward.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-blue-50/30 transition-all duration-150 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#0052FF20' }}
                      >
                        <Coins className="w-5 h-5" style={{ color: '#0052FF' }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{reward.description}</p>
                        <p className="text-xs text-gray-500">{reward.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">
                        +{reward.points} P
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Info Card */}
            <Card className="p-6 border-2 shadow-sm" style={{ borderColor: '#0052FF20', background: 'linear-gradient(135deg, #EEF5FF 0%, #FFFFFF 100%)' }}>
              <h3 className="text-sm mb-2 font-semibold" style={{ color: '#0052FF' }}>
                💡 How Rewards Work
              </h3>
              <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                <li>투표 완료 시마다 10 포인트 획득</li>
                <li>연속 출석 보너스: 7일 연속 출석 시 50 포인트</li>
                <li>업적 달성 시 추가 포인트 획득</li>
                <li>{CLAIM_THRESHOLD.toLocaleString()} 포인트 이상 모이면 실제 자산으로 클레임 가능</li>
              </ul>
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
}

