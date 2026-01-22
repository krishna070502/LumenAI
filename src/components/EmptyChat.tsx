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

  // Greetings based on mode
  const getGreeting = () => {
    if (chatMode === 'chat') {
      return firstName
        ? `Hey ${firstName}, what can I help you with?`
        : 'What can I help you with?';
    } else {
      return firstName
        ? `Hey ${firstName}, let's explore together`
        : 'Research deeply, find anything.';
    }
  };

  const getSubtext = () => {
    if (chatMode === 'chat') {
      return '💬 Chat mode - Quick, conversational answers';
    } else {
      return '🔍 Research mode - Deep dive with sources';
    }
  };

  return (
    <div className="relative">
      {/* Temporary Chat Toggle - Top Right Corner */}
      <div className="absolute top-4 right-4 z-10">
        <TemporaryChatToggle />
      </div>

      {/* Temporary Chat Banner */}
      {isTemporaryChat && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full backdrop-blur-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500">
            <circle cx="12" cy="12" r="10" strokeDasharray="3 3" />
            <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
          </svg>
          <div className="text-center">
            <span className="text-sm font-medium text-emerald-500">Temporary Chat</span>
            <p className="text-[10px] text-emerald-500/70">This chat won't appear in history, won't be used to train models, and won't add to your memories</p>
          </div>
        </div>
      )}
      <div className="flex flex-col items-center justify-center min-h-screen max-w-screen-md mx-auto p-4 space-y-6">
        <div className="flex flex-col items-center justify-center w-full space-y-6">
          <div className="text-center space-y-2">
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-semibold -mt-8 tracking-tight"
              style={{
                background: 'linear-gradient(90deg, #22d3ee, #a3e635, #facc15, #fb923c, #f87171, #a855f7, #6366f1)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {getGreeting()}
            </h2>
            <p className="text-sm text-black/50 dark:text-white/50">
              {getSubtext()}
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
