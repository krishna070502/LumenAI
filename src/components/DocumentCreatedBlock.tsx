'use client';

import { FileText, ExternalLink, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface DocumentCreatedBlockProps {
    documentId: string;
    title: string;
    url: string;
    spaceId: string;
}

const DocumentCreatedBlock = ({ documentId, title, url }: DocumentCreatedBlockProps) => {
    return (
        <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <FileText size={20} className="text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle size={16} className="text-green-400" />
                        <span className="text-sm text-green-400 font-medium">Document Created</span>
                    </div>
                    <h3 className="text-white font-medium truncate mb-2">{title}</h3>
                    <Link
                        href={url}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors"
                    >
                        <span>Open Document</span>
                        <ExternalLink size={14} />
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default DocumentCreatedBlock;
