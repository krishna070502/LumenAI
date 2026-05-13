'use client';

// Polyfill for crypto.randomUUID in non-secure (HTTP) environments
if (typeof window !== 'undefined') {
  try {
    if (!globalThis.crypto) {
      (globalThis as any).crypto = {};
    }
    if (!globalThis.crypto.randomUUID) {
      globalThis.crypto.randomUUID = function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        }) as any;
      };
    }
  } catch (e) {
    console.warn('Failed to polyfill crypto.randomUUID:', e);
  }
}

import { ThemeProvider } from 'next-themes';

const ThemeProviderComponent = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <ThemeProvider attribute="class" enableSystem={false} defaultTheme="dark">
      {children}
    </ThemeProvider>
  );
};

export default ThemeProviderComponent;
