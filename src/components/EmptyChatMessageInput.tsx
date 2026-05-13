import { Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import Sources from './MessageInputActions/Sources';
import Optimization from './MessageInputActions/Optimization';
import Attach from './MessageInputActions/Attach';
import { useChat } from '@/lib/hooks/useChat';
import ModelSelector from './MessageInputActions/ChatModelSelector';
import ChatModeToggle from './MessageInputActions/ChatModeToggle';
import { cn } from '@/lib/utils';

const EmptyChatMessageInput = () => {
  const { sendMessage, isTemporaryChat, uploadFiles } = useChat();
  const [isDragging, setIsDragging] = useState(false);

  /* const [copilotEnabled, setCopilotEnabled] = useState(false); */
  const [message, setMessage] = useState('');

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;

      const isInputFocused =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.hasAttribute('contenteditable');

      if (e.key === '/' && !isInputFocused) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    inputRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedItems = e.clipboardData?.items;
    if (!pastedItems) return;

    const filesToUpload: globalThis.File[] = [];
    for (let i = 0; i < pastedItems.length; i++) {
      const item = pastedItems[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) filesToUpload.push(file);
      }
    }

    if (filesToUpload.length > 0) {
      e.preventDefault();
      await uploadFiles(filesToUpload);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles && droppedFiles.length > 0) {
      await uploadFiles(droppedFiles);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        sendMessage(message);
        setMessage('');
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage(message);
          setMessage('');
        }
      }}
      className="w-full relative z-20"
    >
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col bg-light-secondary/95 dark:bg-dark-secondary/95 backdrop-blur-xl px-4 pt-5 pb-3 rounded-[24px] w-full border shadow-md shadow-light-200/5 dark:shadow-black/25 transition-all duration-500 ease-in-out",
          isDragging ? "border-sky-500 scale-[1.01] shadow-[0_0_20px_rgba(14,165,233,0.15)]" : (
            isTemporaryChat 
              ? "border-emerald-500/30 focus-within:border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.08)] dark:shadow-[0_0_30px_rgba(16,185,129,0.15)]" 
              : "border-light-200 dark:border-dark-200 focus-within:border-light-300 dark:focus-within:border-dark-300"
          )
        )}
      >
        <TextareaAutosize
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onPaste={handlePaste}
          minRows={2}
          className="px-1.5 bg-transparent placeholder:text-[15px] placeholder:text-black/40 dark:placeholder:text-white/40 text-base md:text-sm text-black dark:text-white resize-none focus:outline-none w-full max-h-24 lg:max-h-36 xl:max-h-48"
          placeholder="Ask anything..."
        />
        <div className="flex flex-row items-center justify-between mt-4">
          <div className="flex flex-row items-center space-x-1">
            <Optimization />
            <ChatModeToggle />
          </div>
          <div className="flex flex-row items-center space-x-2">
            <div className="flex flex-row items-center space-x-1">
              <Sources />
              <ModelSelector />
              <Attach />
            </div>
            <button
              disabled={message.trim().length === 0}
              className={cn(
                "relative group rounded-full p-2.5 transition-all duration-300",
                message.trim().length > 0
                  ? isTemporaryChat 
                    ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:scale-110 hover:shadow-lg hover:shadow-emerald-500/40 active:scale-95"
                    : "bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 hover:from-purple-600 hover:via-purple-700 hover:to-indigo-700 hover:scale-110 hover:shadow-lg hover:shadow-purple-500/40 active:scale-95"
                  : "bg-light-100 dark:bg-dark-100 border border-light-200 dark:border-dark-200"
              )}
            >
              <Send
                size={16}
                className={cn(
                  "transition-all duration-300",
                  message.trim().length > 0
                    ? "text-white"
                    : "text-black/30 dark:text-white/30"
                )}
              />
              {message.trim().length > 0 && (
                <span className={cn(
                  "absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300",
                  isTemporaryChat ? "bg-emerald-500" : "bg-gradient-to-r from-purple-500 to-indigo-500"
                )} />
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default EmptyChatMessageInput;
