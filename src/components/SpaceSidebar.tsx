'use client';

import { useParams, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FileText, MessageSquare, Settings, ChevronLeft, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Space {
    id: string;
    name: string;
    icon: string;
}

const SpaceSidebar = () => {
    const params = useParams();
    const pathname = usePathname();
    const spaceId = params.spaceId as string;
    const [space, setSpace] = useState<Space | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSpace = async () => {
            try {
                const res = await fetch(`/api/spaces/${spaceId}`);
                if (res.ok) {
                    const data = await res.json();
                    setSpace(data.space);
                }
            } catch (err) {
                console.error('Error fetching space for sidebar:', err);
            } finally {
                setLoading(false);
            }
        };

        if (spaceId) {
            fetchSpace();
        }
    }, [spaceId]);

    const navItems = [
        {
            label: 'Chat',
            href: `/space/${spaceId}`,
            icon: MessageSquare,
            active: pathname === `/space/${spaceId}`
        },
        {
            label: 'Docs',
            href: `/space/${spaceId}/docs`,
            icon: FileText,
            active: pathname?.includes(`/space/${spaceId}/docs`)
        },
    ];

    if (loading) {
        return (
            <div className="w-64 h-full bg-[#151515] border-r border-white/10 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
            </div>
        );
    }

    if (!space) return null;

    return (
        <div className="w-64 h-full bg-[#151515] border-r border-white/5 lg:border-white/10 flex flex-col pt-6 overflow-hidden">
            {/* Space Branding */}
            <div className="px-5 mb-8">
                <Link
                    href="/spaces"
                    className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition mb-4 group"
                >
                    <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                    Back to Spaces
                </Link>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center text-2xl border border-white/10 shadow-inner">
                        {space.icon}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-white font-semibold truncate leading-tight">
                            {space.name}
                        </h2>
                        <span className="text-[10px] text-purple-500 font-medium tracking-wider uppercase">
                            Workspace
                        </span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
                <div className="px-3 mb-2">
                    <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                        Main
                    </span>
                </div>
                {navItems.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                            item.active
                                ? "bg-purple-600/10 text-purple-400 border border-purple-500/20"
                                : "text-white/60 hover:bg-white/5 hover:text-white"
                        )}
                    >
                        <item.icon size={18} className={cn(
                            "transition-colors",
                            item.active ? "text-purple-400" : "text-white/40 group-hover:text-white/70"
                        )} />
                        <span className="text-sm font-medium">{item.label}</span>
                        {item.active && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                        )}
                    </Link>
                ))}

                <div className="pt-6 px-3 mb-2">
                    <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                        Actions
                    </span>
                </div>
                <button
                    onClick={() => { }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:bg-white/5 hover:text-white transition-all group"
                >
                    <Settings size={18} className="text-white/40 group-hover:text-white/70" />
                    <span className="text-sm font-medium">Settings</span>
                </button>
            </nav>

            {/* Bottom Section */}
            <div className="p-4 border-t border-white/5 bg-black/20">
                <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg active:scale-[0.98]">
                    <Plus size={16} />
                    New Project
                </button>
            </div>
        </div>
    );
};

export default SpaceSidebar;
