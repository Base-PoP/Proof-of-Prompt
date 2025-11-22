'use client';

import { Home, LayoutDashboard, Trophy, User, Menu, Plus, ChevronLeft, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from './ui/button';

interface ChatHistoryItem {
  id: string;
  title: string;
  timestamp: string;
}

interface SidebarProps {
  currentPage: 'home' | 'dashboard' | 'conversation' | 'leaderboard' | 'profile';
  onNavigate: (page: 'home' | 'dashboard' | 'conversation' | 'leaderboard' | 'profile') => void;
  isOpen: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  chatHistory?: ChatHistoryItem[];
  onSelectChat?: (chatId: string) => void;
  onDeleteChat?: (chatId: string) => void;
  activeChatId?: string;
}

export function Sidebar({ 
  currentPage, 
  onNavigate, 
  isOpen, 
  onToggle, 
  onNewChat,
  chatHistory = [],
  onSelectChat,
  onDeleteChat,
  activeChatId
}: SidebarProps) {
  const menuItems = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leaderboard' as const, label: 'Leaderboard', icon: Trophy },
    { id: 'profile' as const, label: 'Profile', icon: User },
  ];

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

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
              onClick={() => {
                onNewChat();
                onNavigate('home');
              }}
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

          {/* Navigation Menu - Fixed */}
          <nav className="p-4 lg:p-2 border-b">
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

          {/* Chat History - Scrollable */}
          {isOpen && chatHistory.length > 0 && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Recent Chats
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto px-2 py-2">
                <div className="space-y-1">
                  {chatHistory.map((chat) => (
                    <div
                      key={chat.id}
                      className={`group relative flex items-start gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                        activeChatId === chat.id
                          ? 'bg-blue-50'
                          : 'hover:bg-gray-100'
                      }`}
                      onClick={() => {
                        onSelectChat?.(chat.id);
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                          onToggle();
                        }
                      }}
                    >
                      <MessageSquare 
                        className="w-4 h-4 mt-0.5 flex-shrink-0" 
                        style={{ 
                          color: activeChatId === chat.id ? '#0052FF' : '#6B7280' 
                        }} 
                      />
                      <div className="flex-1 min-w-0">
                        <p 
                          className={`text-sm truncate ${
                            activeChatId === chat.id 
                              ? 'font-medium' 
                              : ''
                          }`}
                          style={{ 
                            color: activeChatId === chat.id ? '#0052FF' : '#374151' 
                          }}
                        >
                          {chat.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTimestamp(chat.timestamp)}
                        </p>
                      </div>
                      {onDeleteChat && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChat(chat.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-all"
                          title="Delete chat"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Empty State for Chat History */}
          {isOpen && chatHistory.length === 0 && (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-xs text-gray-400">
                  No chat history yet
                </p>
              </div>
            </div>
          )}

          {/* Collapsed State - Show icon only */}
          {!isOpen && (
            <div className="flex-1" />
          )}

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
