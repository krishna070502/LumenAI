/* eslint-disable @next/next/no-img-element */
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { File } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Chunk } from '@/lib/types';

const MessageSources = ({ sources }: { sources: Chunk[] }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const closeModal = () => {
    setIsDialogOpen(false);
    document.body.classList.remove('overflow-hidden-scrollable');
  };

  const openModal = () => {
    setIsDialogOpen(true);
    document.body.classList.add('overflow-hidden-scrollable');
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {sources.slice(0, 3).map((source, i) => (
        <a
          className="bg-white/5 hover:bg-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.08] border border-white/5 transition duration-200 rounded-xl p-3.5 flex flex-col justify-between h-24 font-medium"
          key={i}
          href={source.metadata.url}
          target="_blank"
        >
          <p className="dark:text-white/90 text-[13px] line-clamp-2 leading-snug mb-2">
            {source.metadata.title}
          </p>
          <div className="flex flex-row items-center justify-between mt-auto pt-2 border-t border-white/[0.03]">
            <div className="flex flex-row items-center space-x-1.5 min-w-0">
              {source.metadata.url.includes('file_id://') ? (
                <File size={12} className="text-white/40 flex-shrink-0" />
              ) : (
                <img
                  src={`https://s2.googleusercontent.com/s2/favicons?domain_url=${source.metadata.url}`}
                  width={14}
                  height={14}
                  alt="favicon"
                  className="rounded-sm h-3.5 w-3.5 opacity-80"
                />
              )}
              <p className="text-[10px] text-black/40 dark:text-white/40 truncate">
                {source.metadata.url.includes('file_id://')
                  ? 'Uploaded File'
                  : source.metadata.url.replace(/.+\/\/|www.|\..+/g, '')}
              </p>
            </div>
            <span className="text-[10px] font-bold text-black/20 dark:text-white/20 ml-2">{i + 1}</span>
          </div>
        </a>
      ))}
      {sources.length > 3 && (
        <button
          onClick={openModal}
          className="bg-white/5 hover:bg-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.08] border border-white/5 transition duration-200 rounded-xl p-3.5 flex flex-col items-center justify-center h-24 font-medium group"
        >
          <div className="flex flex-row items-center -space-x-1 mb-2">
            {sources.slice(3, 6).map((source, i) => (
              <div key={i} className="w-6 h-6 rounded-full border border-[#0A0A0A] bg-dark-100 flex items-center justify-center overflow-hidden">
                {source.metadata.url === 'File' ? (
                  <File size={10} className="text-white/40" />
                ) : (
                  <img
                    src={`https://s2.googleusercontent.com/s2/favicons?domain_url=${source.metadata.url}`}
                    className="h-3 w-3 opacity-60"
                    alt=""
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-wider group-hover:text-white/60 transition-colors">
            View {sources.length - 3} more
          </p>
        </button>
      )}
      <Transition appear show={isDialogOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeModal}>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-100"
                leaveFrom="opacity-100 scale-200"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-md transform rounded-2xl bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 p-6 text-left align-middle shadow-xl transition-all">
                  <DialogTitle className="text-lg font-medium leading-6 dark:text-white">
                    Sources
                  </DialogTitle>
                  <div className="grid grid-cols-2 gap-2 overflow-auto max-h-[300px] mt-2 pr-2">
                    {sources.map((source, i) => (
                      <a
                        className="bg-light-secondary hover:bg-light-200 dark:bg-dark-secondary dark:hover:bg-dark-200 border border-light-200 dark:border-dark-200 transition duration-200 rounded-lg p-3 flex flex-col space-y-2 font-medium"
                        key={i}
                        href={source.metadata.url}
                        target="_blank"
                      >
                        <p className="dark:text-white text-xs overflow-hidden whitespace-nowrap text-ellipsis">
                          {source.metadata.title}
                        </p>
                        <div className="flex flex-row items-center justify-between">
                          <div className="flex flex-row items-center space-x-1">
                            {source.metadata.url === 'File' ? (
                              <div className="bg-dark-200 hover:bg-dark-100 transition duration-200 flex items-center justify-center w-6 h-6 rounded-full">
                                <File size={12} className="text-white/70" />
                              </div>
                            ) : (
                              <img
                                src={`https://s2.googleusercontent.com/s2/favicons?domain_url=${source.metadata.url}`}
                                width={16}
                                height={16}
                                alt="favicon"
                                className="rounded-lg h-4 w-4"
                              />
                            )}
                            <p className="text-xs text-black/50 dark:text-white/50 overflow-hidden whitespace-nowrap text-ellipsis">
                              {source.metadata.url.replace(
                                /.+\/\/|www.|\..+/g,
                                '',
                              )}
                            </p>
                          </div>
                          <div className="flex flex-row items-center space-x-1 text-black/50 dark:text-white/50 text-xs">
                            <div className="bg-black/50 dark:bg-white/50 h-[4px] w-[4px] rounded-full" />
                            <span>{i + 1}</span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default MessageSources;
