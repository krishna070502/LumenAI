'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import {
    ArrowLeft,
    ExternalLink,
    Loader2,
    Sparkles,
    Share2,
    BookmarkPlus,
    Bookmark,
    MessageSquare,
    Clock,
    Globe,
    User,
    Quote
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface ContentBlock {
    type: 'heading' | 'subheading' | 'paragraph' | 'quote';
    text: string;
}

interface ArticleData {
    title: string;
    contentBlocks: ContentBlock[];
    description?: string;
    url: string;
    thumbnail?: string;
    source?: string;
    publishedAt?: string;
    author?: string;
}

// Function to highlight important elements in text
const formatText = (text: string): React.ReactNode => {
    // Pattern for dates (various formats)
    const datePattern = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/gi;

    // Pattern for quoted text
    const quotePattern = /"([^"]+)"/g;

    // Pattern for names (capitalized words that look like names)
    const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;

    // Pattern for numbers/percentages/money
    const numberPattern = /\$[\d,]+(?:\.\d{2})?|\d+(?:\.\d+)?%|£[\d,]+(?:\.\d{2})?|€[\d,]+(?:\.\d{2})?/g;

    // Split and process
    let result = text;
    const elements: { start: number; end: number; type: string; content: string }[] = [];

    // Find all matches
    let match;

    // Dates
    while ((match = datePattern.exec(text)) !== null) {
        elements.push({ start: match.index, end: match.index + match[0].length, type: 'date', content: match[0] });
    }

    // Quoted text
    while ((match = quotePattern.exec(text)) !== null) {
        elements.push({ start: match.index, end: match.index + match[0].length, type: 'quote', content: match[0] });
    }

    // Numbers/money/percentages
    while ((match = numberPattern.exec(text)) !== null) {
        elements.push({ start: match.index, end: match.index + match[0].length, type: 'number', content: match[0] });
    }

    // Sort by position
    elements.sort((a, b) => a.start - b.start);

    // Remove overlapping elements
    const filtered: typeof elements = [];
    for (const el of elements) {
        const lastEl = filtered[filtered.length - 1];
        if (!lastEl || el.start >= lastEl.end) {
            filtered.push(el);
        }
    }

    // Build result
    if (filtered.length === 0) {
        return text;
    }

    const parts: React.ReactNode[] = [];
    let lastEnd = 0;

    filtered.forEach((el, i) => {
        // Add text before this element
        if (el.start > lastEnd) {
            parts.push(text.slice(lastEnd, el.start));
        }

        // Add formatted element
        if (el.type === 'quote') {
            parts.push(
                <span key={i} className="text-purple-600 dark:text-purple-400 italic">
                    {el.content}
                </span>
            );
        } else if (el.type === 'date') {
            parts.push(
                <span key={i} className="font-semibold text-blue-600 dark:text-blue-400">
                    {el.content}
                </span>
            );
        } else if (el.type === 'number') {
            parts.push(
                <span key={i} className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {el.content}
                </span>
            );
        }

        lastEnd = el.end;
    });

    // Add remaining text
    if (lastEnd < text.length) {
        parts.push(text.slice(lastEnd));
    }

    return parts;
};

