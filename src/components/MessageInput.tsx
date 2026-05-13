import { cn } from '@/lib/utils';
import { ArrowUp, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import AttachSmall from './MessageInputActions/AttachSmall';
import { useChat } from '@/lib/hooks/useChat';
import ChatModeToggle from './MessageInputActions/ChatModeToggle';

const MessageInput = () => {
  const { loading, sendMessage, isTemporaryChat, uploadFiles } = useChat();
  const [isDragging, setIsDragging] = useState(false);

  const [copilotEnabled, setCopilotEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [textareaRows, setTextareaRows] = useState(1);
  const [mode, setMode] = useState<'multi' | 'single'>('single');

  useEffect(() => {
    if (textareaRows >= 2 && message && mode === 'single') {
      setMode('multi');
    } else if (!message && mode === 'multi') {
      setMode('single');
    }
  }, [textareaRows, mode, message]);

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

  const handleDragOver = (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLFormElement>) => {
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
        if (loading || !message.trim()) return;
        sendMessage(message);
        setMessage('');
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (loading || !message.trim()) {
            console.log('[MessageInput] Enter blocked - loading:', loading, 'message empty:', !message.trim());
            return;
          }
          console.log('[MessageInput] Sending message via Enter');
          sendMessage(message);
          setMessage('');
        }
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative bg-light-secondary/90 dark:bg-dark-secondary/90 backdrop-blur-md p-4 flex items-center overflow-visible border shadow-sm shadow-light-200/10 dark:shadow-black/20 transition-all duration-500',
        mode === 'multi' ? 'flex-col rounded-2xl' : 'flex-row rounded-full',
        isDragging ? 'border-sky-500 scale-[1.01] shadow-[0_0_15px_rgba(14,165,233,0.15)]' : (
          isTemporaryChat 
            ? "border-emerald-500/30 focus-within:border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.05)] dark:shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
            : "border-light-200 dark:border-dark-200 focus-within:border-light-300 dark:focus-within:border-dark-300"
        )
      )}
    >
      {mode === 'single' && <AttachSmall />}
      <TextareaAutosize
        ref={inputRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onPaste={handlePaste}
        onHeightChange={(height, props) => {
          setTextareaRows(Math.ceil(height / props.rowHeight));
        }}
        className="transition bg-transparent dark:placeholder:text-white/50 placeholder:text-sm text-base md:text-sm dark:text-white resize-none focus:outline-none w-full px-2 max-h-24 lg:max-h-36 xl:max-h-48 flex-grow flex-shrink"
        placeholder="Ask a follow-up"
      />
      {mode === 'single' && (
        <div className="flex flex-row items-center space-x-2">
          {/* Hide toggle on mobile for single-line mode to save space */}
          <div className="hidden sm:block">
            <ChatModeToggle />
          </div>
          <button
            disabled={message.trim().length === 0 || loading}
            className={cn(
              "relative group rounded-full p-2.5 transition-all duration-300",
              message.trim().length > 0 && !loading
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
                message.trim().length > 0 && !loading
                  ? "text-white"
                  : "text-black/30 dark:text-white/30"
              )}
            />
            {message.trim().length > 0 && !loading && (
              <span className={cn(
                "absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300",
                isTemporaryChat ? "bg-emerald-500" : "bg-gradient-to-r from-purple-500 to-indigo-500"
              )} />
            )}
          </button>
        </div>
      )}
      {mode === 'multi' && (
        <div className="flex flex-row items-center justify-between w-full pt-2">
          <div className="flex flex-row items-center space-x-2">
            <AttachSmall />
            <ChatModeToggle />
          </div>
          <button
            disabled={message.trim().length === 0 || loading}
            className={cn(
              "relative group rounded-full p-2.5 transition-all duration-300",
              message.trim().length > 0 && !loading
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
                message.trim().length > 0 && !loading
                  ? "text-white"
                  : "text-black/30 dark:text-white/30"
              )}
            />
            {message.trim().length > 0 && !loading && (
              <span className={cn(
                "absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300",
                isTemporaryChat ? "bg-emerald-500" : "bg-gradient-to-r from-purple-500 to-indigo-500"
              )} />
            )}
          </button>
        </div>
      )}
    </form>
  );
};

export default MessageInput;
