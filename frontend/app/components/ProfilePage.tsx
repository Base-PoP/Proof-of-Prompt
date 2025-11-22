"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
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
  username: string;
  level: number;
  joinDate: string;
  totalPrompts: number;
  sharedPrompts: number;
  totalLikes: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

interface SharedPost {
  id: string;
  prompt: string;
  likes: number;
  views: number;
  createdAt: string;
}

export function ProfilePage() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "achievements">(
    "overview"
  );
  const {
    login,
    isAuthenticated,
    user,
    userAddress: address,
    ready,
  } = useAuth();

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

  const [userStats] = useState<UserStats>({
    username: "AI Enthusiast",
    level: 5,
    joinDate: "Jan 2024",
    totalPrompts: 127,
    sharedPrompts: 3,
    totalLikes: 105,
  });

  // Achievements data
  const [achievements] = useState<Achievement[]>([
    {
      id: "first_vote",
      name: "First Vote",
      description: "첫 투표를 완료했습니다",
      icon: "🎯",
      unlocked: true,
      unlockedAt: "2024.01.15",
    },
    {
      id: "voter_10",
      name: "Active Voter",
      description: "10번의 투표를 완료했습니다",
      icon: "🎖️",
      unlocked: true,
      unlockedAt: "2024.01.16",
    },
    {
      id: "voter_100",
      name: "Vote Master",
      description: "100번의 투표를 완료했습니다",
      icon: "🏆",
      unlocked: true,
      unlockedAt: "2024.01.20",
    },
    {
      id: "streak_7",
      name: "Consistent Warrior",
      description: "7일 연속 출석했습니다",
      icon: "🔥",
      unlocked: true,
      unlockedAt: "2024.01.18",
    },
    {
      id: "first_share",
      name: "Content Creator",
      description: "첫 프롬프트를 공유했습니다",
      icon: "📝",
      unlocked: true,
      unlockedAt: "2024.01.19",
    },
    {
      id: "likes_10",
      name: "Rising Star",
      description: "공유한 프롬프트가 10개의 좋아요를 받았습니다",
      icon: "⭐",
      unlocked: false,
      progress: 7,
      maxProgress: 10,
    },
    {
      id: "likes_50",
      name: "Popular Creator",
      description: "공유한 프롬프트가 50개의 좋아요를 받았습니다",
      icon: "🌟",
      unlocked: false,
      progress: 7,
      maxProgress: 50,
    },
    {
      id: "share_10",
      name: "Prolific Sharer",
      description: "10개의 프롬프트를 공유했습니다",
      icon: "📚",
      unlocked: false,
      progress: 3,
      maxProgress: 10,
    },
  ]);

  // Shared posts sorted by likes
  const [sharedPosts] = useState<SharedPost[]>([
    {
      id: "1",
      prompt: "안성맞춤의 반댓말은 무엇일까요? 언어학적 관점에서 분석해주세요.",
      likes: 45,
      views: 234,
      createdAt: "2024.01.20",
    },
    {
      id: "2",
      prompt:
        "양자 컴퓨팅의 기본 원리를 초등학생도 이해할 수 있게 설명해주세요.",
      likes: 32,
      views: 156,
      createdAt: "2024.01.19",
    },
    {
      id: "3",
      prompt:
        "AI에 관한 하이쿠를 작성해주세요. 한국어와 영어 버전 모두 부탁합니다.",
      likes: 28,
      views: 98,
      createdAt: "2024.01.18",
    },
    {
      id: "4",
      prompt:
        "블록체인 기술이 일상 생활에 어떻게 활용될 수 있을까요? 구체적인 예시를 들어주세요.",
      likes: 21,
      views: 87,
      createdAt: "2024.01.17",
    },
    {
      id: "5",
      prompt: "기후 변화를 해결하기 위한 창의적인 아이디어를 제안해주세요.",
      likes: 18,
      views: 65,
      createdAt: "2024.01.16",
    },
  ]);

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
                  {userStats.username}
                </h1>
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
                <Button
                  className="transition-all hover:scale-105 active:scale-95"
                  style={{ backgroundColor: "#0052FF" }}
                >
                  Edit Profile
                </Button>
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
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
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
            <Award className="w-4 h-4" />
            Achievements
          </button>
        </div>

        {activeTab === "overview" && (
          <>
            {/* Stats Grid */}
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
                  {userStats.sharedPrompts}
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
                {sharedPosts.slice(0, 5).map((post, index) => (
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
                      <p className="text-sm mb-2 line-clamp-2">{post.prompt}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          ❤️ {post.likes} 좋아요
                        </span>
                        <span className="flex items-center gap-1">
                          👁️ {post.views} 조회
                        </span>
                        <span>{post.createdAt}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {sharedPosts.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 mb-2">
                    아직 공유한 프롬프트가 없습니다
                  </p>
                  <p className="text-xs text-gray-400">
                    첫 프롬프트를 공유하고 좋아요를 받아보세요!
                  </p>
                </div>
              )}
            </Card>
          </>
        )}

        {activeTab === "achievements" && (
          <div className="space-y-6">
            {/* Achievement Stats */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card
                className="p-6 border-2 shadow-sm text-center"
                style={{
                  borderColor: "#0052FF20",
                  background:
                    "linear-gradient(135deg, #EEF5FF 0%, #FFFFFF 100%)",
                }}
              >
                <div className="text-4xl mb-2">🏆</div>
                <div
                  className="text-3xl font-bold mb-1"
                  style={{ color: "#0052FF" }}
                >
                  {achievements.filter((a) => a.unlocked).length}
                </div>
                <p className="text-xs text-gray-600">업적 달성</p>
              </Card>

              <Card
                className="p-6 border-2 shadow-sm text-center"
                style={{
                  borderColor: "#0052FF20",
                  background:
                    "linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 100%)",
                }}
              >
                <div className="text-4xl mb-2">🎯</div>
                <div
                  className="text-3xl font-bold mb-1"
                  style={{ color: "#F59E0B" }}
                >
                  {achievements.filter((a) => !a.unlocked).length}
                </div>
                <p className="text-xs text-gray-600">진행 중</p>
              </Card>

              <Card
                className="p-6 border-2 shadow-sm text-center"
                style={{
                  borderColor: "#0052FF20",
                  background:
                    "linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)",
                }}
              >
                <div className="text-4xl mb-2">⭐</div>
                <div
                  className="text-3xl font-bold mb-1"
                  style={{ color: "#10B981" }}
                >
                  {Math.round(
                    (achievements.filter((a) => a.unlocked).length /
                      achievements.length) *
                      100
                  )}
                  %
                </div>
                <p className="text-xs text-gray-600">완료율</p>
              </Card>
            </div>

            {/* Achievement Badges */}
            <Card
              className="p-6 border-2 shadow-sm"
              style={{ borderColor: "#0052FF20" }}
            >
              <div className="flex items-center gap-2 mb-6">
                <Award className="w-5 h-5" style={{ color: "#0052FF" }} />
                <h2 className="text-lg font-semibold">업적 뱃지</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`p-5 rounded-lg border-2 transition-all duration-200 ${
                      achievement.unlocked
                        ? "bg-gradient-to-br from-blue-50 to-white hover:shadow-lg hover:-translate-y-1"
                        : "bg-gray-50 opacity-60"
                    }`}
                    style={{
                      borderColor: achievement.unlocked
                        ? "#0052FF40"
                        : "#E5E7EB",
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`text-4xl ${
                          achievement.unlocked ? "" : "grayscale opacity-50"
                        }`}
                      >
                        {achievement.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-1">
                          {achievement.name}
                        </h3>
                        <p className="text-xs text-gray-600 mb-2">
                          {achievement.description}
                        </p>
                        {achievement.unlocked ? (
                          <p className="text-xs" style={{ color: "#0052FF" }}>
                            ✓ 달성 완료 • {achievement.unlockedAt}
                          </p>
                        ) : achievement.progress !== undefined ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>진행률</span>
                              <span>
                                {achievement.progress} /{" "}
                                {achievement.maxProgress}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full transition-all duration-300"
                                style={{
                                  backgroundColor: "#0052FF",
                                  width: `${
                                    (achievement.progress! /
                                      achievement.maxProgress!) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400">🔒 잠김</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
}
