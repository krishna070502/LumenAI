'use client';

/* eslint-disable @next/next/no-img-element */
import React, { MutableRefObject } from 'react';
import { cn } from '@/lib/utils';
import {
  BookCopy,
  Disc3,
  Volume2,
  StopCircle,
  Layers3,
  Plus,
  CornerDownRight,
  User,
  Sparkles,
  Bot,
  BadgeCheck,
  FileText,
} from 'lucide-react';
import Markdown, { MarkdownToJSX, RuleType } from 'markdown-to-jsx';
import Copy from './MessageActions/Copy';
import Rewrite from './MessageActions/Rewrite';
import MessageSources from './MessageSources';
import SearchImages from './SearchImages';
import SearchVideos from './SearchVideos';
import { useSpeech } from 'react-text-to-speech';
import ThinkBox from './ThinkBox';
import { useChat, Section } from '@/lib/hooks/useChat';
import Citation from './MessageRenderer/Citation';
import AssistantSteps from './AssistantSteps';
import { ResearchBlock } from '@/lib/types';
import Renderer from './Widgets/Renderer';
import CodeBlock from './MessageRenderer/CodeBlock';
import Callout from './MessageRenderer/Callout';
import ActionButtons from './MessageActions/ActionButtons';

const ThinkTagProcessor = ({
  children,
  thinkingEnded,
}: {
  children: React.ReactNode;
  thinkingEnded: boolean;
}) => {
  return (
    <ThinkBox content={children as string} thinkingEnded={thinkingEnded} />
  );
};

