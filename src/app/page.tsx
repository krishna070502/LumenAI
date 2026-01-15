import ChatWindow from '@/components/ChatWindow';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chat - Gradia-AIEngine',
  description: 'Chat with the internet, powered by Gradia-AIEngine.',
};

const Home = () => {
  return <ChatWindow />;
};

export default Home;
