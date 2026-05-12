export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import { cn } from '@/lib/utils';
import Sidebar from '@/components/Sidebar';
import { Toaster } from 'sonner';
import ThemeProvider from '@/components/theme/Provider';
import configManager from '@/lib/config';
import WelcomeAnimation from '@/components/Setup/WelcomeAnimation';
import { ChatProvider } from '@/lib/hooks/useChat';

const montserrat = Montserrat({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  fallback: ['Arial', 'sans-serif'],
});

export const metadata: Metadata = {
  title: 'LumenAI - Enlighten Yourself',
  description:
    'LumenAI is an AI-powered assistant that helps you discover, learn, and explore with intelligent search and insights.',
  icons: {
    icon: '/logo-upscaled.png',
    shortcut: '/logo-upscaled.png',
    apple: '/logo-upscaled.png',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const setupComplete = configManager.isSetupComplete();

  // Get the current path to check if we're on an auth page
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || headersList.get('x-invoke-path') || '';
  const isAuthPage = pathname.startsWith('/auth');
  const isGuestPage = pathname.startsWith('/guest');

  return (
    <html className="h-full" lang="en" suppressHydrationWarning>
      <body className={cn('h-full antialiased gradient-bg', montserrat.className)} suppressHydrationWarning>
        <ThemeProvider>
          {!setupComplete ? (
            <WelcomeAnimation />
          ) : isAuthPage ? (
            // Auth pages render without sidebar
            <>
              {children}
              <Toaster
                toastOptions={{
                  unstyled: true,
                  classNames: {
                    toast:
                      'bg-light-secondary dark:bg-dark-secondary dark:text-white/70 text-black-70 rounded-lg p-4 flex flex-row items-center space-x-2',
                  },
                }}
              />
            </>
          ) : isGuestPage ? (
            // Guest pages render with sidebar but ChatProvider is in guest/layout.tsx
            <>
              <Sidebar>{children}</Sidebar>
              <Toaster
                toastOptions={{
                  unstyled: true,
                  classNames: {
                    toast:
                      'bg-light-secondary dark:bg-dark-secondary dark:text-white/70 text-black-70 rounded-lg p-4 flex flex-row items-center space-x-2',
                  },
                }}
              />
            </>
          ) : (
            // Regular pages with sidebar
            <ChatProvider>
              <Sidebar>{children}</Sidebar>
              <Toaster
                toastOptions={{
                  unstyled: true,
                  classNames: {
                    toast:
                      'bg-light-secondary dark:bg-dark-secondary dark:text-white/70 text-black-70 rounded-lg p-4 flex flex-row items-center space-x-2',
                  },
                }}
              />
            </ChatProvider>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}


