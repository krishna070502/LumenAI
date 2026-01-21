/* eslint-disable @next/next/no-img-element */
import { ImagesIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { Message } from './ChatWindow';

type Image = {
  url: string;
  img_src: string;
  title: string;
};

const SearchImages = ({
  query,
  chatHistory,
  messageId,
}: {
  query: string;
  chatHistory: [string, string][];
  messageId: string;
}) => {
  const [images, setImages] = useState<Image[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [slides, setSlides] = useState<any[]>([]);

  return (
    <>
      {!loading && images === null && (
        <button
          id={`search-images-${messageId}`}
          onClick={async () => {
            setLoading(true);
            // ... (rest of the logic remains same)
            const chatModelProvider = localStorage.getItem('chatModelProviderId');
            const chatModel = localStorage.getItem('chatModelKey');
            const res = await fetch(`/api/images`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query, chatHistory, chatModel: { providerId: chatModelProvider, key: chatModel } }),
            });
            const data = await res.json();
            const images = data.images ?? [];
            setImages(images);
            setSlides(images.map((img: Image) => ({ src: img.img_src })));
            setLoading(false);
          }}
          className="bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] active:scale-95 duration-200 transition px-4 py-3.5 flex flex-row items-center justify-between rounded-xl dark:text-white/80 text-sm w-full group"
        >
          <div className="flex flex-row items-center space-x-3">
            <div className="p-1 rounded-md bg-white/5 border border-white/5">
              <ImagesIcon size={16} className="text-white/40 group-hover:text-white transition-colors" />
            </div>
            <p className="font-medium tracking-tight">Search images</p>
          </div>
          <PlusIcon className="text-white/20 group-hover:text-[#24A0ED] transition-colors" size={16} />
        </button>
      )}
      {loading && (
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-light-secondary dark:bg-dark-secondary h-32 w-full rounded-lg animate-pulse aspect-video object-cover"
            />
          ))}
        </div>
      )}
      {images !== null && images.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {images.length > 4
              ? images.slice(0, 3).map((image, i) => (
                <img
                  onClick={() => {
                    setOpen(true);
                    setSlides([
                      slides[i],
                      ...slides.slice(0, i),
                      ...slides.slice(i + 1),
                    ]);
                  }}
                  key={i}
                  src={image.img_src}
                  alt={image.title}
                  className="h-full w-full aspect-video object-cover rounded-lg transition duration-200 active:scale-95 hover:scale-[1.02] cursor-zoom-in"
                />
              ))
              : images.map((image, i) => (
                <img
                  onClick={() => {
                    setOpen(true);
                    setSlides([
                      slides[i],
                      ...slides.slice(0, i),
                      ...slides.slice(i + 1),
                    ]);
                  }}
                  key={i}
                  src={image.img_src}
                  alt={image.title}
                  className="h-full w-full aspect-video object-cover rounded-lg transition duration-200 active:scale-95 hover:scale-[1.02] cursor-zoom-in"
                />
              ))}
            {images.length > 4 && (
              <button
                onClick={() => setOpen(true)}
                className="bg-light-100 hover:bg-light-200 dark:bg-dark-100 dark:hover:bg-dark-200 transition duration-200 active:scale-95 hover:scale-[1.02] h-auto w-full rounded-lg flex flex-col justify-between text-white p-2"
              >
                <div className="flex flex-row items-center space-x-1">
                  {images.slice(3, 6).map((image, i) => (
                    <img
                      key={i}
                      src={image.img_src}
                      alt={image.title}
                      className="h-6 w-12 rounded-md lg:h-3 lg:w-6 lg:rounded-sm aspect-video object-cover"
                    />
                  ))}
                </div>
                <p className="text-black/70 dark:text-white/70 text-xs">
                  View {images.length - 3} more
                </p>
              </button>
            )}
          </div>
          <Lightbox open={open} close={() => setOpen(false)} slides={slides} />
        </>
      )}
    </>
  );
};

export default SearchImages;
