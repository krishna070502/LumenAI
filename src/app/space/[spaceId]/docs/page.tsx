'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, FileText, Trash2, Loader2, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Document {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}

interface Space {
    id: string;
    name: string;
    icon: string;
}

const DocsPage = () => {
    const params = useParams();
    const router = useRouter();
    const spaceId = params.spaceId as string;

    const [space, setSpace] = useState<Space | null>(null);
    const [docs, setDocs] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchData();
    }, [spaceId]);

    const fetchData = async () => {
        try {
            const [spaceRes, docsRes] = await Promise.all([
                fetch(`/api/spaces/${spaceId}`),
                fetch(`/api/spaces/${spaceId}/documents`)
            ]);

            if (spaceRes.ok) {
                const spaceData = await spaceRes.json();
                setSpace(spaceData.space);
            }

            if (docsRes.ok) {
                const docsData = await docsRes.json();
                setDocs(docsData.documents || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const createDocument = async () => {
        setCreating(true);
        try {
            const res = await fetch(`/api/spaces/${spaceId}/documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'Untitled Document' }),
            });

            if (res.ok) {
                const data = await res.json();
                router.push(`/space/${spaceId}/docs/${data.document.id}`);
            }
        } catch (error) {
            toast.error('Failed to create document');
        } finally {
            setCreating(false);
        }
    };

    const deleteDocument = async (docId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this document?')) return;

        try {
            const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
            if (res.ok) {
                setDocs(docs.filter(d => d.id !== docId));
                toast.success('Document deleted');
            }
        } catch (error) {
            toast.error('Failed to delete document');
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto pb-24 no-scrollbar">
            {/* Header */}
            <div className="flex flex-col pt-10 pb-6 px-4">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
                    <div className="flex items-center">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mr-4">
                            <FileText size={24} className="text-purple-500" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-semibold" style={{ fontFamily: 'PP Editorial, serif' }}>
                                Documents
                            </h1>
                            <p className="text-sm text-black/60 dark:text-white/60">
                                Create and edit documents with AI assistance
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={createDocument}
                        disabled={creating}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 active:scale-95"
                    >
                        {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                        <span className="font-medium">New Document</span>
                    </button>
                </div>
            </div>

            {/* Documents Grid */}
            <div className="p-4">
                {docs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
                        <div className="w-16 h-16 rounded-2xl bg-light-200 dark:bg-dark-200 flex items-center justify-center mb-4">
                            <FileText size={32} className="text-black/50 dark:text-white/50" />
                        </div>
                        <h2 className="text-xl font-medium mb-2">No documents yet</h2>
                        <p className="text-black/60 dark:text-white/60 mb-4">
                            Create your first document to get started
                        </p>
                        <button
                            onClick={createDocument}
                            disabled={creating}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
                        >
                            <Plus size={18} />
                            New Document
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {docs.map((doc) => (
                            <div
                                key={doc.id}
                                onClick={() => router.push(`/space/${spaceId}/docs/${doc.id}`)}
                                className="group relative p-4 rounded-2xl border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary hover:border-purple-500/50 hover:shadow-lg transition-all cursor-pointer"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                        <FileText size={20} className="text-purple-500" />
                                    </div>
                                    <button
                                        onClick={(e) => deleteDocument(doc.id, e)}
                                        className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <h3 className="font-medium mb-1 truncate">{doc.title}</h3>
                                <p className="text-xs text-black/50 dark:text-white/50">
                                    Updated {formatDate(doc.updatedAt)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocsPage;
