'use client';

import { ChatProvider } from '@/lib/hooks/useChat';

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ChatProvider>{children}</ChatProvider>;
}
