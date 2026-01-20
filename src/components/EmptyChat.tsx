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

const EmptyChat = () => {
  const { chatMode, sendMessage } = useChat();
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
      <div className="flex flex-col items-center justify-center min-h-screen max-w-screen-sm mx-auto p-2 space-y-4">
        <div className="flex flex-col items-center justify-center w-full space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-black/90 dark:text-white/90 text-3xl sm:text-4xl font-semibold -mt-8 tracking-tight">
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
