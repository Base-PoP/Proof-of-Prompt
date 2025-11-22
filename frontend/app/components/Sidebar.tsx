'use client';

import { Home, Trophy, User, Menu, Plus, ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';

interface SidebarProps {
  currentPage: 'landing' | 'battle' | 'leaderboard' | 'profile';
  onNavigate: (page: 'landing' | 'battle' | 'leaderboard' | 'profile') => void;
  isOpen: boolean;
  onToggle: () => void;
  onNewChat: () => void;
}

export function Sidebar({ currentPage, onNavigate, isOpen, onToggle, onNewChat }: SidebarProps) {
  const menuItems = [
    { id: 'landing' as const, label: 'Home', icon: Home },
    { id: 'leaderboard' as const, label: 'Leaderboard', icon: Trophy },
    { id: 'profile' as const, label: 'Profile', icon: User },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-white border-r z-50 transition-all duration-300 ${
          isOpen ? 'w-64' : 'w-0 lg:w-16'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo Header */}
          <div className={`p-4 border-b flex items-center justify-between ${!isOpen && 'lg:justify-center lg:flex-col lg:gap-2'}`}>
            <button
              onClick={() => onNavigate('landing')}
              className={`flex items-center gap-1 hover:opacity-80 transition-opacity ${!isOpen && 'lg:flex-col lg:gap-0'}`}
              title={!isOpen ? 'LM Battle' : undefined}
            >
              {!isOpen && (
                <span 
                  className="hidden lg:block text-xs font-semibold cursor-pointer" 
                  style={{ 
                    color: '#0052FF', 
                    fontFamily: 'system-ui, -apple-system, sans-serif', 
                    fontWeight: '600', 
                    letterSpacing: '-0.02em',
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed'
                  }}
                >
                  LM
                </span>
              )}
              {isOpen && (
                <span 
                  className="text-xl whitespace-nowrap cursor-pointer" 
                  style={{ 
                    color: '#0052FF', 
                    fontFamily: 'system-ui, -apple-system, sans-serif', 
                    fontWeight: '600', 
                    letterSpacing: '-0.02em' 
                  }}
                >
                  LM Battle
                </span>
              )}
            </button>
            {!isOpen && (
              <button
                onClick={onToggle}
                className="hidden lg:block p-2 hover:bg-gray-100 rounded transition-colors"
                title="Expand sidebar"
              >
                <Menu className="w-5 h-5" style={{ color: '#0052FF' }} />
              </button>
            )}
            {isOpen && (
              <button
                onClick={onToggle}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* New Chat Button */}
          <div className={`p-4 ${!isOpen && 'lg:px-2'}`}>
            <Button
              onClick={onNewChat}
              className={`w-full flex items-center gap-2 ${!isOpen && 'lg:w-12 lg:h-12 lg:p-0 lg:justify-center'}`}
              style={{ backgroundColor: '#0052FF' }}
            >
              <Plus className="w-5 h-5" />
              {isOpen && <span>New Chat</span>}
            </Button>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 p-4 lg:p-2">
            <div className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                        onToggle();
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    } ${!isOpen && 'lg:justify-center lg:px-3'}`}
                    style={isActive ? { backgroundColor: '#0052FF' } : {}}
                    title={!isOpen ? item.label : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {isOpen && <span className="whitespace-nowrap">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className={`p-4 border-t ${!isOpen && 'lg:hidden'}`}>
            <p className="text-xs text-gray-500 text-center">
              Powered by Base
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-30 lg:hidden p-2 bg-white rounded-lg shadow-lg border"
      >
        <Menu className="w-6 h-6" style={{ color: '#0052FF' }} />
      </button>
    </>
  );
}
