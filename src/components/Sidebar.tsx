'use client';

import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Search,
  PanelLeftClose,
  PanelLeft,
  SquarePen,
  BookOpenText,
  Folder,
  Loader2,
  MoreHorizontal,
  FolderPlus,
  Compass,
  ListTodo,
  LogIn,
} from 'lucide-react';
import Link from 'next/link';
import { useSelectedLayoutSegments, useRouter, usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import SettingsButton from './Settings/SettingsButton';
import UserAvatar from './Auth/UserAvatar';
import AddToSpaceDialog from './AddToSpaceDialog';
import SearchModal from './SearchModal';
import { useAuth } from '@/lib/auth/useAuth';

interface Chat {
  id: string;
  title: string;
  createdAt: string;
}

const Sidebar = ({ children }: { children: React.ReactNode }) => {
  const segments = useSelectedLayoutSegments();
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [addToSpaceChat, setAddToSpaceChat] = useState<Chat | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { isAuthenticated, loading: authLoading, login } = useAuth();

  // Fetch chats
  const fetchChats = async () => {
    try {
      const res = await fetch('/api/chats');
      if (res.ok) {
        const data = await res.json();
        setChats(data.chats || []);
      }
    } catch (err) {
      console.error('Error fetching chats:', err);
    } finally {
      setLoadingChats(false);
    }
  };

  // Fetch on mount and pathname changes
  useEffect(() => {
    fetchChats();
  }, [pathname]);

  // Listen for sidebar refresh (new chat created) and title updates
  useEffect(() => {
    const handleRefresh = () => {
      fetchChats();
    };
    const handleTitleUpdate = (e: Event) => {
      const { chatId, title } = (e as CustomEvent).detail;
      if (chatId && title) {
        setChats(prev => prev.map(chat => 
          chat.id === chatId ? { ...chat, title } : chat
        ));
      }
    };
    window.addEventListener('sidebar-refresh', handleRefresh);
    window.addEventListener('chat-title-updated', handleTitleUpdate);
    return () => {
      window.removeEventListener('sidebar-refresh', handleRefresh);
      window.removeEventListener('chat-title-updated', handleTitleUpdate);
    };
  }, []);

  // Filter chats by search
  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group chats by date
  const groupChatsByDate = (chats: Chat[]) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const groups: { [key: string]: Chat[] } = {
      'Today': [],
      'Yesterday': [],
      'Previous 7 Days': [],
      'Previous 30 Days': [],
      'Older': [],
    };

    chats.forEach(chat => {
      const chatDate = new Date(chat.createdAt);
      if (chatDate.toDateString() === today.toDateString()) {
        groups['Today'].push(chat);
      } else if (chatDate.toDateString() === yesterday.toDateString()) {
        groups['Yesterday'].push(chat);
      } else if (chatDate > weekAgo) {
        groups['Previous 7 Days'].push(chat);
      } else if (chatDate > monthAgo) {
        groups['Previous 30 Days'].push(chat);
      } else {
        groups['Older'].push(chat);
      }
    });

    return groups;
  };

  const chatGroups = groupChatsByDate(chats);

  // Handler for new chat that properly resets state via hard navigation
  const handleNewChat = () => {
    window.location.href = isAuthenticated ? '/' : '/guest';
  };

  const navLinks = [
    {
      icon: SquarePen,
      href: '/',
      label: 'New chat',
      active: segments.length === 0,
      isNewChat: true,
    },
    {
      icon: Search,
      href: '#',
      label: 'Search',
      active: false,
      isSearch: true,
    },
    {
      icon: Folder,
      href: '/spaces',
      active: segments.includes('spaces') || segments.includes('space'),
      label: 'Spaces',
      hideOnMobile: true,
    },
    {
      icon: BookOpenText,
      href: '/library',
      active: segments.includes('library'),
      label: 'Library',
    },
    {
      icon: ListTodo,
      href: '/tasks',
      active: segments.includes('tasks'),
      label: 'Tasks',
    },
    {
      icon: Compass,
      href: '/discover',
      active: segments.includes('discover'),
      label: 'Discover',
    },
  ];

  const currentChatId = segments.includes('c') ? segments[segments.indexOf('c') + 1] : null;

  return (
    <div>
      {/* Desktop Sidebar - Expanded */}
      <div
        className={cn(
          'hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300 ease-in-out border-r border-light-200 dark:border-dark-200',
          isCollapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'
        )}
      >
        <div className="flex h-full flex-col bg-light-secondary dark:bg-dark-secondary">
          {/* Header */}
          <div className={cn(
            "flex items-center h-14 p-3",
            isCollapsed ? "justify-center" : "justify-between"
          )}>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 hover:bg-light-200 dark:hover:bg-dark-200 rounded-lg transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <PanelLeft size={20} className="text-black/60 dark:text-white/60" />
              ) : (
                <PanelLeftClose size={20} className="text-black/60 dark:text-white/60" />
              )}
            </button>
            {!isCollapsed && (
              <button
                onClick={handleNewChat}
                className="p-2 hover:bg-light-200 dark:hover:bg-dark-200 rounded-lg transition-colors"
                title="New chat"
              >
                <SquarePen size={20} className="text-black/60 dark:text-white/60" />
              </button>
            )}
          </div>

          {/* Main Navigation */}
          <div className={cn("py-2 space-y-0.5", isCollapsed ? "px-2" : "px-2")}>
            {navLinks.map((link) => (
              'isNewChat' in link && link.isNewChat ? (
                <button
                  key={link.label}
                  onClick={handleNewChat}
                  className={cn(
                    'w-full flex items-center rounded-lg text-sm font-medium transition-colors',
                    isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5',
                    link.active
                      ? 'bg-light-200 dark:bg-dark-200 text-black dark:text-white'
                      : 'text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-dark-200 hover:text-black dark:hover:text-white'
                  )}
                  title={isCollapsed ? link.label : undefined}
                >
                  <link.icon size={isCollapsed ? 22 : 18} />
                  {!isCollapsed && <span>{link.label}</span>}
                </button>
              ) : 'isSearch' in link && link.isSearch ? (
                <button
                  key={link.label}
                  onClick={() => setIsSearchOpen(true)}
                  className={cn(
                    'w-full flex items-center rounded-lg text-sm font-medium transition-colors',
                    isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5',
                    'text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-dark-200 hover:text-black dark:hover:text-white'
                  )}
                  title={isCollapsed ? link.label : undefined}
                >
                  <link.icon size={isCollapsed ? 22 : 18} />
                  {!isCollapsed && <span>{link.label}</span>}
                </button>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className={cn(
                    'flex items-center rounded-lg text-sm font-medium transition-colors',
                    isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5',
                    link.active
                      ? 'bg-light-200 dark:bg-dark-200 text-black dark:text-white'
                      : 'text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-dark-200 hover:text-black dark:hover:text-white'
                  )}
                  title={isCollapsed ? link.label : undefined}
                >
                  <link.icon size={isCollapsed ? 22 : 18} />
                  {!isCollapsed && <span>{link.label}</span>}
                </Link>
              )
            ))}
          </div>

          {/* Divider */}
          <div className="mx-3 my-2 border-t border-light-200 dark:border-dark-200" />

          {/* Chat History - Only when expanded */}
          {!isCollapsed && (
            <div className="flex-1 overflow-y-auto px-2 pb-4 no-scrollbar">
              {authLoading ? (
                <div className="space-y-3 px-2 pt-2">
                  <div className="h-8 w-full rounded-lg bg-light-200/50 dark:bg-dark-200/50 animate-pulse" />
                  <div className="h-8 w-[85%] rounded-lg bg-light-200/50 dark:bg-dark-200/50 animate-pulse" style={{ animationDelay: '150ms' }} />
                  <div className="h-8 w-[75%] rounded-lg bg-light-200/50 dark:bg-dark-200/50 animate-pulse" style={{ animationDelay: '300ms' }} />
                  <div className="h-8 w-[90%] rounded-lg bg-light-200/50 dark:bg-dark-200/50 animate-pulse" style={{ animationDelay: '450ms' }} />
                </div>
              ) : !isAuthenticated ? (
                <div className="text-center py-8 px-4">
                  <MessageSquare size={24} className="mx-auto text-black/20 dark:text-white/20 mb-2" />
                  <p className="text-sm text-black/40 dark:text-white/40">
                    Sign in to save your chats
                  </p>
                </div>
              ) : loadingChats ? (
                <div className="space-y-3 px-2 pt-2">
                  <div className="h-8 w-full rounded-lg bg-light-200/50 dark:bg-dark-200/50 animate-pulse" />
                  <div className="h-8 w-[85%] rounded-lg bg-light-200/50 dark:bg-dark-200/50 animate-pulse" style={{ animationDelay: '150ms' }} />
                  <div className="h-8 w-[75%] rounded-lg bg-light-200/50 dark:bg-dark-200/50 animate-pulse" style={{ animationDelay: '300ms' }} />
                  <div className="h-8 w-[90%] rounded-lg bg-light-200/50 dark:bg-dark-200/50 animate-pulse" style={{ animationDelay: '450ms' }} />
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <MessageSquare size={24} className="mx-auto text-black/20 dark:text-white/20 mb-2" />
                  <p className="text-sm text-black/40 dark:text-white/40">
                    {searchQuery ? 'No chats found' : 'No chats yet'}
                  </p>
                </div>
              ) : (
                <>
                  {Object.entries(chatGroups).map(([group, groupChats]) => {
                    if (groupChats.length === 0) return null;
                    return (
                      <div key={group} className="mb-4">
                        <p className="px-3 py-2 text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-wider">
                          {group}
                        </p>
                        <div className="space-y-0.5">
                          {groupChats.map((chat) => (
                            <div
                              key={chat.id}
                              className="group relative"
                            >
                              <Link
                                href={`/c/${chat.id}`}
                                className={cn(
                                  'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors pr-8',
                                  currentChatId === chat.id
                                    ? 'bg-light-200 dark:bg-dark-200 text-black dark:text-white'
                                    : 'text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-dark-200 hover:text-black dark:hover:text-white'
                                )}
                              >
                                <span className="truncate">{chat.title}</span>
                              </Link>
                              {/* 3-dot menu on hover */}
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setAddToSpaceChat(chat);
                                }}
                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-light-300 dark:hover:bg-dark-300 transition-all"
                                title="Add to Space"
                              >
                                <FolderPlus size={14} className="text-black/60 dark:text-white/60" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* Spacer when collapsed */}
          {isCollapsed && <div className="flex-1" />}

          {/* User Section */}
          <div className={cn(
            "border-t border-light-200 dark:border-dark-200",
            isCollapsed ? "p-2 flex flex-col items-center gap-3" : "p-3"
          )}>
            {authLoading ? (
              <div className={cn(
                "flex items-center",
                isCollapsed ? "justify-center" : "gap-3"
              )}>
                <div className="w-8 h-8 rounded-full bg-light-200 dark:bg-dark-200 animate-pulse" />
                {!isCollapsed && <div className="h-4 w-24 rounded bg-light-200 dark:bg-dark-200 animate-pulse" />}
              </div>
            ) : !isAuthenticated ? (
              isCollapsed ? (
                <button
                  onClick={login}
                  className="w-10 h-10 rounded-full bg-[#24A0ED]/10 dark:bg-[#24A0ED]/20 flex items-center justify-center text-[#24A0ED] hover:bg-[#24A0ED]/20 dark:hover:bg-[#24A0ED]/30 transition-colors"
                  title="Sign In"
                >
                  <LogIn size={20} />
                </button>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2.5 px-1">
                    <div className="w-8 h-8 rounded-full bg-light-200 dark:bg-dark-200 flex items-center justify-center flex-shrink-0">
                      <LogIn size={16} className="text-black/40 dark:text-white/40" />
                    </div>
                    <span className="text-sm text-black/50 dark:text-white/50">Not signed in</span>
                  </div>
                  <button
                    onClick={login}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#24A0ED] hover:bg-[#1a8ad0] text-white text-sm font-medium transition-colors"
                  >
                    <LogIn size={16} />
                    <span>Sign In</span>
                  </button>
                </div>
              )
            ) : (
              <div className={cn(
                "flex items-center",
                isCollapsed ? "flex-col gap-3" : "justify-between"
              )}>
                <UserAvatar />
                <SettingsButton />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 w-full z-50 flex flex-row items-center justify-around bg-light-secondary dark:bg-dark-secondary px-4 py-4 shadow-sm lg:hidden border-t border-light-200 dark:border-dark-200">
        {navLinks.filter(link => !link.hideOnMobile).map((link, i) => (
          'isNewChat' in link && link.isNewChat ? (
            <button
              key={i}
              onClick={handleNewChat}
              className={cn(
                'relative flex flex-col items-center space-y-1 text-center',
                link.active
                  ? 'text-black dark:text-white'
                  : 'text-black/60 dark:text-white/60',
              )}
            >
              {link.active && (
                <div className="absolute top-0 -mt-4 h-1 w-8 rounded-b-lg bg-black dark:bg-white" />
              )}
              <link.icon size={22} />
              <p className="text-xs">{link.label}</p>
            </button>
          ) : 'isSearch' in link && link.isSearch ? (
            <button
              key={i}
              onClick={() => setIsSearchOpen(true)}
              className={cn(
                'relative flex flex-col items-center space-y-1 text-center',
                'text-black/60 dark:text-white/60',
              )}
            >
              <link.icon size={22} />
              <p className="text-xs">{link.label}</p>
            </button>
          ) : (
            <Link
              href={link.href}
              key={i}
              className={cn(
                'relative flex flex-col items-center space-y-1 text-center',
                link.active
                  ? 'text-black dark:text-white'
                  : 'text-black/60 dark:text-white/60',
              )}
            >
              {link.active && (
                <div className="absolute top-0 -mt-4 h-1 w-8 rounded-b-lg bg-black dark:bg-white" />
              )}
              <link.icon size={22} />
              <p className="text-xs">{link.label}</p>
            </Link>
          )
        ))}
        <UserAvatar />
      </div>

      {/* Main Content */}
      <div className={cn(
        'transition-all duration-300 ease-in-out',
        isCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]'
      )}>
        <Layout>{children}</Layout>
      </div>

      {/* Add to Space Dialog */}
      <AddToSpaceDialog
        isOpen={!!addToSpaceChat}
        onClose={() => setAddToSpaceChat(null)}
        chatId={addToSpaceChat?.id || ''}
        chatTitle={addToSpaceChat?.title || ''}
        onSuccess={() => {
          // Optionally refresh chats or show feedback
        }}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNewChat={handleNewChat}
      />
    </div >
  );
};

export default Sidebar;
