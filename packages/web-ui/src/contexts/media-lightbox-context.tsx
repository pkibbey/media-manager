'use client';

import { getMediaDetail } from '@/actions/media/get-media-detail';
import type React from 'react';
import { createContext, useContext, useState } from 'react';
import type { MediaWithRelations } from 'shared/types';

interface MediaLightboxContextType {
  isOpen: boolean;
  media: MediaWithRelations | null;
  openLightbox: (mediaId: string) => Promise<void>;
  closeLightbox: () => void;
}

const MediaLightboxContext = createContext<MediaLightboxContextType | null>(
  null,
);

export function MediaLightboxProvider({
  children,
}: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [media, setMedia] = useState<MediaWithRelations | null>(null);

  const openLightbox = async (mediaId: string) => {
    setIsOpen(true);

    try {
      const result = await getMediaDetail(mediaId);
      console.log('result: ', result);
      if (result.media && !result.error) {
        setMedia(result.media);
      } else {
        console.error('Failed to fetch media detail:', result.error);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Failed to fetch media detail:', error);
      setIsOpen(false);
    }
  };

  const closeLightbox = () => {
    setIsOpen(false);
    setMedia(null);
  };

  return (
    <MediaLightboxContext.Provider
      value={{
        isOpen,
        media,
        openLightbox,
        closeLightbox,
      }}
    >
      {children}
    </MediaLightboxContext.Provider>
  );
}

export function useMediaLightbox() {
  const context = useContext(MediaLightboxContext);
  if (!context) {
    throw new Error(
      'useMediaLightbox must be used within a MediaLightboxProvider',
    );
  }
  return context;
}
