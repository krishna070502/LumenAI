import ChatWindow from '@/components/ChatWindow';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chat - LumenAI',
  description: 'Chat with the internet, powered by LumenAI.',
};

const Home = () => {
  return <ChatWindow />;
};

export default Home;
