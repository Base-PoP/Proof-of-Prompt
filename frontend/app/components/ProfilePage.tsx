"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { usersApi } from "@/lib/api";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import {
  User,
  Calendar,
  Award,
  Wallet,
  Copy,
  ExternalLink,
  Coins,
  Gift,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { USDC_ADDRESS, USDC_ABI } from "@/lib/contracts/usdc-config";

interface UserStats {
  totalPrompts: number;
  totalLikes: number;
  score: number;
  level: number;
}

interface SharedPost {
  id: string;
  title: string;
  prompt: string;
  response: string;
  modelName: string;
  likes: number;
  createdAt: string;
  tags: string[];
}

import { Progress } from "@/app/components/ui/progress";
import { AchievementItem } from "@/lib/types";

export function ProfilePage() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "achievements">("overview");
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [popularPrompts, setPopularPrompts] = useState<SharedPost[]>([]);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [joinDate, setJoinDate] = useState<string>("");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(false);

  const {
    login,
    isAuthenticated,
    user,
    userAddress: address,
    ready,
  } = useAuth();

  // Fetch user profile from backend
  useEffect(() => {
    const fetchProfile = async () => {
      if (!address || !isAuthenticated) {
        setIsLoadingProfile(false);
        return;
      }

      try {
        setIsLoadingProfile(true);
        const profile = await usersApi.getUserProfile(address);
        setUserStats(profile.stats);
        const normalizedPrompts: SharedPost[] = profile.popularPrompts.map((p) => ({
          id: p.id.toString(),
          title: p.title || 'Untitled',
          prompt: p.prompt,
          response: p.response,
          modelName: p.modelName || 'Unknown model',
          likes: p.likes ?? 0,
          createdAt: p.createdAt,
          tags: Array.isArray((p as SharedPost).tags) ? (p as SharedPost).tags : [],
        }));
        setPopularPrompts(normalizedPrompts);
        setJoinDate(new Date(profile.user.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' }));
        
        // Fetch achievements
        setIsLoadingAchievements(true);
        const fetchedAchievements = await usersApi.getAchievements(address);
        setAchievements(fetchedAchievements);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        toast.error('프로필을 불러오지 못했습니다');
      } finally {
        setIsLoadingProfile(false);
        setIsLoadingAchievements(false);
      }
    };

    fetchProfile();
  }, [address, isAuthenticated]);

  // Read USDC balance from Base Sepolia
  const { data: usdcBalance, isLoading: isLoadingBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address && isAuthenticated,
    },
  });

  // Format USDC balance (6 decimals for USDC)
  const formattedUsdcBalance = usdcBalance
    ? parseFloat(formatUnits(usdcBalance as bigint, 6)).toFixed(2)
    : "0.00";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleConnectWallet = () => {
    login();
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("주소가 클립보드에 복사되었습니다!");
    }
  };

  const getChainName = () => {
    return "Base";
  };

  const handleClaim = async (achievementId: string) => {
    if (!address) return;
    setClaimingId(achievementId);
    try {
      const result = await usersApi.claimAchievement(address, achievementId);
      if (result.ok) {
        setAchievements((prev) =>
          prev.map((a) =>
            a.id === achievementId ? { ...a, claimed: true } : a
          )
        );
        toast.success('업적을 클레임했습니다.');
      }
    } catch (err) {
      console.error('Failed to claim achievement:', err);
      toast.error('클레임에 실패했습니다.');
    } finally {
      setClaimingId(null);
    }
  };

  if (!isMounted) {
    return null;
  }

  // Privy 로딩 중
  if (!ready) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2
            className="w-12 h-12 animate-spin mb-4"
            style={{ color: "#0052FF" }}
          />
          <p className="text-gray-600">프로필을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: "#0052FF" }}>
          Profile
        </h1>
        <p className="text-gray-600 mt-2">Manage your account and wallet</p>
      </div>

      {/* Main Profile Card */}
      <Card
        className="p-8 mb-6 border-2 shadow-sm hover:shadow-md transition-shadow duration-200"
        style={{ borderColor: "#0052FF20" }}
      >
        <div className="flex flex-col lg:grid lg:grid-cols-2 items-start gap-6">
          {/* Left Column: User Profile Info */}
          <div className="flex flex-col items-start gap-6">
            <div className="flex items-start gap-4 w-full">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl shadow-lg transition-transform hover:scale-105"
                style={{ backgroundColor: "#0052FF" }}
              >
                <User className="w-12 h-12" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl mb-2 font-semibold">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Joined {joinDate || 'Loading...'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    Level {userStats?.level || 1}
                  </span>
                </div>
                <Button
                  className="transition-all hover:scale-105 active:scale-95"
                  style={{ backgroundColor: "#0052FF" }}
                >
                  Edit Profile
                </Button>
                
                {/* Experience Bar */}
                <div className="mt-4 w-full max-w-[240px]">
                  <div className="flex justify-between text-xs mb-1.5 font-medium text-gray-600">
                    <span className="flex items-center gap-1">
                      <Award className="w-3 h-3 text-blue-600" /> XP
                    </span>
                    <span className="text-blue-600">
                      {userStats?.score || 0} <span className="text-gray-400">/ 100</span>
                    </span>
                  </div>
                  <Progress 
                    value={userStats?.score ? userStats.score % 100 : 0} 
                    className="h-2.5 bg-blue-50" 
                    indicatorColor="#0052FF"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 text-right">
                    Next Level: {100 - ((userStats?.score || 0) % 100)} XP needed
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Wallet Info */}
          <div className="w-full lg:pl-6 lg:border-l lg:border-gray-100">
            {isAuthenticated && address ? (
              <div className="space-y-4">
                {/* Wallet Address */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Connected Wallet</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-mono">
                      {formatAddress(address)}
                    </p>
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
                  {user?.email?.address && (
                    <p className="text-xs text-gray-500 mt-1">
                      {user.email.address}
                    </p>
                  )}
                </div>

                {/* Network Info */}
                <div
                  className="p-4 bg-blue-50 rounded-lg border"
                  style={{ borderColor: "#0052FF40" }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-sm font-medium">
                      Connected to{" "}
                      <span style={{ color: "#0052FF" }}>{getChainName()}</span>
                    </p>
                  </div>
                </div>

                {/* USDC Balance Card */}
                <div
                  className="p-6 rounded-lg border-2"
                  style={{
                    borderColor: "#0052FF",
                    background:
                      "linear-gradient(135deg, #EEF5FF 0%, #FFFFFF 100%)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#0052FF20" }}
                    >
                      <Coins className="w-6 h-6" style={{ color: "#0052FF" }} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">USDC Balance</p>
                      <p
                        className="text-3xl font-bold"
                        style={{ color: "#0052FF" }}
                      >
                        {isLoadingBalance ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span className="text-xl">Loading...</span>
                          </span>
                        ) : (
                          `${formattedUsdcBalance} USDC`
                        )}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Your current USDC balance on {getChainName()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: "#0052FF20" }}
                >
                  <Wallet className="w-8 h-8" style={{ color: "#0052FF" }} />
                </div>
                <p className="text-gray-600 mb-4">
                  Connect your wallet to manage your profile
                </p>
                <Button
                  onClick={handleConnectWallet}
                  className="px-8"
                  style={{ backgroundColor: "#0052FF" }}
                >
                  Connect Wallet
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Card
        className="p-6 mb-6 border-2 shadow-sm"
        style={{ borderColor: "#0052FF20" }}
      >
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "overview"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            style={
              activeTab === "overview"
                ? { borderColor: "#0052FF", color: "#0052FF" }
                : {}
            }
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("achievements")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "achievements"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            style={
              activeTab === "achievements"
                ? { borderColor: "#0052FF", color: "#0052FF" }
                : {}
            }
          >
            Achievements
          </button>
        </div>

        {activeTab === "achievements" && (
          <div className="grid gap-4">
            {isLoadingAchievements ? (
              <div className="flex items-center justify-center py-12 text-gray-500">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                업적을 불러오는 중...
              </div>
            ) : achievements.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                아직 달성한 업적이 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`p-4 border rounded-xl h-full flex flex-col gap-3 shadow-sm ${
                      achievement.achievedAt ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        achievement.achievedAt ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'
                      }`}>
                        <Award className="w-6 h-6" />
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {achievement.rarity && (
                          <span className="px-2 py-1 rounded-full bg-white/60 text-gray-700 border border-gray-200">
                            {achievement.rarity}
                          </span>
                        )}
                        {achievement.exp !== undefined && (
                          <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                            +{achievement.exp} XP
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold mb-1 ${achievement.achievedAt ? 'text-gray-900' : 'text-gray-500'}`}>
                        {achievement.title}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{achievement.description}</p>
                      {achievement.progress && (
                        <p className="text-xs text-gray-500 mt-1">
                          {achievement.progress.current} / {achievement.progress.target}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {achievement.achievedAt
                          ? new Date(achievement.achievedAt).toLocaleDateString('ko-KR')
                          : '미달성'}
                      </span>
                      {achievement.achievedAt && (
                        achievement.claimed ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                            Claimed
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={claimingId === achievement.id}
                            onClick={() => handleClaim(achievement.id)}
                          >
                            {claimingId === achievement.id ? 'Claiming...' : 'Claim'}
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "overview" && (
          <>
            {/* Stats Grid */}
            {isLoadingProfile ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0052FF' }} />
              </div>
            ) : !userStats ? (
              <div className="text-center py-12 text-gray-500">
                프로필 데이터를 불러오지 못했습니다
              </div>
            ) : (
              <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card
                className="p-6 text-center border-2 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1"
                style={{ borderColor: "#0052FF20" }}
              >
                <div
                  className="text-3xl mb-2 font-bold"
                  style={{ color: "#0052FF" }}
                >
                  {userStats.totalPrompts}
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  작성한 프롬프트
                </div>
              </Card>

              <Card
                className="p-6 text-center border-2 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1"
                style={{ borderColor: "#0052FF20" }}
              >
                <div
                  className="text-3xl mb-2 font-bold"
                  style={{ color: "#0052FF" }}
                >
                  {userStats.totalPrompts}
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  공유한 프롬프트
                </div>
              </Card>

              <Card
                className="p-6 text-center border-2 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1"
                style={{ borderColor: "#0052FF20" }}
              >
                <div
                  className="text-3xl mb-2 font-bold"
                  style={{ color: "#0052FF" }}
                >
                  {userStats.totalLikes}
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  받은 총 좋아요 ❤️
                </div>
              </Card>

              <Card
                className="p-6 text-center border-2 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1"
                style={{ borderColor: "#0052FF20" }}
              >
                <div
                  className="text-3xl mb-2 font-bold"
                  style={{ color: "#0052FF" }}
                >
                  {userStats.level}
                </div>
                <div className="text-sm text-gray-600 font-medium">Level</div>
              </Card>
            </div>

            {/* Top Shared Posts */}
            <Card
              className="p-6 border-2 shadow-sm hover:shadow-md transition-shadow duration-200 mb-6"
              style={{ borderColor: "#0052FF20" }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5" style={{ color: "#0052FF" }} />
                  <h2 className="text-lg font-semibold">인기 공유 프롬프트</h2>
                </div>
                <p className="text-xs text-gray-500">좋아요 순</p>
              </div>

              <div className="space-y-3">
                {popularPrompts && popularPrompts.length > 0 ? (
                  popularPrompts.slice(0, 5).map((post, index) => (
                  <div
                    key={post.id}
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-blue-50/30 transition-all duration-150 hover:shadow-sm"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0"
                      style={{
                        backgroundColor:
                          index === 0
                            ? "#FFD700"
                            : index === 1
                            ? "#C0C0C0"
                            : index === 2
                            ? "#CD7F32"
                            : "#0052FF",
                      }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-1">{post.title}</p>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">{post.prompt}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          ❤️ {post.likes} 좋아요
                        </span>
                        <span className="text-blue-600">{post.modelName}</span>
                        <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </div>
                  </div>
                ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500 mb-2">
                      아직 공유한 프롬프트가 없습니다
                    </p>
                    <p className="text-xs text-gray-400">
                      첫 프롬프트를 공유하고 좋아요를 받아보세요!
                    </p>
                  </div>
                )}
              </div>
            </Card>
            </>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
