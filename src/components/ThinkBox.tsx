'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ThinkBoxProps {
  content: string;
  thinkingEnded: boolean;
}

const ThinkBox = ({ content, thinkingEnded }: ThinkBoxProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (thinkingEnded) {
      setIsExpanded(false);
    } else {
      setIsExpanded(true);
    }
  }, [thinkingEnded]);

  return (
    <div className="my-4 rounded-lg bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 overflow-hidden transition-all duration-300">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-light-200 dark:hover:bg-dark-200 transition duration-200"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-black dark:text-white" />
          <span className="text-sm font-medium text-black dark:text-white">
            Deep Thinking
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!thinkingEnded && !isExpanded && (
            <span className="flex h-1.5 w-1.5 rounded-full bg-black/40 dark:bg-white/40 animate-pulse" />
          )}
          {isExpanded ? (
            <ChevronUp size={16} className="w-4 h-4 text-black/70 dark:text-white/70" />
          ) : (
            <ChevronDown size={16} className="w-4 h-4 text-black/70 dark:text-white/70" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-light-200 dark:border-dark-200"
          >
            <div className="p-3 space-y-2">
              <div className="flex gap-2">
                <div className="flex flex-col items-center -mt-0.5">
                  <div className={`rounded-full p-1.5 bg-light-100 dark:bg-dark-100 text-black/70 dark:text-white/70 ${!thinkingEnded ? 'animate-pulse' : ''}`}>
                    <Brain className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex-1 pb-1">
                  <span className="text-sm font-medium text-black dark:text-white">
                    Thinking Process
                  </span>
                  <p className="text-[13px] text-black/70 dark:text-white/70 mt-1.5 leading-relaxed whitespace-pre-wrap">
                    {content}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThinkBox;

