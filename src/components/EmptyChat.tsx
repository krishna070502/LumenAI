'use client';

import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import EmptyChatMessageInput from './EmptyChatMessageInput';
import { File } from './ChatWindow';
import Link from 'next/link';
import WeatherWidget from './WeatherWidget';
import NewsArticleWidget from './NewsArticleWidget';
import SettingsButtonMobile from '@/components/Settings/SettingsButtonMobile';
import {
  getShowNewsWidget,
  getShowWeatherWidget,
} from '@/lib/config/clientRegistry';
import { useChat } from '@/lib/hooks/useChat';
import { useAuth } from '@/lib/auth/useAuth';
import TemporaryChatToggle from './TemporaryChatToggle';
import { cn } from '@/lib/utils';

const EmptyChat = () => {
  const { chatMode, sendMessage, isTemporaryChat } = useChat();
  const { user, isAuthenticated } = useAuth();

  const [showWeather, setShowWeather] = useState(() =>
    typeof window !== 'undefined' ? getShowWeatherWidget() : true,
  );
  const [showNews, setShowNews] = useState(() =>
    typeof window !== 'undefined' ? getShowNewsWidget() : true,
  );

  useEffect(() => {
    const updateWidgetVisibility = () => {
      setShowWeather(getShowWeatherWidget());
      setShowNews(getShowNewsWidget());
    };

    updateWidgetVisibility();

    window.addEventListener('client-config-changed', updateWidgetVisibility);
    window.addEventListener('storage', updateWidgetVisibility);

    return () => {
      window.removeEventListener(
        'client-config-changed',
        updateWidgetVisibility,
      );
      window.removeEventListener('storage', updateWidgetVisibility);
    };
  }, []);

  // Get the user's first name or a default greeting
  const getFirstName = () => {
    if (!user?.name) return null;
    const firstName = user.name.split(' ')[0];
    return firstName;
  };

  const firstName = getFirstName();


  const getSubtext = () => {
    if (chatMode === 'chat') {
      return '💬 Chat mode - Quick, conversational answers';
    } else {
      return '🔍 Research mode - Deep dive with sources';
    }
  };

  return (
    <div className="relative">
      {/* Temporary Chat Toggle - Top Right Corner (only for authenticated users) */}
      {isAuthenticated && (
        <div className="absolute top-4 right-4 z-50">
          <TemporaryChatToggle />
        </div>
      )}

      {/* Temporary Chat Banner */}
      {/* Temporary Chat Banner */}
      {isTemporaryChat && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3 px-5 py-2.5 bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/30 rounded-2xl backdrop-blur-md shadow-xl shadow-emerald-500/5 shine-effect group transition-all hover:bg-emerald-500/15">
            <div className="flex-shrink-0 bg-emerald-500/20 p-1.5 rounded-lg border border-emerald-500/30">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600 dark:text-emerald-400 animate-pulse">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            </div>
            <div className="flex flex-col items-start leading-tight text-left">
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 tracking-tight">
                Incognito Mode Active
              </span>
              <p className="text-[11px] font-medium text-emerald-600/80 dark:text-emerald-400/70 max-w-[220px] sm:max-w-none truncate sm:whitespace-normal">
                Messages vanish instantly and aren't stored or used for learning.
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col items-center justify-center min-h-screen max-w-screen-md mx-auto p-4 space-y-6 relative z-10">
        <div className="flex flex-col items-center justify-center w-full space-y-6">
          <div className="text-center space-y-3">
            {/* Special icon when temporary chat is active to give it presence */}
            {isTemporaryChat && (
              <div className="mx-auto w-16 h-16 mb-2 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)] animate-in zoom-in duration-500">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-600 dark:text-emerald-400">
                  <circle cx="12" cy="12" r="10" strokeDasharray="4 4" />
                  <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" className="animate-pulse" />
                </svg>
              </div>
            )}

            <h2
              className={cn(
                "font-bold tracking-tight transition-all duration-500 leading-tight flex flex-col items-center text-center",
                !isTemporaryChat && "-mt-8"
              )}
              style={{
                backgroundImage: isTemporaryChat 
                  ? 'linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%)'
                  : 'linear-gradient(90deg, #22d3ee, #a3e635, #facc15, #fb923c, #f87171, #a855f7, #6366f1)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {isTemporaryChat ? (
                <span className="text-3xl sm:text-4xl md:text-5xl">Private Session</span>
              ) : firstName ? (
                <>
                  <span className="flex flex-col items-center sm:flex-row sm:items-baseline sm:gap-x-2">
                    <span className="text-2xl sm:text-3xl font-semibold">Hey</span>
                    <span className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">{firstName},</span>
                  </span>
                  <span className="text-xl sm:text-2xl md:text-3xl font-medium mt-1 sm:mt-2">
                    {chatMode === 'chat' ? 'what can I help you with?' : "let's explore together"}
                  </span>
                </>
              ) : (
                <span className="text-3xl sm:text-4xl md:text-5xl">
                  {chatMode === 'chat' ? 'What can I help you with?' : 'Research deeply, find anything.'}
                </span>
              )}
            </h2>
            
            <p className={cn(
              "text-[15px] font-medium transition-colors duration-300",
              isTemporaryChat ? "text-emerald-600/70 dark:text-emerald-400/70" : "text-black/50 dark:text-white/50"
            )}>
              {isTemporaryChat 
                ? "Your interaction won't be recorded in history."
                : getSubtext()}
            </p>
          </div>
          <EmptyChatMessageInput />
        </div>
        {(showWeather || showNews) && (
          <div className="flex flex-col w-full gap-4 mt-2 sm:flex-row sm:justify-center">
            {showWeather && (
              <div className="flex-1 w-full">
                <WeatherWidget />
              </div>
            )}
            {showNews && (
              <div className="flex-1 w-full">
                <NewsArticleWidget />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmptyChat;
