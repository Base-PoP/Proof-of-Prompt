'use client';

import { useState, useEffect } from 'react';
import { WalletButton } from './components/WalletButton';
import { WalletBalance } from './components/WalletBalance';
import { Sidebar } from './components/Sidebar';
import { HomePage } from './components/HomePage';
import { DashboardPage } from './components/DashboardPage';
import { ConversationPage } from './components/ConversationPage';
import { LeaderboardPage } from './components/LeaderboardPage';
import { ProfilePage } from './components/ProfilePage';

type Page = 'home' | 'dashboard' | 'conversation' | 'leaderboard' | 'profile';

interface ChatHistoryItem {
  id: string;
  matchId: string;
  title: string;
  prompt: string;
  response: string;
  timestamp: string;
}

export default function Home() {
  const [isRestoringState, setIsRestoringState] = useState(true);
  
  // 페이지 상태를 localStorage에서 복원
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [draftPost, setDraftPost] = useState<{ matchId: string; prompt: string; response: string } | null>(null);
  const [selectedChat, setSelectedChat] = useState<ChatHistoryItem | null>(null);
  const [homeResetKey, setHomeResetKey] = useState(0);

  // 초기 마운트 시 localStorage에서 상태 복원
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPage = localStorage.getItem('currentPage') as Page;
      const savedPostId = localStorage.getItem('selectedPostId');
      const savedChatId = localStorage.getItem('activeChatId');
      const savedChatHistory = localStorage.getItem('chatHistory');
      
      if (savedPage) setCurrentPage(savedPage);
      if (savedPostId) setSelectedPostId(savedPostId);
      if (savedChatId) setActiveChatId(savedChatId);
      if (savedChatHistory) {
        try {
          setChatHistory(JSON.parse(savedChatHistory));
        } catch (e) {
          console.error('Failed to parse chat history:', e);
        }
      }
      
      // 상태 복원 완료
      setIsRestoringState(false);
    }
  }, []);

  // 페이지 상태 변경 시 localStorage에 저장
  useEffect(() => {
    if (typeof window !== 'undefined' && !isRestoringState) {
      localStorage.setItem('currentPage', currentPage);
    }
  }, [currentPage, isRestoringState]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !isRestoringState) {
      if (selectedPostId) {
        localStorage.setItem('selectedPostId', selectedPostId);
      } else {
        localStorage.removeItem('selectedPostId');
      }
    }
  }, [selectedPostId, isRestoringState]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !isRestoringState) {
      if (activeChatId) {
        localStorage.setItem('activeChatId', activeChatId);
      } else {
        localStorage.removeItem('activeChatId');
      }
    }
  }, [activeChatId, isRestoringState]);

  // chatHistory가 변경될 때 localStorage에 저장
  useEffect(() => {
    if (typeof window !== 'undefined' && !isRestoringState) {
      localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }
  }, [chatHistory, isRestoringState]);

  // 새 채팅 추가 함수
  const addChatToHistory = (matchId: string, prompt: string, response: string) => {
    const newChat: ChatHistoryItem = {
      id: Date.now().toString(),
      matchId,
      title: prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt,
      prompt,
      response,
      timestamp: new Date().toISOString(),
    };

    setChatHistory(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  };

  // 채팅 선택 핸들러
  const handleSelectChat = (chatId: string) => {
    const chat = chatHistory.find((c) => c.id === chatId) || null;
    setSelectedChat(chat);
    setActiveChatId(chatId); // UI highlight uses history id
    setSelectedPostId(chat?.matchId ?? null); // conversation fetch uses matchId
    setDraftPost(null);
    setCurrentPage('conversation');
  };

  // 채팅 삭제 핸들러
  const handleDeleteChat = (chatId: string) => {
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
    if (activeChatId === chatId) {
      setActiveChatId(null);
    }
  };

  const handleNewChat = () => {
    setCurrentPage('home');
    setSelectedPostId(null);
    setActiveChatId(null);
    setDraftPost(null); // Clear draft post
    setSelectedChat(null);
    setHomeResetKey(prev => prev + 1);
    // localStorage 정리
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentPage', 'home');
      localStorage.removeItem('selectedPostId');
      localStorage.removeItem('activeChatId');
    }
  };

  const handleSelectPost = (postId: string) => {
    setSelectedPostId(postId);
    setActiveChatId(null); // Clear activeChatId when coming from dashboard
    setCurrentPage('conversation');
  };

  const handleShareToDashboard = (sharedPromptId: string) => {
    setSelectedPostId(sharedPromptId);
    setCurrentPage('dashboard');
  };

  const handlePostCreated = () => {
    // 게시글 작성 완료 후 draftPost 초기화
    setDraftPost(null);
  };

  const handleBackFromConversation = () => {
    // If coming from chat history (activeChatId is set), go to home
    // If coming from dashboard (no activeChatId), go to dashboard
    if (activeChatId) {
      setCurrentPage('home');
      setSelectedPostId(null);
    } else {
      setCurrentPage('dashboard');
      setSelectedPostId(null);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <HomePage
            onStartBattle={handleNewChat} 
            onBack={handleNewChat} 
            initialChatId={activeChatId}
            initialChat={selectedChat}
            onChatCreated={addChatToHistory}
            chatHistory={chatHistory}
            onShareToDashboard={handleShareToDashboard}
            resetKey={homeResetKey}
          />
        );
      case 'dashboard':
        return <DashboardPage onNewChat={handleNewChat} onSelectPost={handleSelectPost} draftPost={draftPost} onPostCreated={handlePostCreated} />;
      case 'conversation':
        return (
          <ConversationPage postId={selectedPostId || activeChatId || ""} onBack={handleBackFromConversation} />
        );
      case 'leaderboard':
        return <LeaderboardPage onSelectPost={handleSelectPost} />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <HomePage onStartBattle={handleNewChat} onBack={handleNewChat} />;
    }
  };

  // 상태 복원 중일 때는 렌더링하지 않음 (깜빡임 방지)
  if (isRestoringState) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={(page) => {
          if (page === 'dashboard') {
            setDraftPost(null); // Clear draft when navigating to dashboard
          }
          setCurrentPage(page);
        }}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onNewChat={handleNewChat}
        chatHistory={chatHistory}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        activeChatId={activeChatId}
      />

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-16'}`}>
        {/* Header */}
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => {
                handleNewChat();
                setCurrentPage('home');
              }}
              className="flex items-center gap-1 lg:hidden hover:opacity-80 transition-opacity cursor-pointer"
            >
              <span 
                className="text-2xl" 
                style={{ 
                  color: '#0052FF', 
                  fontFamily: 'system-ui, -apple-system, sans-serif', 
                  fontWeight: '600', 
                  letterSpacing: '-0.02em' 
                }}
              >
                 Proof-of-Prompt 
              </span>
            </button>
            <div className="flex-1 lg:flex-none" />
            <div className="flex items-center gap-3">
              <WalletBalance />
              <WalletButton />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="animate-in fade-in duration-300">
          {renderPage()}
        </main>
      </div>

    </div>
  );
}
