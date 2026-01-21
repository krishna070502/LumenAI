'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import jsPDF from 'jspdf';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Bold,
    Italic,
    UnderlineIcon,
    Strikethrough,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Highlighter,
    Undo,
    Redo,
    Loader2,
    Sparkles,
    Download,
    Share2,
    Check,
    X,
    FileText,
    Wand2,
    ArrowRightCircle,
    Pencil,
    Copy,
    Link2,
    Send,
    MessageSquare,
    PanelRightClose,
    Plus,
} from 'lucide-react';
import { toast } from 'sonner';

interface Space {
    id: string;
    name: string;
    icon: string;
}

interface Document {
    id: string;
    title: string;
    content: any;
    spaceId: string;
}

const DocumentEditor = () => {
    const params = useParams();
    const router = useRouter();
    const spaceId = params.spaceId as string;
    const docId = params.docId as string;

    const [space, setSpace] = useState<Space | null>(null);
    const [doc, setDoc] = useState<Document | null>(null);
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // AI Modal state
    const [showAIModal, setShowAIModal] = useState(false);
    const [aiMode, setAIMode] = useState<'generate' | 'assist' | 'continue' | 'improve'>('generate');
    const [aiPrompt, setAIPrompt] = useState('');
    const [aiGenerating, setAIGenerating] = useState(false);

    // Share Modal state
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [creatingShare, setCreatingShare] = useState(false);

    // AI Sidebar state
    const [showAISidebar, setShowAISidebar] = useState(true);
    const [aiChatInput, setAIChatInput] = useState('');
    const [aiChatMessages, setAIChatMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [aiChatLoading, setAIChatLoading] = useState(false);

    // Refs for auto-save to avoid stale closures
    const titleRef = useRef(title);
    const contentRef = useRef<any>(null);

    // Update refs when state changes
    useEffect(() => {
        titleRef.current = title;
    }, [title]);

    const editor = useEditor({
        immediatelyRender: false, // Prevent SSR hydration mismatch
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Start writing, or use AI to generate content...',
            }),
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Highlight.configure({
                multicolor: true,
            }),
            Link.configure({
                openOnClick: false,
            }),
        ],
        content: '',
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none w-full focus:outline-none min-h-[60vh] text-white/90 leading-relaxed prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-p:my-2 prose-headings:mb-4 prose-headings:mt-8 first:prose-headings:mt-0',
            },
        },
        onUpdate: ({ editor }) => {
            contentRef.current = editor.getJSON();
            debouncedSave(editor.getJSON(), editor.getText());
        },
    });

    // Debounced save function
    const debouncedSave = useCallback(
        (() => {
            let timeout: NodeJS.Timeout;
            return (content?: any, plainText?: string, docTitle?: string) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    saveDocument(content, plainText, docTitle);
                }, 1000);
            };
        })(),
        [docId] // Only depend on docId
    );

    // Effect for auto-saving title as you type
    useEffect(() => {
        // Don't save if we're still loading the initial document
        if (!loading) {
            debouncedSave(undefined, undefined, title || 'Untitled');
        }
    }, [title, loading, debouncedSave]);

    const saveDocument = async (content?: any, plainText?: string, docTitle?: string) => {
        if (!docId) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/documents/${docId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: docTitle ?? titleRef.current,
                    content: content ?? editor?.getJSON(),
                    plainText: plainText ?? editor?.getText(),
                }),
            });
            if (res.ok) {
                setLastSaved(new Date());
            }
        } catch (error) {
            console.error('Save error:', error);
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        const fetchDocument = async () => {
            try {
                const res = await fetch(`/api/documents/${docId}`);
                if (res.ok) {
                    const data = await res.json();
                    setDoc(data.document);
                    setSpace(data.space);
                    setTitle(data.document.title);
                    if (editor && data.document.content) {
                        editor.commands.setContent(data.document.content);
                    }
                } else {
                    router.push(`/space/${spaceId}/docs`);
                }
            } catch (error) {
                console.error('Error fetching document:', error);
            } finally {
                setLoading(false);
            }
        };

        if (docId && editor) {
            fetchDocument();
        }
    }, [docId, editor]);

    const handleTitleBlur = () => {
        saveDocument(undefined, undefined, title);
    };

    // AI Generation
    const handleAIGenerate = async () => {
        if (!aiPrompt.trim() && aiMode !== 'continue' && aiMode !== 'improve') {
            toast.error('Please enter a prompt');
            return;
        }

        setAIGenerating(true);
        try {
            const res = await fetch(`/api/documents/${docId}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: aiPrompt,
                    mode: aiMode,
                    existingContent: editor?.getText() || '',
                }),
            });

            if (res.ok) {
                const data = await res.json();

                // Convert markdown to Tiptap-compatible HTML/content
                if (aiMode === 'generate') {
                    // Replace entire document
                    editor?.commands.setContent(convertMarkdownToHTML(data.content));
                } else {
                    // Insert at cursor position
                    editor?.commands.insertContent(convertMarkdownToHTML(data.content));
                }

                setShowAIModal(false);
                setAIPrompt('');
                toast.success('Content generated!');
            } else {
                toast.error('Failed to generate content');
            }
        } catch (error) {
            toast.error('Error generating content');
        } finally {
            setAIGenerating(false);
        }
    };


    // Create share link
    const handleCreateShare = async () => {
        setCreatingShare(true);
        try {
            const res = await fetch(`/api/documents/${docId}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ permission: 'view' }),
            });

            if (res.ok) {
                const data = await res.json();
                setShareUrl(data.shareUrl);
                setShowShareModal(true);
            } else {
                toast.error('Failed to create share link');
            }
        } catch (error) {
            toast.error('Error creating share link');
        } finally {
            setCreatingShare(false);
        }
    };

    const copyShareLink = () => {
        navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
    };

    // PDF Export handler
    const handleExportPDF = () => {
        if (!editor) return;

        const doc = new jsPDF();
        const titleText = title || 'Untitled Document';
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);
        let y = 30;

        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        const titleLines = doc.splitTextToSize(titleText, contentWidth);
        titleLines.forEach((line: string) => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(line, margin, y);
            y += 10;
        });
        y += 5;

        // Content parsing from Tiptap JSON
        const json = editor.getJSON();
        if (!json.content) return;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');

        json.content.forEach((node: any) => {
            if (y > 270) { doc.addPage(); y = 20; }

            switch (node.type) {
                case 'heading': {
                    const level = node.attrs?.level || 1;
                    const size = level === 1 ? 20 : level === 2 ? 16 : 14;
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(size);
                    const text = node.content?.map((c: any) => c.text).join('') || '';
                    const lines = doc.splitTextToSize(text, contentWidth);
                    lines.forEach((line: string) => {
                        if (y > 270) { doc.addPage(); y = 20; }
                        doc.text(line, margin, y);
                        y += size * 0.6;
                    });
                    y += 5;
                    break;
                }
                case 'paragraph': {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(11);
                    const text = node.content?.map((c: any) => c.text).join('') || '';
                    if (!text.trim()) { y += 5; break; }
                    const lines = doc.splitTextToSize(text, contentWidth);
                    lines.forEach((line: string) => {
                        if (y > 270) { doc.addPage(); y = 20; }
                        doc.text(line, margin, y);
                        y += 6;
                    });
                    y += 4;
                    break;
                }
                case 'bulletList':
                case 'orderedList': {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(11);
                    node.content?.forEach((item: any, idx: number) => {
                        const marker = node.type === 'bulletList' ? '• ' : `${idx + 1}. `;
                        const text = item.content?.[0]?.content?.map((c: any) => c.text).join('') || '';
                        const lines = doc.splitTextToSize(marker + text, contentWidth - 5);
                        lines.forEach((line: string, lIdx: number) => {
                            if (y > 270) { doc.addPage(); y = 20; }
                            doc.text(lIdx === 0 ? line : '  ' + line, margin + 5, y);
                            y += 6;
                        });
                    });
                    y += 4;
                    break;
                }
            }
        });

        doc.save(`${titleText.replace(/[^a-z0-9]/gi, '_')}.pdf`);
        toast.success('PDF exported successfully!');
    };

    // AI Sidebar chat handler - directly inserts into document
    const handleAIChatSend = async () => {
        if (!aiChatInput.trim() || aiChatLoading) return;

        const userMessage = aiChatInput.trim();
        setAIChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setAIChatInput('');
        setAIChatLoading(true);

        try {
            const res = await fetch(`/api/documents/${docId}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: userMessage,
                    mode: 'assist',
                    existingContent: editor?.getText() || '',
                }),
            });

            if (res.ok) {
                const data = await res.json();
                // Convert markdown to HTML and insert into document
                const htmlContent = convertMarkdownToHTML(data.content);
                editor?.commands.insertContent(htmlContent, { parseOptions: { preserveWhitespace: false } });
                setAIChatMessages(prev => [...prev, { role: 'assistant', content: '✅ Content added to document' }]);
                toast.success('Content added to document!');

            } else {
                setAIChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
            }
        } catch (error) {
            setAIChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
        } finally {
            setAIChatLoading(false);
        }
    };

    // Convert markdown to HTML for Tiptap to parse
    const convertMarkdownToHTML = (markdown: string): string => {
        const lines = markdown.split('\n');
        let html = '';
        let inList = false;
        let currentListType = ''; // 'ul' or 'ol'

        const parseInline = (text: string) => {
            return text
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>');
        };

        const stripHeadingSymbols = (text: string) => {
            return text.replace(/^(#{1,6})\s*/, '').replace(/\s*(#{1,6})$/, '').trim();
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trimEnd();
            const trimmedLine = line.trim();
            const nextLine = (lines[i + 1] || '').trim();

            if (!trimmedLine) {
                if (inList) {
                    html += `</${currentListType}>`;
                    inList = false;
                }
                continue;
            }

            // Separators (standalone === or ---)
            if (trimmedLine.match(/^[=\-]{3,}$/)) continue;

            // Underline Headings (strip hashes if present)
            if (nextLine.match(/^={3,}$/)) {
                if (inList) { html += `</${currentListType}>`; inList = false; }
                const cleanContent = stripHeadingSymbols(trimmedLine.replace(/^\*\*|^\*|\*\*$|\*$/g, '').trim());
                html += `<h1>${parseInline(cleanContent)}</h1>`;
                i++; continue;
            }
            if (nextLine.match(/^-{3,}$/)) {
                if (inList) { html += `</${currentListType}>`; inList = false; }
                const cleanContent = stripHeadingSymbols(trimmedLine.replace(/^\*\*|^\*|\*\*$|\*$/g, '').trim());
                html += `<h2>${parseInline(cleanContent)}</h2>`;
                i++; continue;
            }

            // Hash Headings (handles indented and bold-wrapped headings)
            const cleanLine = trimmedLine.replace(/^\*\*|^\*|\*\*$|\*$/g, '').trim();
            const hMatch = cleanLine.match(/^(#{1,6})\s*(.+)$/);
            if (hMatch) {
                if (inList) { html += `</${currentListType}>`; inList = false; }
                const level = hMatch[1].length;
                const cleanContent = stripHeadingSymbols(hMatch[2]);
                html += `<h${level}>${parseInline(cleanContent)}</h${level}>`;
                continue;
            }

            // Lists (use trimmedLine for matching)
            const ulMatch = trimmedLine.match(/^[-*]\s+(.+)$/);
            const olMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);

            if (ulMatch) {
                if (!inList || currentListType !== 'ul') {
                    if (inList) html += `</${currentListType}>`;
                    html += '<ul>';
                    inList = true;
                    currentListType = 'ul';
                }
                html += `<li>${parseInline(ulMatch[1])}</li>`;
                continue;
            }

            if (olMatch) {
                if (!inList || currentListType !== 'ol') {
                    if (inList) html += `</${currentListType}>`;
                    html += '<ol>';
                    inList = true;
                    currentListType = 'ol';
                }
                html += `<li>${parseInline(olMatch[1])}</li>`;
                continue;
            }

            // Default Paragraph
            if (inList) {
                html += `</${currentListType}>`;
                inList = false;
            }
            html += `<p>${parseInline(trimmedLine)}</p>`;
        }

        if (inList) html += `</${currentListType}>`;
        return html;
    };

    // Convert markdown to properly formatted Tiptap content (legacy, kept for reference)
    const convertMarkdownToTiptap = (markdown: string): any => {

        const lines = markdown.split('\n');
        const content: any[] = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];
            const trimmed = line.trim();
            const nextLine = lines[i + 1]?.trim() || '';

            // Skip empty lines and separator lines (=== or ---)
            if (!trimmed || /^[=\-]{3,}$/.test(trimmed)) {
                i++;
                continue;
            }

            // Underline-style Heading 1: Title followed by ===
            if (/^[=]{3,}$/.test(nextLine)) {
                content.push({
                    type: 'heading',
                    attrs: { level: 1 },
                    content: [{ type: 'text', text: trimmed }]
                });
                i += 2;
                continue;
            }

            // Underline-style Heading 2: Title followed by ---
            if (/^[-]{3,}$/.test(nextLine)) {
                content.push({
                    type: 'heading',
                    attrs: { level: 2 },
                    content: [{ type: 'text', text: trimmed }]
                });
                i += 2;
                continue;
            }

            // Heading 1: # Title
            if (trimmed.startsWith('# ')) {
                content.push({
                    type: 'heading',
                    attrs: { level: 1 },
                    content: [{ type: 'text', text: trimmed.slice(2) }]
                });
                i++;
                continue;
            }

            // Heading 2: ## Title  
            if (trimmed.startsWith('## ')) {
                content.push({
                    type: 'heading',
                    attrs: { level: 2 },
                    content: [{ type: 'text', text: trimmed.slice(3) }]
                });
                i++;
                continue;
            }

            // Heading 3: ### Title
            if (trimmed.startsWith('### ')) {
                content.push({
                    type: 'heading',
                    attrs: { level: 3 },
                    content: [{ type: 'text', text: trimmed.slice(4) }]
                });
                i++;
                continue;
            }

            // Bold heading style: **Title**: Description or **Title** alone
            if (trimmed.startsWith('**') && trimmed.includes('**')) {
                const boldMatch = trimmed.match(/^\*\*([^*]+)\*\*(.*)$/);
                if (boldMatch) {
                    const boldText = boldMatch[1];
                    const rest = boldMatch[2].replace(/^:\s*/, '').trim();

                    if (rest) {
                        // Bold title with description - treat as bullet point
                        const lastItem = content[content.length - 1];
                        const listItem = {
                            type: 'listItem',
                            content: [{
                                type: 'paragraph',
                                content: [
                                    { type: 'text', marks: [{ type: 'bold' }], text: boldText },
                                    { type: 'text', text: `: ${rest}` }
                                ]
                            }]
                        };
                        if (lastItem?.type === 'bulletList') {
                            lastItem.content.push(listItem);
                        } else {
                            content.push({ type: 'bulletList', content: [listItem] });
                        }
                    } else {
                        // Just bold text - make it a subheading
                        content.push({
                            type: 'heading',
                            attrs: { level: 3 },
                            content: [{ type: 'text', text: boldText }]
                        });
                    }
                    i++;
                    continue;
                }
            }

            // Bullet list item
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const lastItem = content[content.length - 1];
                const itemText = trimmed.slice(2);
                const textContent = parseInlineFormatting(itemText);
                const listItem = {
                    type: 'listItem',
                    content: [{ type: 'paragraph', content: textContent }]
                };
                if (lastItem?.type === 'bulletList') {
                    lastItem.content.push(listItem);
                } else {
                    content.push({ type: 'bulletList', content: [listItem] });
                }
                i++;
                continue;
            }

            // Numbered list item
            if (/^\d+\.\s/.test(trimmed)) {
                const text = trimmed.replace(/^\d+\.\s/, '');
                const lastItem = content[content.length - 1];
                const textContent = parseInlineFormatting(text);
                const listItem = {
                    type: 'listItem',
                    content: [{ type: 'paragraph', content: textContent }]
                };
                if (lastItem?.type === 'orderedList') {
                    lastItem.content.push(listItem);
                } else {
                    content.push({ type: 'orderedList', content: [listItem] });
                }
                i++;
                continue;
            }

            // Regular paragraph
            const textContent = parseInlineFormatting(trimmed);
            content.push({ type: 'paragraph', content: textContent });
            i++;
        }

        return { type: 'doc', content };
    };


    // Parse inline markdown formatting (bold, italic)
    const parseInlineFormatting = (text: string): any[] => {
        const result: any[] = [];
        let current = text;

        // Simple approach: just return plain text for now
        // More complex parsing can be added later
        const parts = current.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

        for (const part of parts) {
            if (!part) continue;
            if (part.startsWith('**') && part.endsWith('**')) {
                result.push({ type: 'text', marks: [{ type: 'bold' }], text: part.slice(2, -2) });
            } else if (part.startsWith('*') && part.endsWith('*')) {
                result.push({ type: 'text', marks: [{ type: 'italic' }], text: part.slice(1, -1) });
            } else {
                result.push({ type: 'text', text: part });
            }
        }

        return result.length > 0 ? result : [{ type: 'text', text }];
    };

    if (loading || !editor) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    const ToolbarButton = ({
        onClick,
        active,
        children,
        title: tooltip,
    }: {
        onClick: () => void;
        active?: boolean;
        children: React.ReactNode;
        title?: string;
    }) => (
        <button
            onClick={onClick}
            title={tooltip}
            className={`p-2 rounded-lg transition-colors ${active
                ? 'bg-purple-500/20 text-purple-400'
                : 'hover:bg-white/10 text-white/70'
                }`}
        >
            {children}
        </button>
    );

    const aiModes = [
        { id: 'generate', label: 'Generate Document', icon: FileText, desc: 'Create a full document from a topic' },
        { id: 'assist', label: 'Help Me Write', icon: Wand2, desc: 'Get AI help with writing' },
        { id: 'continue', label: 'Continue Writing', icon: ArrowRightCircle, desc: 'Continue from where you left off' },
        { id: 'improve', label: 'Improve Text', icon: Pencil, desc: 'Enhance and polish your writing' },
    ];

    return (
        <div className="h-screen flex flex-col overflow-hidden">
            {/* Header */}
            <div className="shrink-0 bg-[#191919] border-b border-white/10">
                <div className="flex items-center justify-between px-4 py-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                            onClick={() => router.push(`/space/${spaceId}/docs`)}
                            className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition"
                        >
                            <ArrowLeft size={20} className="text-white/70" />
                        </button>
                        {space && <span className="text-lg">{space.icon}</span>}
                        <span className="text-white/90 font-medium truncate">{title || 'Untitled'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {saving ? (
                            <span className="text-xs text-white/50 flex items-center gap-1">
                                <Loader2 size={12} className="animate-spin" />
                                Saving...
                            </span>
                        ) : lastSaved ? (
                            <span className="text-xs text-white/50 flex items-center gap-1">
                                <Check size={12} />
                                Saved
                            </span>
                        ) : null}
                        <div className="relative group">
                            <button
                                className="p-2 rounded-lg hover:bg-white/10 text-white/70"
                                title="Export"
                            >
                                <Download size={18} />
                            </button>
                            <div className="absolute right-0 top-full mt-1 w-40 py-1 bg-[#252525] border border-white/10 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                <button
                                    onClick={() => window.open(`/api/documents/${docId}/export?format=md`, '_blank')}
                                    className="w-full px-3 py-2 text-sm text-left text-white/80 hover:bg-white/10"
                                >
                                    📝 Markdown (.md)
                                </button>
                                <button
                                    onClick={() => window.open(`/api/documents/${docId}/export?format=docx`, '_blank')}
                                    className="w-full px-3 py-2 text-sm text-left text-white/80 hover:bg-white/10"
                                >
                                    📄 Word (.docx)
                                </button>
                                <button
                                    onClick={() => window.open(`/api/documents/${docId}/export?format=html`, '_blank')}
                                    className="w-full px-3 py-2 text-sm text-left text-white/80 hover:bg-white/10"
                                >
                                    🌐 HTML (.html)
                                </button>
                                <button
                                    onClick={() => window.open(`/api/documents/${docId}/export?format=txt`, '_blank')}
                                    className="w-full px-3 py-2 text-sm text-left text-white/80 hover:bg-white/10"
                                >
                                    📃 Text (.txt)
                                </button>
                                <button
                                    onClick={handleExportPDF}
                                    className="w-full px-3 py-2 text-sm text-left text-white/80 hover:bg-white/10 border-t border-white/5"
                                >
                                    📥 PDF Document (.pdf)
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={handleCreateShare}
                            disabled={creatingShare}
                            className="p-2 rounded-lg hover:bg-white/10 text-white/70"
                            title="Share"
                        >
                            {creatingShare ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
                        </button>
                        <button
                            onClick={() => setShowAISidebar(!showAISidebar)}
                            className={`flex items-center gap-2 px-3 py-1.5 text-white text-sm rounded-lg transition-all ${showAISidebar
                                ? 'bg-purple-600'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                                }`}
                            title="AI Assistant"
                        >
                            <Sparkles size={16} />
                            <span className="hidden sm:inline">AI</span>
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="shrink-0 flex items-center gap-1 px-4 py-2 border-t border-white/10 overflow-x-auto">
                    <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
                        <Undo size={16} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
                        <Redo size={16} />
                    </ToolbarButton>

                    <div className="w-px h-5 bg-white/20 mx-1" />

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        active={editor.isActive('heading', { level: 1 })}
                        title="Heading 1"
                    >
                        <Heading1 size={16} />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        active={editor.isActive('heading', { level: 2 })}
                        title="Heading 2"
                    >
                        <Heading2 size={16} />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        active={editor.isActive('heading', { level: 3 })}
                        title="Heading 3"
                    >
                        <Heading3 size={16} />
                    </ToolbarButton>

                    <div className="w-px h-5 bg-white/20 mx-1" />

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        active={editor.isActive('bold')}
                        title="Bold"
                    >
                        <Bold size={16} />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        active={editor.isActive('italic')}
                        title="Italic"
                    >
                        <Italic size={16} />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        active={editor.isActive('underline')}
                        title="Underline"
                    >
                        <UnderlineIcon size={16} />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        active={editor.isActive('strike')}
                        title="Strikethrough"
                    >
                        <Strikethrough size={16} />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHighlight().run()}
                        active={editor.isActive('highlight')}
                        title="Highlight"
                    >
                        <Highlighter size={16} />
                    </ToolbarButton>

                    <div className="w-px h-5 bg-white/20 mx-1" />

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        active={editor.isActive('bulletList')}
                        title="Bullet List"
                    >
                        <List size={16} />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        active={editor.isActive('orderedList')}
                        title="Numbered List"
                    >
                        <ListOrdered size={16} />
                    </ToolbarButton>

                    <div className="w-px h-5 bg-white/20 mx-1" />

                    <ToolbarButton
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                        active={editor.isActive({ textAlign: 'left' })}
                        title="Align Left"
                    >
                        <AlignLeft size={16} />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                        active={editor.isActive({ textAlign: 'center' })}
                        title="Align Center"
                    >
                        <AlignCenter size={16} />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                        active={editor.isActive({ textAlign: 'right' })}
                        title="Align Right"
                    >
                        <AlignRight size={16} />
                    </ToolbarButton>
                </div>
            </div>
            {/* Main Content Area with AI Sidebar */}
            <div className="flex flex-1 min-h-0">
                {/* Editor Area - fills remaining space */}
                <div className="flex-1 bg-[#191919] overflow-y-auto min-w-0">
                    <div className="h-full px-6 py-6">
                        {/* Document Title - Inside paper area */}
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={handleTitleBlur}
                            className="w-full bg-transparent text-3xl font-bold text-white focus:outline-none mb-4 placeholder-white/30"
                            placeholder="Untitled"
                            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                        />
                        {/* Editor Content */}
                        <div className="">
                            <EditorContent editor={editor} className="w-full" />
                        </div>
                    </div>
                </div>

                {/* AI Assistant Sidebar */}
                {showAISidebar && (
                    <div className="w-96 bg-[#1a1a1a] border-l border-white/10 flex flex-col shrink-0 h-full overflow-hidden">
                        {/* Sidebar Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <Sparkles size={18} className="text-purple-400" />
                                <span className="text-white font-medium">AI Assistant</span>
                            </div>
                            <button
                                onClick={() => setShowAISidebar(false)}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-white/50"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {aiChatMessages.length === 0 && (
                                <div className="text-center py-8">
                                    <Sparkles size={32} className="mx-auto text-purple-400/50 mb-3" />
                                    <p className="text-white/50 text-sm">
                                        Ask AI anything about your document
                                    </p>
                                    <p className="text-white/30 text-xs mt-1">
                                        Get help writing, editing, or generating content
                                    </p>
                                </div>
                            )}
                            {aiChatMessages.map((msg, i) => (
                                <div key={i} className={`${msg.role === 'user' ? 'ml-4' : 'mr-4'}`}>
                                    <div className={`rounded-xl px-3 py-2 ${msg.role === 'user'
                                        ? 'bg-purple-600 text-white ml-auto'
                                        : 'bg-white/10 text-white/90'
                                        }`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                </div>
                            ))}
                            {aiChatLoading && (
                                <div className="flex items-center gap-2 text-white/50">
                                    <Loader2 size={14} className="animate-spin" />
                                    <span className="text-sm">Thinking...</span>
                                </div>
                            )}
                        </div>

                        {/* Chat Input */}
                        <div className="p-4 border-t border-white/10">
                            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
                                <input
                                    type="text"
                                    value={aiChatInput}
                                    onChange={(e) => setAIChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAIChatSend()}
                                    placeholder="Ask AI anything..."
                                    className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-white/30"
                                />
                                <button
                                    onClick={handleAIChatSend}
                                    disabled={aiChatLoading || !aiChatInput.trim()}
                                    className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send size={14} className="text-white" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* AI Modal */}
            {showAIModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-light-primary dark:bg-dark-primary rounded-2xl p-6 w-full max-w-lg border border-light-200 dark:border-dark-200 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Sparkles className="text-purple-500" size={20} />
                                AI Writing Assistant
                            </h2>
                            <button
                                onClick={() => setShowAIModal(false)}
                                className="p-2 rounded-lg hover:bg-light-200 dark:hover:bg-dark-200"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Mode Selection */}
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {aiModes.map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => setAIMode(mode.id as any)}
                                    className={`p-3 rounded-xl text-left transition-all ${aiMode === mode.id
                                        ? 'bg-purple-500/20 border-2 border-purple-500'
                                        : 'bg-light-200 dark:bg-dark-200 border-2 border-transparent hover:border-purple-500/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <mode.icon size={16} className={aiMode === mode.id ? 'text-purple-500' : ''} />
                                        <span className="font-medium text-sm">{mode.label}</span>
                                    </div>
                                    <p className="text-xs text-black/50 dark:text-white/50">{mode.desc}</p>
                                </button>
                            ))}
                        </div>

                        {/* Prompt Input */}
                        {(aiMode === 'generate' || aiMode === 'assist') && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1.5">
                                    {aiMode === 'generate' ? 'What document do you want to create?' : 'What do you want help with?'}
                                </label>
                                <textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAIPrompt(e.target.value)}
                                    placeholder={aiMode === 'generate'
                                        ? 'e.g., A product requirements document for a mobile app...'
                                        : 'e.g., Write an introduction about artificial intelligence...'
                                    }
                                    rows={3}
                                    className="w-full px-4 py-2.5 rounded-xl border border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                />
                            </div>
                        )}

                        {(aiMode === 'continue' || aiMode === 'improve') && (
                            <div className="mb-4 p-3 rounded-xl bg-light-200 dark:bg-dark-200">
                                <p className="text-sm text-black/70 dark:text-white/70">
                                    {aiMode === 'continue'
                                        ? 'AI will continue writing from where your document ends.'
                                        : 'AI will improve and enhance your existing content.'
                                    }
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowAIModal(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-light-200 dark:border-dark-200 hover:bg-light-200 dark:hover:bg-dark-200 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAIGenerate}
                                disabled={aiGenerating}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {aiGenerating ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} />
                                        Generate
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-light-primary dark:bg-dark-primary rounded-2xl p-6 w-full max-w-md border border-light-200 dark:border-dark-200 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Link2 className="text-purple-500" size={20} />
                                Share Document
                            </h2>
                            <button
                                onClick={() => setShowShareModal(false)}
                                className="p-2 rounded-lg hover:bg-light-200 dark:hover:bg-dark-200"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <p className="text-sm text-black/60 dark:text-white/60 mb-4">
                            Anyone with this link can view this document.
                        </p>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={shareUrl}
                                readOnly
                                className="flex-1 px-4 py-2.5 rounded-xl border border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary text-sm"
                            />
                            <button
                                onClick={copyShareLink}
                                className="px-4 py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition flex items-center gap-2"
                            >
                                <Copy size={16} />
                                Copy
                            </button>
                        </div>

                        <button
                            onClick={() => setShowShareModal(false)}
                            className="w-full px-4 py-2.5 rounded-xl border border-light-200 dark:border-dark-200 hover:bg-light-200 dark:hover:bg-dark-200 transition"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentEditor;
