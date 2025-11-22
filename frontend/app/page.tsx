'use client';

import { useState } from 'react';
import { WalletButton } from './components/WalletButton';
import { WalletBalance } from './components/WalletBalance';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './components/LandingPage';
import { BattlePage } from './components/BattlePage';
import { LeaderboardPage } from './components/LeaderboardPage';
import { ProfilePage } from './components/ProfilePage';

type Page = 'landing' | 'battle' | 'leaderboard' | 'profile';

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  votes: number;
  createdAt: string;
}

export default function Home() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);

  const handleNewChat = () => {
    setCurrentPage('landing');
    setSelectedProblem(null);
  };

  const handleSelectProblem = (problem: Problem) => {
    setSelectedProblem(problem);
    setCurrentPage('battle');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage onSelectProblem={handleSelectProblem} />;
      case 'battle':
        return <BattlePage problem={selectedProblem || undefined} />;
      case 'leaderboard':
        return <LeaderboardPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <LandingPage onSelectProblem={handleSelectProblem} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onNewChat={handleNewChat}
      />

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-16'}`}>
        {/* Header */}
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage('landing')}
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
