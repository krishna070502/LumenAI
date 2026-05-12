import ChatWindow from '@/components/ChatWindow';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Guest Chat - LumenAI',
  description: 'Chat with LumenAI as a guest. Sign in for unlimited access.',
};

const GuestPage = () => {
  return <ChatWindow />;
};

export default GuestPage;
