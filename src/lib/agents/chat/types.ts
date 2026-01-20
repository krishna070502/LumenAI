import { ChatTurnMessage } from '@/lib/types';
import BaseLLM from '@/lib/models/base/llm';

export interface ChatAgentInput {
    chatHistory: ChatTurnMessage[];
    message: string;
    chatId: string;
    messageId: string;
    userId: string;
    llm: BaseLLM<any>;
    systemInstructions: string;
}
