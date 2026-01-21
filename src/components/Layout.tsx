'use client';

import { usePathname } from 'next/navigation';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  // Check if we're in a space, the spaces dashboard, or the main chat - these benefit from full width
  const isWideLayout = pathname?.startsWith('/space/') ||
    pathname?.startsWith('/c/') ||
    pathname === '/spaces' ||
    pathname === '/';

  if (isWideLayout) {
    return (
      <main className="lg:pl-[72px] h-screen overflow-hidden">
        {children}
      </main>
    );
  }

  return (
    <main className="lg:pl-20 min-h-screen">
      <div className="max-w-screen-lg lg:mx-auto mx-4">{children}</div>
    </main>
  );
};

export default Layout;