function ArticleContent() {
    const searchParams = useSearchParams();
    const url = searchParams.get('url');
    const title = searchParams.get('title');
    const thumbnail = searchParams.get('thumbnail');

    const [article, setArticle] = useState<ArticleData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [summary, setSummary] = useState<string | null>(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isBookmarking, setIsBookmarking] = useState(false);

    useEffect(() => {
        if (!url) {
            setError('No article URL provided');
            setIsLoading(false);
            return;
        }

        const fetchArticle = async () => {
            try {
                setIsLoading(true);
                const res = await fetch('/api/article-content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url }),
                });

                if (!res.ok) throw new Error('Failed to fetch article');

                const data = await res.json();
                setArticle({
                    title: data.title || title || 'Untitled Article',
                    contentBlocks: data.contentBlocks || [],
                    description: data.description,
                    url: url,
                    thumbnail: data.thumbnail || thumbnail || undefined,
                    source: data.source || new URL(url).hostname,
                    publishedAt: data.publishedAt,
                    author: data.author,
                });
            } catch (err) {
                console.error('Error fetching article:', err);
                setError('Failed to load article content');
            } finally {
                setIsLoading(false);
            }
        };

        const checkBookmarkStatus = async () => {
            if (!url) return;
            try {
                const res = await fetch(`/api/bookmarks?url=${encodeURIComponent(url)}`);
                if (res.ok) {
                    const data = await res.json();
                    setIsBookmarked(data.isBookmarked);
                }
            } catch (err) {
                // Silently fail - user might not be logged in
            }
        };

        fetchArticle();
        checkBookmarkStatus();
    }, [url, title, thumbnail]);

    const handleSummarize = async () => {
        if (!article?.contentBlocks.length) return;

        setIsSummarizing(true);
        try {
            const content = article.contentBlocks.map(b => b.text).join('\n\n');
            const res = await fetch('/api/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    url: article.url,
                    title: article.title
                }),
            });

            if (!res.ok) throw new Error('Failed to summarize');

            const data = await res.json();
            setSummary(data.summary);
        } catch (err) {
            console.error('Error summarizing:', err);
            toast.error('Failed to generate summary');
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleShare = async () => {
        if (navigator.share && article) {
            await navigator.share({
                title: article.title,
                url: article.url,
            });
        } else {
            await navigator.clipboard.writeText(article?.url || '');
            toast.success('Link copied to clipboard');
        }
    };

    const handleDiscuss = () => {
        if (article) {
            window.open(`/?q=Let's discuss this article: ${article.url}`, '_blank');
        }
    };

    const handleBookmark = async () => {
        if (!article) return;

        setIsBookmarking(true);
        try {
            if (isBookmarked) {
                // Remove bookmark
                const res = await fetch(`/api/bookmarks?url=${encodeURIComponent(article.url)}`, {
                    method: 'DELETE',
                });
                if (res.ok) {
                    setIsBookmarked(false);
                    toast.success('Removed from saved articles');
                } else {
                    const data = await res.json();
                    if (data.error === 'Unauthorized') {
                        toast.error('Please log in to save articles');
                    } else {
                        throw new Error('Failed to remove bookmark');
                    }
                }
            } else {
                // Add bookmark
                const res = await fetch('/api/bookmarks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: article.url,
                        title: article.title,
                        thumbnail: article.thumbnail,
                        source: article.source,
                    }),
                });
                if (res.ok) {
                    setIsBookmarked(true);
                    toast.success('Article saved!');
                } else {
                    const data = await res.json();
                    if (data.error === 'Unauthorized') {
                        toast.error('Please log in to save articles');
                    } else {
                        throw new Error('Failed to save article');
                    }
                }
            }
        } catch (err) {
            console.error('Bookmark error:', err);
            toast.error('Something went wrong');
        } finally {
            setIsBookmarking(false);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    // Render a content block
    const renderBlock = (block: ContentBlock, index: number) => {
        switch (block.type) {
            case 'heading':
                return (
                    <h2 key={index} className="text-xl sm:text-2xl font-bold text-black dark:text-white mt-8 mb-4 border-l-4 border-purple-500 pl-4">
                        {block.text}
                    </h2>
                );
            case 'subheading':
                return (
                    <h3 key={index} className="text-lg sm:text-xl font-semibold text-black/90 dark:text-white/90 mt-6 mb-3">
                        {block.text}
                    </h3>
                );
            case 'quote':
                return (
                    <blockquote key={index} className="my-6 pl-4 border-l-4 border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20 py-4 pr-4 rounded-r-lg">
                        <div className="flex items-start space-x-2">
                            <Quote size={20} className="text-purple-500 flex-shrink-0 mt-1" />
                            <p className="text-black/80 dark:text-white/80 italic text-base sm:text-lg leading-relaxed">
                                {formatText(block.text)}
                            </p>
                        </div>
                    </blockquote>
                );
            case 'paragraph':
            default:
                return (
                    <p key={index} className="text-black/80 dark:text-white/80 text-base sm:text-lg leading-[1.8] mb-5">
                        {formatText(block.text)}
                    </p>
                );
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-light-primary dark:bg-dark-primary">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                    <p className="text-black/60 dark:text-white/60 text-sm">Loading article...</p>
                </div>
            </div>
        );
    }

    if (error || !article) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-light-primary dark:bg-dark-primary">
                <div className="text-center space-y-4 p-6">
                    <p className="text-red-500">{error || 'Article not found'}</p>
                    <Link href="/discover" className="text-purple-500 hover:underline">
                        ← Back to Discover
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-light-primary dark:bg-dark-primary">
            {/* Header - Fixed */}
            <header className="sticky top-0 z-20 bg-light-primary/95 dark:bg-dark-primary/95 backdrop-blur-md border-b border-light-200/50 dark:border-dark-200/50">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                    <Link
                        href="/discover"
                        className="flex items-center space-x-2 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors"
                    >
                        <ArrowLeft size={18} />
                        <span className="text-sm font-medium hidden sm:inline">Back</span>
                    </Link>

                    <div className="flex items-center space-x-1">
                        <button
                            onClick={handleShare}
                            className="p-2 rounded-full hover:bg-light-200 dark:hover:bg-dark-200 transition-colors"
                            title="Share"
                        >
                            <Share2 size={18} className="text-black/60 dark:text-white/60" />
                        </button>
                        <button
                            onClick={handleBookmark}
                            disabled={isBookmarking}
                            className={`p-2 rounded-full hover:bg-light-200 dark:hover:bg-dark-200 transition-colors ${isBookmarking ? 'opacity-50' : ''}`}
                            title={isBookmarked ? 'Remove from saved' : 'Save article'}
                        >
                            {isBookmarked ? (
                                <Bookmark size={18} className="text-purple-500 fill-purple-500" />
                            ) : (
                                <BookmarkPlus size={18} className="text-black/60 dark:text-white/60" />
                            )}
                        </button>
                        <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-full hover:bg-light-200 dark:hover:bg-dark-200 transition-colors"
                            title="Open original"
                        >
                            <ExternalLink size={18} className="text-black/60 dark:text-white/60" />
                        </a>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Thumbnail */}
                {article.thumbnail && (
                    <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] rounded-xl sm:rounded-2xl overflow-hidden mb-6 shadow-lg">
                        <img
                            src={article.thumbnail}
                            alt={article.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    </div>
                )}

                {/* Source & Date */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-black/50 dark:text-white/50 mb-4">
                    <div className="flex items-center space-x-1.5 bg-light-secondary dark:bg-dark-secondary px-3 py-1.5 rounded-full">
                        <Globe size={12} />
                        <span className="font-medium">{article.source}</span>
                    </div>
                    {article.publishedAt && (
                        <div className="flex items-center space-x-1.5">
                            <Clock size={12} />
                            <span>{formatDate(article.publishedAt)}</span>
                        </div>
                    )}
                    {article.author && (
                        <div className="flex items-center space-x-1.5">
                            <User size={12} />
                            <span className="font-medium">{article.author}</span>
                        </div>
                    )}
                </div>

                {/* Title */}
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black dark:text-white leading-tight mb-6">
                    {article.title}
                </h1>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 pb-6 border-b border-light-200/60 dark:border-dark-200/60">
                    <button
                        onClick={handleSummarize}
                        disabled={isSummarizing}
                        className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm font-medium hover:opacity-90 transition shadow-lg shadow-purple-500/20 disabled:opacity-50"
                    >
                        {isSummarizing ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Sparkles size={16} />
                        )}
                        <span>{isSummarizing ? 'Summarizing...' : 'AI Summary'}</span>
                    </button>

                    <button
                        onClick={handleDiscuss}
                        className="flex items-center space-x-2 px-4 py-2.5 bg-light-secondary dark:bg-dark-secondary text-black dark:text-white rounded-full text-sm font-medium hover:bg-light-200 dark:hover:bg-dark-200 transition border border-light-200 dark:border-dark-200"
                    >
                        <MessageSquare size={16} />
                        <span>Discuss with AI</span>
                    </button>
                </div>

                {/* AI Summary */}
                {summary && (
                    <div className="mb-8 p-5 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200/50 dark:border-purple-800/50 rounded-xl">
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="p-1.5 bg-purple-500/10 rounded-lg">
                                <Sparkles size={16} className="text-purple-500" />
                            </div>
                            <h3 className="font-bold text-purple-700 dark:text-purple-300">AI Summary</h3>
                        </div>
                        <div className="text-black/80 dark:text-white/80 text-sm sm:text-base leading-relaxed space-y-4">
                            {summary.split('\n').filter(p => p.trim()).map((paragraph, i) => (
                                <p key={i}>{paragraph}</p>
                            ))}
                        </div>
                    </div>
                )}

                {/* Article Content */}
                <article className="article-content">
                    {article.contentBlocks.length > 0 ? (
                        article.contentBlocks.map((block, i) => renderBlock(block, i))
                    ) : (
                        <p className="text-black/60 dark:text-white/60 text-center py-8">
                            Unable to extract article content. Please visit the original source.
                        </p>
                    )}
                </article>

                {/* Source Link Footer */}
                <div className="mt-10 pt-6 border-t border-light-200/60 dark:border-dark-200/60">
                    <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-purple-500 hover:text-purple-600 transition-colors text-sm font-medium"
                    >
                        <ExternalLink size={14} />
                        <span>Read original article at {article.source}</span>
                    </a>
                </div>
            </main>
        </div>
    );
}

export default function ArticlePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-light-primary dark:bg-dark-primary">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        }>
            <ArticleContent />
        </Suspense>
    );
}
