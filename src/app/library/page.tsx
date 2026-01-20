'use client';

import DeleteChat from '@/components/DeleteChat';
import { formatTimeDifference } from '@/lib/utils';
import { BookOpenText, ClockIcon, FileText, Globe2Icon, Bookmark, Trash2, ExternalLink, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export interface Chat {
  id: string;
  title: string;
  createdAt: string;
  sources: string[];
  files: { fileId: string; name: string }[];
}

interface SavedArticle {
  id: number;
  url: string;
  title: string;
  thumbnail: string | null;
  source: string | null;
  savedAt: string;
}

type Tab = 'chats' | 'saved';

const Page = () => {
  const [activeTab, setActiveTab] = useState<Tab>('chats');
  const [chats, setChats] = useState<Chat[]>([]);
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingsLoading, setSavingsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter chats based on search query
  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter saved articles based on search query
  const filteredArticles = savedArticles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (article.source?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    const fetchChats = async () => {
      setLoading(true);

      try {
        const res = await fetch(`/api/chats`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await res.json();

        // Handle unauthorized or missing data
        if (!res.ok || !data.chats) {
          setChats([]);
        } else {
          setChats(data.chats);
        }
      } catch (error) {
        console.error('Error fetching chats:', error);
        setChats([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchSavedArticles = async () => {
      setSavingsLoading(true);
      try {
        const res = await fetch('/api/bookmarks');
        if (res.ok) {
          const data = await res.json();
          setSavedArticles(data.bookmarks || []);
        }
      } catch (error) {
        console.error('Error fetching saved articles:', error);
      } finally {
        setSavingsLoading(false);
      }
    };

    fetchChats();
    fetchSavedArticles();
  }, []);

  const handleRemoveBookmark = async (url: string) => {
    try {
      const res = await fetch(`/api/bookmarks?url=${encodeURIComponent(url)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSavedArticles(prev => prev.filter(a => a.url !== url));
        toast.success('Article removed');
      }
    } catch (error) {
      toast.error('Failed to remove article');
    }
  };

  return (
    <div>
      <div className="flex flex-col pt-10 border-b border-light-200/20 dark:border-dark-200/20 pb-6 px-2">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div className="flex items-center justify-center">
            <BookOpenText size={45} className="mb-2.5" />
            <div className="flex flex-col">
              <h1
                className="text-5xl font-normal p-2 pb-0"
                style={{ fontFamily: 'PP Editorial, serif' }}
              >
                Library
              </h1>
              <div className="px-2 text-sm text-black/60 dark:text-white/60 text-center lg:text-left">
                Past chats, sources, and saved articles.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center lg:justify-end gap-2 text-xs text-black/60 dark:text-white/60">
            <span className="inline-flex items-center gap-1 rounded-full border border-black/20 dark:border-white/20 px-2 py-0.5">
              <BookOpenText size={14} />
              {loading
                ? 'Loading…'
                : `${chats.length} ${chats.length === 1 ? 'chat' : 'chats'}`}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-black/20 dark:border-white/20 px-2 py-0.5">
              <Bookmark size={14} />
              {savingsLoading
                ? 'Loading…'
                : `${savedArticles.length} saved`}
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-2 pt-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'chats' ? 'Search chats...' : 'Search saved articles...'}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40 hover:text-black/60 dark:hover:text-white/60 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-2 pt-4 border-b border-light-200/20 dark:border-dark-200/20">
        <button
          onClick={() => setActiveTab('chats')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'chats'
            ? 'bg-light-secondary dark:bg-dark-secondary text-black dark:text-white border-b-2 border-purple-500'
            : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
            }`}
        >
          <span className="flex items-center gap-2">
            <BookOpenText size={16} />
            Chats
          </span>
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'saved'
            ? 'bg-light-secondary dark:bg-dark-secondary text-black dark:text-white border-b-2 border-purple-500'
            : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
            }`}
        >
          <span className="flex items-center gap-2">
            <Bookmark size={16} />
            Saved Articles
          </span>
        </button>
      </div>

      {/* Chats Tab */}
      {activeTab === 'chats' && (
        <>
          {loading ? (
            <div className="flex flex-row items-center justify-center min-h-[60vh]">
              <svg
                aria-hidden="true"
                className="w-8 h-8 text-light-200 fill-light-secondary dark:text-[#202020] animate-spin dark:fill-[#ffffff3b]"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 50.5908C100.003 78.2051 78.1951 100.003 50.5908 100C22.9765 99.9972 0.997224 78.018 1 50.4037C1.00281 22.7993 22.8108 0.997224 50.4251 1C78.0395 1.00281 100.018 22.8108 100 50.4251ZM9.08164 50.594C9.06312 73.3997 27.7909 92.1272 50.5966 92.1457C73.4023 92.1642 92.1298 73.4365 92.1483 50.6308C92.1669 27.8251 73.4392 9.0973 50.6335 9.07878C27.8278 9.06026 9.10003 27.787 9.08164 50.594Z"
                  fill="currentColor"
                />
                <path
                  d="M93.9676 39.0409C96.393 38.4037 97.8624 35.9116 96.9801 33.5533C95.1945 28.8227 92.871 24.3692 90.0681 20.348C85.6237 14.1775 79.4473 9.36872 72.0454 6.45794C64.6435 3.54717 56.3134 2.65431 48.3133 3.89319C45.869 4.27179 44.3768 6.77534 45.014 9.20079C45.6512 11.6262 48.1343 13.0956 50.5786 12.717C56.5073 11.8281 62.5542 12.5399 68.0406 14.7911C73.527 17.0422 78.2187 20.7487 81.5841 25.4923C83.7976 28.5886 85.4467 32.059 86.4416 35.7474C87.1273 38.1189 89.5423 39.6781 91.9676 39.0409Z"
                  fill="currentFill"
                />
              </svg>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[70vh] px-2 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl border border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary">
                {searchQuery ? <Search className="text-black/70 dark:text-white/70" /> : <BookOpenText className="text-black/70 dark:text-white/70" />}
              </div>
              <p className="mt-2 text-black/70 dark:text-white/70 text-sm">
                {searchQuery ? `No chats matching "${searchQuery}"` : 'No chats found.'}
              </p>
              {!searchQuery && (
                <p className="mt-1 text-black/70 dark:text-white/70 text-sm">
                  <Link href="/" className="text-sky-400">
                    Start a new chat
                  </Link>{' '}
                  to see it listed here.
                </p>
              )}
            </div>
          ) : (
            <div className="pt-6 pb-28 px-2">
              <div className="rounded-2xl border border-light-200 dark:border-dark-200 overflow-hidden bg-light-primary dark:bg-dark-primary">
                {filteredChats.map((chat, index) => {
                  const sourcesLabel =
                    chat.sources.length === 0
                      ? null
                      : chat.sources.length <= 2
                        ? chat.sources
                          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                          .join(', ')
                        : `${chat.sources
                          .slice(0, 2)
                          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                          .join(', ')} + ${chat.sources.length - 2}`;

                  return (
                    <div
                      key={chat.id}
                      className={
                        'group flex flex-col gap-2 p-4 hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors duration-200 ' +
                        (index !== filteredChats.length - 1
                          ? 'border-b border-light-200 dark:border-dark-200'
                          : '')
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/c/${chat.id}`}
                          className="flex-1 text-black dark:text-white text-base lg:text-lg font-medium leading-snug line-clamp-2 group-hover:text-[#24A0ED] transition duration-200"
                          title={chat.title}
                        >
                          {chat.title}
                        </Link>
                        <div className="pt-0.5 shrink-0">
                          <DeleteChat
                            chatId={chat.id}
                            chats={chats}
                            setChats={setChats}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-black/70 dark:text-white/70">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <ClockIcon size={14} />
                          {formatTimeDifference(new Date(), chat.createdAt)} Ago
                        </span>

                        {sourcesLabel && (
                          <span className="inline-flex items-center gap-1 text-xs border border-black/20 dark:border-white/20 rounded-full px-2 py-0.5">
                            <Globe2Icon size={14} />
                            {sourcesLabel}
                          </span>
                        )}
                        {chat.files.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs border border-black/20 dark:border-white/20 rounded-full px-2 py-0.5">
                            <FileText size={14} />
                            {chat.files.length}{' '}
                            {chat.files.length === 1 ? 'file' : 'files'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Saved Articles Tab */}
      {activeTab === 'saved' && (
        <>
          {savingsLoading ? (
            <div className="flex flex-row items-center justify-center min-h-[60vh]">
              <svg
                aria-hidden="true"
                className="w-8 h-8 text-light-200 fill-light-secondary dark:text-[#202020] animate-spin dark:fill-[#ffffff3b]"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 50.5908C100.003 78.2051 78.1951 100.003 50.5908 100C22.9765 99.9972 0.997224 78.018 1 50.4037C1.00281 22.7993 22.8108 0.997224 50.4251 1C78.0395 1.00281 100.018 22.8108 100 50.4251ZM9.08164 50.594C9.06312 73.3997 27.7909 92.1272 50.5966 92.1457C73.4023 92.1642 92.1298 73.4365 92.1483 50.6308C92.1669 27.8251 73.4392 9.0973 50.6335 9.07878C27.8278 9.06026 9.10003 27.787 9.08164 50.594Z"
                  fill="currentColor"
                />
                <path
                  d="M93.9676 39.0409C96.393 38.4037 97.8624 35.9116 96.9801 33.5533C95.1945 28.8227 92.871 24.3692 90.0681 20.348C85.6237 14.1775 79.4473 9.36872 72.0454 6.45794C64.6435 3.54717 56.3134 2.65431 48.3133 3.89319C45.869 4.27179 44.3768 6.77534 45.014 9.20079C45.6512 11.6262 48.1343 13.0956 50.5786 12.717C56.5073 11.8281 62.5542 12.5399 68.0406 14.7911C73.527 17.0422 78.2187 20.7487 81.5841 25.4923C83.7976 28.5886 85.4467 32.059 86.4416 35.7474C87.1273 38.1189 89.5423 39.6781 91.9676 39.0409Z"
                  fill="currentFill"
                />
              </svg>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[70vh] px-2 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl border border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary">
                {searchQuery ? <Search className="text-black/70 dark:text-white/70" /> : <Bookmark className="text-black/70 dark:text-white/70" />}
              </div>
              <p className="mt-2 text-black/70 dark:text-white/70 text-sm">
                {searchQuery ? `No articles matching "${searchQuery}"` : 'No saved articles yet.'}
              </p>
              {!searchQuery && (
                <p className="mt-1 text-black/70 dark:text-white/70 text-sm">
                  <Link href="/discover" className="text-sky-400">
                    Discover articles
                  </Link>{' '}
                  and save them for later.
                </p>
              )}
            </div>
          ) : (
            <div className="pt-6 pb-28 px-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredArticles.map((article) => (
                  <div
                    key={article.id}
                    className="group rounded-2xl border border-light-200 dark:border-dark-200 overflow-hidden bg-light-primary dark:bg-dark-primary hover:shadow-lg transition-shadow"
                  >
                    {article.thumbnail && (
                      <Link href={`/article?url=${encodeURIComponent(article.url)}&title=${encodeURIComponent(article.title)}`}>
                        <div className="relative aspect-video overflow-hidden">
                          <img
                            src={article.thumbnail}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      </Link>
                    )}
                    <div className="p-4">
                      <Link
                        href={`/article?url=${encodeURIComponent(article.url)}&title=${encodeURIComponent(article.title)}`}
                        className="block text-black dark:text-white font-medium text-sm leading-snug line-clamp-2 group-hover:text-purple-500 transition-colors mb-2"
                      >
                        {article.title}
                      </Link>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-black/50 dark:text-white/50">
                          {article.source && (
                            <span className="flex items-center gap-1">
                              <Globe2Icon size={12} />
                              {article.source}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-full hover:bg-light-200 dark:hover:bg-dark-200 transition-colors"
                            title="Open original"
                          >
                            <ExternalLink size={14} className="text-black/50 dark:text-white/50" />
                          </a>
                          <button
                            onClick={() => handleRemoveBookmark(article.url)}
                            className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                            title="Remove from saved"
                          >
                            <Trash2 size={14} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Page;
