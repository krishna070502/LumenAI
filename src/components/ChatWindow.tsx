'use client';

import Navbar from './Navbar';
import Chat from './Chat';
import EmptyChat from './EmptyChat';
import NextError from 'next/error';
import { useChat } from '@/lib/hooks/useChat';
import SettingsButtonMobile from './Settings/SettingsButtonMobile';
import { Block } from '@/lib/types';
import Loader from './ui/Loader';

export interface BaseMessage {
  chatId: string;
  messageId: string;
  createdAt: Date;
}

export interface Message extends BaseMessage {
  backendId: string;
  query: string;
  responseBlocks: Block[];
  status: 'answering' | 'completed' | 'error';
}

export interface File {
  fileName: string;
  fileExtension: string;
  fileId: string;
}

export interface Widget {
  widgetType: string;
  params: Record<string, any>;
}

const ChatWindow = () => {
  const { hasError, notFound, messages, isReady, isTemporaryChat } = useChat();

  if (hasError) {
    return (
      <div className="relative">
        <div className="absolute w-full flex flex-row items-center justify-end mr-5 mt-5">
          <SettingsButtonMobile />
        </div>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <p className="dark:text-white/70 text-black/70 text-sm">
            Failed to connect to the server. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return isReady ? (
    notFound ? (
      <NextError statusCode={404} />
    ) : (
      <div className="relative h-full flex flex-col overflow-hidden">
        {/* Temporary Chat Special Effects Layer */}
        {isTemporaryChat && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 bg-light-primary dark:bg-dark-primary">
            {/* Elegant Grid Background */}
            <div className="absolute inset-0 bg-grid-pattern opacity-100 transition-opacity duration-700" />

            {/* Vignette Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.1)_100%)] dark:bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)]" />

            {/* Atmospheric Animated Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[80px] animate-float-blob" />
            <div className="absolute top-[20%] right-[-10%] w-[35%] h-[35%] bg-teal-500/10 dark:bg-teal-500/5 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[80px] animate-float-blob-delayed" />
            <div className="absolute bottom-[-10%] left-[30%] w-[45%] h-[45%] bg-green-500/10 dark:bg-green-500/5 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[80px] animate-float-blob-slow" />

            {/* Global Border Glow when in Temp Mode */}
            <div className="absolute inset-0 border border-emerald-500/10 dark:border-emerald-500/5 rounded-[inherit]" />
          </div>
        )}

        <div className="relative z-10 h-full flex flex-col overflow-x-hidden">
          {messages.length > 0 ? (
            <>
              <Navbar />
              <Chat />
            </>
          ) : (
            <EmptyChat />
          )}
        </div>
      </div>
    )
  ) : (
    <div className="flex items-center justify-center min-h-screen w-full">
      <Loader />
    </div>
  );
};

export default ChatWindow;
