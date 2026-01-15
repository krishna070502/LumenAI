'use client';

import { Cpu, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useEffect, useMemo, useState } from 'react';
import { useChat } from '@/lib/hooks/useChat';
import { AnimatePresence, motion } from 'motion/react';
import { useAdmin } from '@/lib/auth/useAdmin';

interface AllowedModel {
  providerId: string;
  providerName: string;
  modelKey: string;
  modelName: string;
}

const ModelSelector = () => {
  const [models, setModels] = useState<AllowedModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { isAdmin } = useAdmin();

  const { setChatModelProvider, chatModelProvider } = useChat();

  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/allowed-models');

        if (!res.ok) {
          throw new Error('Failed to fetch models');
        }

        const data: { models: AllowedModel[] } = await res.json();
        setModels(data.models);
      } catch (error) {
        console.error('Error loading models:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  const handleModelSelect = (providerId: string, modelKey: string) => {
    setChatModelProvider({ providerId, key: modelKey });
    localStorage.setItem('chatModelProviderId', providerId);
    localStorage.setItem('chatModelKey', modelKey);
  };

  const filteredModels = useMemo(() => {
    return models.filter(
      (model) =>
        model.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.providerName.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [models, searchQuery]);

  // Group models by provider for admin view
  const groupedByProvider = useMemo(() => {
    const groups: Record<string, AllowedModel[]> = {};
    for (const model of filteredModels) {
      if (!groups[model.providerName]) {
        groups[model.providerName] = [];
      }
      groups[model.providerName].push(model);
    }
    return groups;
  }, [filteredModels]);

  return (
    <Popover className="relative w-full max-w-[15rem] md:max-w-md lg:max-w-lg">
      {({ open }) => (
        <>
          <PopoverButton
            type="button"
            className="active:border-none hover:bg-light-200  hover:dark:bg-dark-200 p-2 rounded-lg focus:outline-none headless-open:text-black dark:headless-open:text-white text-black/50 dark:text-white/50 active:scale-95 transition duration-200 hover:text-black dark:hover:text-white"
          >
            <Cpu size={16} className="text-sky-500" />
          </PopoverButton>
          <AnimatePresence>
            {open && (
              <PopoverPanel
                className="absolute z-10 w-[230px] sm:w-[270px] md:w-[300px] right-0"
                static
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.1, ease: 'easeOut' }}
                  className="origin-top-right bg-light-primary dark:bg-dark-primary max-h-[300px] sm:max-w-none border rounded-lg border-light-200 dark:border-dark-200 w-full flex flex-col shadow-lg overflow-hidden"
                >
                  <div className="p-2 border-b border-light-200 dark:border-dark-200">
                    <div className="relative">
                      <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"
                      />
                      <input
                        type="text"
                        placeholder="Search models..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-light-secondary dark:bg-dark-secondary rounded-lg placeholder:text-xs placeholder:-translate-y-[1.5px] text-xs text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none border border-transparent transition duration-200"
                      />
                    </div>
                  </div>

                  <div className="max-h-[320px] overflow-y-auto">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2
                          className="animate-spin text-black/40 dark:text-white/40"
                          size={24}
                        />
                      </div>
                    ) : filteredModels.length === 0 ? (
                      <div className="text-center py-16 px-4 text-black/60 dark:text-white/60 text-sm">
                        {searchQuery
                          ? 'No models found'
                          : 'No chat models available'}
                      </div>
                    ) : isAdmin ? (
                      // Admin view: Grouped by provider
                      <div className="flex flex-col">
                        {Object.entries(groupedByProvider).map(
                          ([providerName, providerModels], providerIndex) => (
                            <div key={providerName}>
                              <div className="px-4 py-2.5 sticky top-0 bg-light-primary dark:bg-dark-primary border-b border-light-200/50 dark:border-dark-200/50">
                                <p className="text-xs text-black/50 dark:text-white/50 uppercase tracking-wider">
                                  {providerName}
                                </p>
                              </div>

                              <div className="flex flex-col px-2 py-2 space-y-0.5">
                                {providerModels.map((model) => (
                                  <button
                                    key={`${model.providerId}/${model.modelKey}`}
                                    onClick={() =>
                                      handleModelSelect(
                                        model.providerId,
                                        model.modelKey,
                                      )
                                    }
                                    type="button"
                                    className={cn(
                                      'px-3 py-2 flex items-center justify-between text-start duration-200 cursor-pointer transition rounded-lg group',
                                      chatModelProvider?.providerId ===
                                        model.providerId &&
                                        chatModelProvider?.key === model.modelKey
                                        ? 'bg-light-secondary dark:bg-dark-secondary'
                                        : 'hover:bg-light-secondary dark:hover:bg-dark-secondary',
                                    )}
                                  >
                                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                                      <Cpu
                                        size={15}
                                        className={cn(
                                          'shrink-0',
                                          chatModelProvider?.providerId ===
                                            model.providerId &&
                                            chatModelProvider?.key ===
                                            model.modelKey
                                            ? 'text-sky-500'
                                            : 'text-black/50 dark:text-white/50 group-hover:text-black/70 group-hover:dark:text-white/70',
                                        )}
                                      />
                                      <p
                                        className={cn(
                                          'text-xs truncate',
                                          chatModelProvider?.providerId ===
                                            model.providerId &&
                                            chatModelProvider?.key ===
                                            model.modelKey
                                            ? 'text-sky-500 font-medium'
                                            : 'text-black/70 dark:text-white/70 group-hover:text-black dark:group-hover:text-white',
                                        )}
                                      >
                                        {model.modelName}
                                      </p>
                                    </div>
                                  </button>
                                ))}
                              </div>

                              {providerIndex <
                                Object.keys(groupedByProvider).length - 1 && (
                                  <div className="h-px bg-light-200 dark:bg-dark-200" />
                                )}
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      // Non-admin view: Flat list without provider grouping
                      <div className="flex flex-col px-2 py-2 space-y-0.5">
                        {filteredModels.map((model) => (
                          <button
                            key={`${model.providerId}/${model.modelKey}`}
                            onClick={() =>
                              handleModelSelect(model.providerId, model.modelKey)
                            }
                            type="button"
                            className={cn(
                              'px-3 py-2 flex items-center justify-between text-start duration-200 cursor-pointer transition rounded-lg group',
                              chatModelProvider?.providerId ===
                                model.providerId &&
                                chatModelProvider?.key === model.modelKey
                                ? 'bg-light-secondary dark:bg-dark-secondary'
                                : 'hover:bg-light-secondary dark:hover:bg-dark-secondary',
                            )}
                          >
                            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                              <Cpu
                                size={15}
                                className={cn(
                                  'shrink-0',
                                  chatModelProvider?.providerId ===
                                    model.providerId &&
                                    chatModelProvider?.key === model.modelKey
                                    ? 'text-sky-500'
                                    : 'text-black/50 dark:text-white/50 group-hover:text-black/70 group-hover:dark:text-white/70',
                                )}
                              />
                              <p
                                className={cn(
                                  'text-xs truncate',
                                  chatModelProvider?.providerId ===
                                    model.providerId &&
                                    chatModelProvider?.key === model.modelKey
                                    ? 'text-sky-500 font-medium'
                                    : 'text-black/70 dark:text-white/70 group-hover:text-black dark:group-hover:text-white',
                                )}
                              >
                                {model.modelName}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </PopoverPanel>
            )}
          </AnimatePresence>
        </>
      )}
    </Popover>
  );
};

export default ModelSelector;

