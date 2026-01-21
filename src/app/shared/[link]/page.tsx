'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import { Loader2, FileText, ExternalLink } from 'lucide-react';

interface Document {
    id: string;
    title: string;
    content: any;
}

const SharedDocumentPage = () => {
    const params = useParams();
    const shareLink = params.link as string;

    const [doc, setDoc] = useState<Document | null>(null);
    const [permission, setPermission] = useState<'view' | 'edit'>('view');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const editor = useEditor({
        immediatelyRender: false, // Prevent SSR hydration mismatch
        extensions: [
            StarterKit,
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Highlight.configure({
                multicolor: true,
            }),
            Link.configure({
                openOnClick: true,
            }),
        ],
        content: '',
        editable: false,
        editorProps: {
            attributes: {
                class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[50vh] px-4 py-2',
            },
        },
    });

    useEffect(() => {
        const fetchDocument = async () => {
            try {
                const res = await fetch(`/api/shared/${shareLink}`);
                if (res.ok) {
                    const data = await res.json();
                    setDoc(data.document);
                    setPermission(data.permission);
                    if (editor && data.document.content) {
                        editor.commands.setContent(data.document.content);
                        if (data.permission === 'edit') {
                            editor.setEditable(true);
                        }
                    }
                } else {
                    setError(true);
                }
            } catch (err) {
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        if (shareLink && editor) {
            fetchDocument();
        }
    }, [shareLink, editor]);

    if (loading || !editor) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    if (error || !doc) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <FileText size={48} className="text-black/30 dark:text-white/30" />
                <h1 className="text-xl font-semibold">Document not found</h1>
                <p className="text-black/60 dark:text-white/60">
                    This share link may have expired or been removed.
                </p>
                <a
                    href="/"
                    className="text-purple-500 hover:underline flex items-center gap-1"
                >
                    Go to LumenAI <ExternalLink size={14} />
                </a>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-light-primary/95 dark:bg-dark-primary/95 backdrop-blur-sm border-b border-light-200 dark:border-dark-200">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                <FileText className="text-purple-500" size={20} />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold">{doc.title}</h1>
                                <p className="text-xs text-black/50 dark:text-white/50">
                                    Shared document • {permission === 'edit' ? 'Can edit' : 'View only'}
                                </p>
                            </div>
                        </div>
                        <a
                            href="/"
                            className="text-sm text-purple-500 hover:underline flex items-center gap-1"
                        >
                            Open in LumenAI <ExternalLink size={14} />
                        </a>
                    </div>
                </div>
            </div>

            {/* Document Content */}
            <div className="max-w-4xl mx-auto py-8 px-4">
                <EditorContent editor={editor} />
            </div>

            {/* Footer */}
            <div className="border-t border-light-200 dark:border-dark-200 py-4">
                <div className="max-w-4xl mx-auto px-4 text-center text-sm text-black/50 dark:text-white/50">
                    Powered by <a href="/" className="text-purple-500 hover:underline">LumenAI</a>
                </div>
            </div>
        </div>
    );
};

export default SharedDocumentPage;
