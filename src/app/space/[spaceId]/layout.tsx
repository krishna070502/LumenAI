'use client';

import SpaceSidebar from '@/components/SpaceSidebar';
import { usePathname } from 'next/navigation';

export default function SpaceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    // Check if we're in the document editor itself
    // We want the sidebar on the space home and docs list, 
    // but maybe not inside the actual doc editing view to maximize space?
    // User said "in that add Docs", which usually means the space structure.
    // However, looking at the doc editor (page.tsx in docs/[docId]), it has its own AI sidebar.
    // Let's keep the space sidebar visible everywhere in the space for now, 
    // unless it's the doc editor.

    const pathSegments = pathname?.split('/').filter(Boolean) || [];
    const isDocEditor = pathSegments.length >= 4 && pathSegments[0] === 'space' && pathSegments[2] === 'docs';

    if (isDocEditor) {
        return <>{children}</>;
    }

    return (
        <div className="flex h-screen overflow-hidden">
            <aside className="hidden lg:block h-full shrink-0">
                <SpaceSidebar />
            </aside>
            <main className="flex-1 h-full overflow-hidden min-w-0 bg-[#0A0A0A]">
                {children}
            </main>
        </div>
    );
}
