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

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  votes: number;
  createdAt: string;
}

interface ChatHistoryItem {
  id: string;
  title: string;
  timestamp: string;
}

export default function Home() {
  const [isRestoringState, setIsRestoringState] = useState(true);
  
  // 페이지 상태를 localStorage에서 복원
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [directPrompt, setDirectPrompt] = useState<string>('');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // 초기 마운트 시 localStorage에서 상태 복원
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPage = localStorage.getItem('currentPage') as Page;
      const savedPostId = localStorage.getItem('selectedPostId');
      const savedChatId = localStorage.getItem('activeChatId');
      
      if (savedPage) setCurrentPage(savedPage);
      if (savedPostId) setSelectedPostId(savedPostId);
      if (savedChatId) setActiveChatId(savedChatId);
      
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
  
  // Sample chat history (matching post IDs from api.ts)
  const [chatHistory] = useState<ChatHistoryItem[]>([
    {
      id: '1',
      title: 'React에서 useEffect의 cleanup 함수는 언제 실행되나요?',
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    },
    {
      id: '2',
      title: 'TypeScript에서 제네릭을 사용하는 이유는 무엇인가요?',
      timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    },
    {
      id: '3',
      title: 'Next.js의 Server Components와 Client Components의 차이점은?',
      timestamp: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
    },
    {
      id: '4',
      title: 'async/await과 Promise의 차이점을 설명해주세요',
      timestamp: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
    },
    {
      id: '5',
      title: 'CSS Flexbox와 Grid의 사용 시나리오는?',
      timestamp: new Date(Date.now() - 18000000).toISOString(), // 5 hours ago
    },
  ]);

  const handleNewChat = () => {
    setCurrentPage('home');
    setSelectedProblem(null);
    setDirectPrompt('');
    setSelectedPostId(null);
    setActiveChatId(null);
    // localStorage 정리
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentPage', 'home');
      localStorage.removeItem('selectedPostId');
      localStorage.removeItem('activeChatId');
    }
  };

  const handleStartBattle = (prompt: string) => {
    setDirectPrompt(prompt);
    setCurrentPage('dashboard');
  };

  const handleSelectProblem = (problem: Problem) => {
    setSelectedProblem(problem);
    setCurrentPage('dashboard');
  };

  const handleSelectPost = (postId: string) => {
    setSelectedPostId(postId);
    setActiveChatId(null); // Clear activeChatId when coming from dashboard
    setCurrentPage('conversation');
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setSelectedPostId(null); // Clear selectedPostId when viewing from chat history
    setCurrentPage('home'); // Show in HomePage instead of ConversationPage
  };

  const handleDeleteChat = (chatId: string) => {
    // TODO: Implement chat deletion
    console.log('Delete chat:', chatId);
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
        return <HomePage onStartBattle={handleStartBattle} onBack={handleNewChat} initialChatId={activeChatId} />;
      case 'dashboard':
        return <DashboardPage onNewChat={handleNewChat} onSelectPost={handleSelectPost} />;
      case 'conversation':
        return selectedPostId ? (
          <ConversationPage postId={selectedPostId} onBack={handleBackFromConversation} />
        ) : (
          <DashboardPage onNewChat={handleNewChat} onSelectPost={handleSelectPost} />
        );
      case 'leaderboard':
        return <LeaderboardPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <HomePage onStartBattle={handleStartBattle} onBack={handleNewChat} />;
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
        onNavigate={setCurrentPage}
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
                LM Battle
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