const MessageBox = ({
  section,
  sectionIndex,
  dividerRef,
  isLast,
}: {
  section: Section;
  sectionIndex: number;
  dividerRef?: MutableRefObject<HTMLDivElement | null>;
  isLast: boolean;
}) => {
  const {
    loading,
    sendMessage,
    rewrite,
    messages,
    researchEnded,
    chatHistory,
    chatMode,
    chatModelProvider,
    files,
  } = useChat();

  const parsedMessage = section.parsedTextBlocks.join('\n\n');
  const speechMessage = section.speechMessage || '';
  const thinkingEnded = section.thinkingEnded;

  const sourceBlocks = section.message.responseBlocks.filter(
    (block): block is typeof block & { type: 'source' } =>
      block.type === 'source',
  );

  const sources = sourceBlocks.flatMap((block) => block.data);

  const hasContent = section.parsedTextBlocks.length > 0;

  const { speechStatus, start, stop } = useSpeech({ text: speechMessage });

  const markdownOverrides: MarkdownToJSX.Options = {
    renderRule(next, node, renderChildren, state) {
      if (node.type === RuleType.codeInline) {
        return `\`${node.text}\``;
      }

      if (node.type === RuleType.codeBlock) {
        return (
          <CodeBlock key={state.key} language={node.lang || ''}>
            {node.text}
          </CodeBlock>
        );
      }

      return next();
    },
    overrides: {
      think: {
        component: ThinkTagProcessor,
        props: {
          thinkingEnded: thinkingEnded,
        },
      },
      citation: {
        component: Citation,
      },
      blockquote: {
        component: Callout,
      },
      ul: {
        props: {
          className: 'list-disc list-outside space-y-2 ml-4',
        },
      },
      ol: {
        props: {
          className: 'list-decimal list-outside space-y-2 ml-4',
        },
      },
      li: {
        props: {
          className: 'pl-1 text-black/90 dark:text-white/90',
        },
      },
    },
  };

  if (chatMode === 'chat') {
    return (
      <div className="flex flex-col space-y-6 w-full max-w-3xl mx-auto">
        {/* User Message - Right-aligned pill style */}
        <div className="flex flex-col items-end w-full gap-2">
          <div className="bg-[#f4f4f4] dark:bg-[#2f2f2f] text-black dark:text-white px-5 py-2.5 rounded-[24px] max-w-[85%] shadow-sm">
            <div className="text-[17px] leading-relaxed whitespace-pre-wrap">
              {section.message.query}
            </div>
          </div>
          {/* Attached Files Display */}
          {sectionIndex === messages.length - 1 && files.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end max-w-[85%]">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-light-200 dark:bg-dark-200 border border-light-300 dark:border-dark-300 text-xs text-black/70 dark:text-white/70"
                >
                  <FileText size={14} className="text-purple-500" />
                  <span className="truncate max-w-[150px]">{file.fileName}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Message - Minimalist style (No bubble) */}
        <div className="flex flex-col space-y-4 w-full group">
          {/* Assistant Header (Icon + Name) */}
          <div className="flex items-center space-x-3 mb-1">
            <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shadow-sm">
              <img src="/logo-upscaled.png" alt="LumenAI" className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-black/90 dark:text-white/90">
                LumenAI
              </span>
              {!loading && section.message.status === 'completed' && (
                <BadgeCheck size={14} className="text-purple-500 fill-purple-100 dark:fill-purple-500/20" />
              )}
              {loading && isLast && (
                <Disc3 className="w-3.5 h-3.5 text-purple-500 animate-spin" />
              )}
            </div>
          </div>
          {/* Web Search Panel - Compact version for chat mode */}
          {section.message.responseBlocks
            .filter(
              (block): block is ResearchBlock =>
                block.type === 'research' && block.data.subSteps.length > 0,
            )
            .map((researchBlock) => (
              <div key={researchBlock.id} className="max-w-2xl">
                <AssistantSteps
                  block={researchBlock}
                  status={section.message.status}
                  isLast={isLast}
                />
              </div>
            ))}

          {/* AI Response Content */}
          <div ref={dividerRef} className="w-full">
            {hasContent ? (
              <div className="flex flex-col">
                <Markdown
                  className={cn(
                    'prose prose-h1:text-2xl prose-h1:font-bold prose-h2:text-xl prose-h2:font-semibold prose-h3:text-lg dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 font-[400]',
                    'max-w-none break-words text-black dark:text-white/90 prose-p:my-4 prose-p:text-[17px]',
                    'prose-li:text-[17px] prose-li:my-1 prose-table:my-6 prose-table:border-collapse',
                    'prose-th:border prose-th:border-light-300 dark:prose-th:border-dark-300 prose-th:px-4 prose-th:py-2 prose-th:bg-light-100 dark:prose-th:bg-dark-100',
                    'prose-td:border prose-td:border-light-300 dark:prose-td:border-dark-300 prose-td:px-4 prose-td:py-2'
                  )}
                  options={markdownOverrides}
                >
                  {parsedMessage}
                </Markdown>

                {/* Loading indicator (Bouncing dots) */}
                {isLast &&
                  loading &&
                  !researchEnded &&
                  section.message.status !== 'completed' && (
                    <div className="flex space-x-1 mt-2 mb-4">
                      <div className="w-2 h-2 bg-black/30 dark:bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-black/30 dark:bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-black/30 dark:bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  )}

                {/* Action buttons - subtle below response */}
                {isLast && !loading && (
                  <div className="flex flex-row items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Rewrite
                      rewrite={rewrite}
                      messageId={section.message.messageId}
                    />
                    <Copy initialMessage={parsedMessage} section={section} />
                    <button
                      onClick={() => {
                        if (speechStatus === 'started') {
                          stop();
                        } else {
                          start();
                        }
                      }}
                      className="p-1.5 text-black/50 dark:text-white/50 rounded hover:bg-light-200 dark:hover:bg-dark-200 transition"
                    >
                      {speechStatus === 'started' ? (
                        <StopCircle size={16} />
                      ) : (
                        <Volume2 size={16} />
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              isLast && loading && (
                <div className="flex space-x-1 mt-2 mb-8">
                  <div className="w-2 h-2 bg-black/30 dark:bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-black/30 dark:bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-black/30 dark:bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Suggestions */}
        {
          isLast &&
          section.suggestions &&
          section.suggestions.length > 0 &&
          hasContent &&
          !loading && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {section.suggestions.map(
                  (suggestion: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(suggestion)}
                      className="px-4 py-2 text-sm text-black/70 dark:text-white/70 bg-light-secondary dark:bg-dark-secondary hover:bg-purple-100 dark:hover:bg-purple-900/30 border border-light-200 dark:border-dark-200 rounded-full transition-all duration-200 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-700"
                    >
                      {suggestion}
                    </button>
                  ),
                )}
              </div>
            </div>
          )
        }
      </div >
    );
  }

  return (
    <div className="space-y-6">
      <div className={'w-full pt-8 break-words'}>
        <h2 className="text-black dark:text-white font-medium text-3xl lg:w-9/12">
          {section.message.query}
        </h2>
      </div>

      <div className="flex flex-col space-y-9 lg:space-y-0 lg:flex-row lg:justify-between lg:space-x-9">
        <div
          ref={dividerRef}
          className="flex flex-col space-y-6 w-full lg:w-9/12"
        >
          {sources.length > 0 && (
            <div className="flex flex-col space-y-2">
              <div className="flex flex-row items-center space-x-2">
                <BookCopy className="text-black dark:text-white" size={20} />
                <h3 className="text-black dark:text-white font-medium text-xl">
                  Sources
                </h3>
              </div>
              <MessageSources sources={sources} />
            </div>
          )}

          {section.message.responseBlocks
            .filter(
              (block): block is ResearchBlock =>
                block.type === 'research' && block.data.subSteps.length > 0,
            )
            .map((researchBlock) => (
              <div key={researchBlock.id} className="flex flex-col space-y-2">
                <AssistantSteps
                  block={researchBlock}
                  status={section.message.status}
                  isLast={isLast}
                />
              </div>
            ))}

          {isLast &&
            loading &&
            !researchEnded &&
            section.message.status !== 'completed' &&
            !section.message.responseBlocks.some(
              (b) => b.type === 'research' && b.data?.subSteps?.length > 0,
            ) &&
            !section.message.responseBlocks.some(
              (b) => b.type === 'text' && b.data,
            ) && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200">
                <Disc3 className="w-4 h-4 text-black dark:text-white animate-spin" />
                <span className="text-sm text-black/70 dark:text-white/70">
                  Brainstorming...
                </span>
              </div>
            )}

          {section.widgets.length > 0 && <Renderer widgets={section.widgets} />}

          <div className="flex flex-col space-y-2">
            {sources.length > 0 && (
              <div className="flex flex-row items-center space-x-2">
                <Disc3
                  className={cn(
                    'text-black dark:text-white',
                    isLast && loading ? 'animate-spin' : 'animate-none',
                  )}
                  size={20}
                />
                <h3 className="text-black dark:text-white font-medium text-xl">
                  Answer
                </h3>
              </div>
            )}

            {hasContent && (
              <>
                <Markdown
                  className={cn(
                    'prose prose-p:my-1 prose-li:my-0 prose-h1:mb-3 prose-h2:mb-2 prose-h2:mt-6 prose-h2:font-[800] prose-h3:mt-4 prose-h3:mb-1.5 prose-h3:font-[600] dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 font-[400]',
                    'max-w-none break-words text-black dark:text-white',
                    'prose-li:marker:text-[#24A0ED] prose-blockquote:border-none prose-blockquote:p-0'
                  )}
                  options={markdownOverrides}
                >
                  {parsedMessage}
                </Markdown>

                {isLast && !loading && (
                  <ActionButtons />
                )}

                {loading && isLast ? null : (
                  <div className="flex flex-row items-center justify-between w-full text-black dark:text-white py-4">
                    <div className="flex flex-row items-center -ml-2">
                      <Rewrite
                        rewrite={rewrite}
                        messageId={section.message.messageId}
                      />
                    </div>
                    <div className="flex flex-row items-center -mr-2">
                      <Copy initialMessage={parsedMessage} section={section} />
                      <button
                        onClick={() => {
                          if (speechStatus === 'started') {
                            stop();
                          } else {
                            start();
                          }
                        }}
                        className="p-2 text-black/70 dark:text-white/70 rounded-full hover:bg-light-secondary dark:hover:bg-dark-secondary transition duration-200 hover:text-black dark:hover:text-white"
                      >
                        {speechStatus === 'started' ? (
                          <StopCircle size={16} />
                        ) : (
                          <Volume2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {isLast &&
                  section.suggestions &&
                  section.suggestions.length > 0 &&
                  hasContent &&
                  !loading && (
                    <div className="mt-6">
                      <div className="flex flex-row items-center space-x-2 mb-4">
                        <Layers3
                          className="text-black dark:text-white"
                          size={20}
                        />
                        <h3 className="text-black dark:text-white font-medium text-xl">
                          Related
                        </h3>
                      </div>
                      <div className="space-y-0">
                        {section.suggestions.map(
                          (suggestion: string, i: number) => (
                            <div key={i}>
                              <div className="h-px bg-light-200/40 dark:bg-dark-200/40" />
                              <button
                                onClick={() => sendMessage(suggestion)}
                                className="group w-full py-4 text-left transition-colors duration-200"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex flex-row space-x-3 items-center">
                                      <CornerDownRight
                                        size={15}
                                        className="group-hover:text-sky-400 transition-colors duration-200 flex-shrink-0"
                                      />
                                      <p className="text-sm text-black/70 dark:text-white/70 group-hover:text-sky-400 transition-colors duration-200 leading-relaxed">
                                        {suggestion}
                                      </p>
                                    </div>
                                    <Plus
                                      size={16}
                                      className="text-black/40 dark:text-white/40 group-hover:text-sky-400 transition-colors duration-200 flex-shrink-0"
                                    />
                                  </div>
                                </div>
                              </button>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
              </>
            )}
          </div>
        </div>

        {hasContent && (
          <div className="lg:sticky lg:top-20 flex flex-col items-center space-y-3 w-full lg:w-3/12 z-30 h-full pb-4">
            <SearchImages
              query={section.message.query}
              chatHistory={chatHistory}
              messageId={section.message.messageId}
            />
            <SearchVideos
              chatHistory={chatHistory}
              query={section.message.query}
              messageId={section.message.messageId}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBox;
