import { NextRequest, NextResponse } from 'next/server';

// Fetch and parse article content from a URL
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url } = body;

        if (!url) {
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400 }
            );
        }

        let html = '';
        let fetchError = null;

        // Try fetching with browser-like headers
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1',
                },
            });

            if (response.ok) {
                html = await response.text();
            } else {
                fetchError = `HTTP ${response.status}`;
            }
        } catch (err: any) {
            fetchError = err.message;
        }

        // If we couldn't fetch, return a fallback response
        if (!html) {
            console.warn(`[article-content] Could not fetch ${url}: ${fetchError}`);
            // Return a fallback that allows viewing at original source
            const hostname = new URL(url).hostname.replace('www.', '');
            return NextResponse.json({
                title: 'Article Unavailable',
                contentBlocks: [{
                    type: 'paragraph',
                    text: `This article could not be loaded directly. Some websites restrict automated access. Please click "Read original article" below to view the full content on ${hostname}.`
                }],
                description: '',
                thumbnail: null,
                source: hostname,
                publishedAt: null,
                author: null,
                url,
            });
        }


        // Extract title from og:title or title tag
        const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)
            || html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:title"/i);
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = ogTitleMatch ? ogTitleMatch[1].trim() : (titleMatch ? titleMatch[1].trim() : '');

        // Extract og:description for a clean summary
        const ogDescMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i)
            || html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:description"/i)
            || html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
        const description = ogDescMatch ? ogDescMatch[1].trim() : '';

        // Try to extract article body from JSON-LD structured data (works on JS-rendered sites)
        let jsonLdContent = '';
        const jsonLdMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
        for (const match of jsonLdMatches) {
            try {
                const jsonData = JSON.parse(match[1]);
                const items = Array.isArray(jsonData) ? jsonData : [jsonData];
                for (const item of items) {
                    if (item['@type'] === 'NewsArticle' || item['@type'] === 'Article') {
                        if (item.articleBody) {
                            jsonLdContent = item.articleBody;
                            break;
                        }
                    }
                }
            } catch (e) {
                // JSON parse failed, continue
            }
        }


        // Clean up HTML for content extraction
        let cleanHtml = html;

        // Remove script, style, nav, header, footer, aside elements
        cleanHtml = cleanHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        cleanHtml = cleanHtml.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
        cleanHtml = cleanHtml.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
        cleanHtml = cleanHtml.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
        cleanHtml = cleanHtml.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
        cleanHtml = cleanHtml.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
        cleanHtml = cleanHtml.replace(/<!--[\s\S]*?-->/gi, '');

        // Try to find article content in common article containers
        let articleContent = '';

        // Try article tag first
        const articleMatch = cleanHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
        if (articleMatch) {
            articleContent = articleMatch[1];
        } else {
            // Try common content divs
            const contentPatterns = [
                /<div[^>]*class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
                /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
                /<div[^>]*class="[^"]*post[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
                /<main[^>]*>([\s\S]*?)<\/main>/i,
            ];

            for (const pattern of contentPatterns) {
                const match = cleanHtml.match(pattern);
                if (match && match[1].length > 500) {
                    articleContent = match[1];
                    break;
                }
            }
        }

        // Fallback to all paragraphs if no article container found
        if (!articleContent) {
            articleContent = cleanHtml;
        }

        // Helper function to clean text
        const cleanText = (text: string): string => {
            return text
                .replace(/<[^>]+>/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'")
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&#\d+;/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        };

        // Extract structured content with headings and paragraphs
        const contentBlocks: { type: 'heading' | 'subheading' | 'paragraph' | 'quote'; text: string }[] = [];

        // Extract headings (h2, h3)
        const h2Matches = articleContent.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi);
        const h3Matches = articleContent.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi);

        // Get positions and content for ordering
        interface ContentItem {
            position: number;
            type: 'heading' | 'subheading' | 'paragraph' | 'quote';
            text: string;
        }

        const items: ContentItem[] = [];

        // Helper to check if text is a navigation/sidebar heading
        const isNavigationHeading = (text: string): boolean => {
            const navPatterns = [
                /^More in:/i,
                /^More from/i,
                /^Related/i,
                /^Most Popular/i,
                /^Trending/i,
                /^Read Next/i,
                /^Also Read/i,
                /^You May Also Like/i,
                /^Recommended/i,
                /^Popular/i,
                /^Latest/i,
                /^Top Stories/i,
                /^Newsletter/i,
                /^Subscribe/i,
                /^Follow Us/i,
                /^Share/i,
                /^Comments/i,
                /^Tags/i,
                /^Categories/i,
                /Daily$/i,
                /Weekly$/i,
                /^The .+ Daily$/i,
                /^Sign Up/i,
                /^Get the/i,
            ];
            return navPatterns.some(pattern => pattern.test(text.trim()));
        };

        for (const match of h2Matches) {
            const text = cleanText(match[1]);
            if (text.length > 5 && text.length < 200 && !isNavigationHeading(text)) {
                items.push({
                    position: match.index || 0,
                    type: 'heading',
                    text
                });
            }
        }

        for (const match of h3Matches) {
            const text = cleanText(match[1]);
            if (text.length > 5 && text.length < 200 && !isNavigationHeading(text)) {
                items.push({
                    position: match.index || 0,
                    type: 'subheading',
                    text
                });
            }
        }

        // Extract blockquotes
        const blockquoteMatches = articleContent.matchAll(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi);
        for (const match of blockquoteMatches) {
            const text = cleanText(match[1]);
            if (text.length > 20) {
                items.push({
                    position: match.index || 0,
                    type: 'quote',
                    text
                });
            }
        }

        // Extract paragraphs
        const pMatches = articleContent.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);

        for (const match of pMatches) {
            const text = cleanText(match[1]);

            // Filter out navigation text, short text, and common unwanted patterns
            if (text.length > 60 &&
                !text.includes('Sign In') &&
                !text.includes('Subscribe') &&
                !text.includes('Newsletter') &&
                !text.includes('Read More') &&
                !text.includes('Advertisement') &&
                !text.includes('Cookie') &&
                !text.includes('see all updates') &&
                !text.includes('Part Of') &&
                !text.match(/^(Menu|Home|About|Contact|Privacy|Terms)/i) &&
                !text.match(/^[A-Za-z\s]+\d{1,2},\s*\d{4}.*UTC.*Image:/i)) {
                items.push({
                    position: match.index || 0,
                    type: 'paragraph',
                    text
                });
            }
        }

        // Sort by position and deduplicate
        items.sort((a, b) => a.position - b.position);

        // Remove duplicate content
        const seen = new Set<string>();
        const uniqueItems = items.filter(item => {
            const key = item.text.substring(0, 50);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // Build content blocks
        for (const item of uniqueItems) {
            contentBlocks.push({
                type: item.type,
                text: item.text
            });
        }

        // If no structured content from HTML, try fallbacks
        if (contentBlocks.length === 0 || contentBlocks.every(b => b.type === 'heading' || b.type === 'subheading')) {
            // Clear any heading-only content
            if (contentBlocks.every(b => b.type === 'heading' || b.type === 'subheading')) {
                contentBlocks.length = 0;
            }

            // Priority 1: Use JSON-LD articleBody (works on JS sites like CNBC)
            if (jsonLdContent) {
                // Split JSON-LD content into paragraphs
                const paragraphs = jsonLdContent.split(/\n\n|\n/).filter((p: string) => p.trim().length > 50);
                for (const p of paragraphs) {
                    contentBlocks.push({
                        type: 'paragraph',
                        text: p.trim()
                    });
                }
            }

            // Priority 2: Use og:description as a summary
            if (contentBlocks.length === 0 && description) {
                contentBlocks.push({
                    type: 'paragraph',
                    text: description
                });
                // Add a note about visiting original
                contentBlocks.push({
                    type: 'paragraph',
                    text: 'For the full article content, please click "Read original article" below.'
                });
            }
        }

        // Extract og:image for thumbnail
        const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i)
            || html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"/i);
        const thumbnail = ogImageMatch ? ogImageMatch[1] : null;

        // Extract site name
        const siteNameMatch = html.match(/<meta[^>]*property="og:site_name"[^>]*content="([^"]+)"/i);
        const source = siteNameMatch ? siteNameMatch[1] : new URL(url).hostname.replace('www.', '');

        // Extract published date
        const dateMatch = html.match(/<meta[^>]*property="article:published_time"[^>]*content="([^"]+)"/i)
            || html.match(/<time[^>]*datetime="([^"]+)"/i)
            || html.match(/"datePublished"\s*:\s*"([^"]+)"/i);
        const publishedAt = dateMatch ? dateMatch[1] : null;

        // Extract author
        const authorMatch = html.match(/<meta[^>]*name="author"[^>]*content="([^"]+)"/i)
            || html.match(/"author"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i)
            || html.match(/"author"\s*:\s*"([^"]+)"/i);
        const author = authorMatch ? authorMatch[1] : null;

        return NextResponse.json({
            title: title.replace(/\s*\|.*$/, '').replace(/\s*-\s*[^-]+$/, '').trim(),
            contentBlocks,
            description,
            thumbnail,
            source,
            publishedAt,
            author,
            url,
        });
    } catch (error) {
        console.error('Error fetching article:', error);
        return NextResponse.json(
            { error: 'Failed to fetch article content' },
            { status: 500 }
        );
    }
}
