'use client';

import { useChat } from '@/lib/hooks/useChat';

const MessageBoxLoading = () => {
  const { chatMode } = useChat();

  // Chat mode: MessageBox already shows its own loading indicator, so don't show anything here
  if (chatMode === 'chat') {
    return null;
  }

  // Research mode: full-width skeleton bars
  return (
    <div className="flex flex-col space-y-2 w-full lg:w-9/12 animate-pulse rounded-lg py-3">
      <div className="h-2 rounded-full w-full bg-light-secondary dark:bg-dark-secondary" />
      <div className="h-2 rounded-full w-9/12 bg-light-secondary dark:bg-dark-secondary" />
      <div className="h-2 rounded-full w-10/12 bg-light-secondary dark:bg-dark-secondary" />
    </div>
  );
};

export default MessageBoxLoading;
