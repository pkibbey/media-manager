'use client';

import {
  type MediaDetail,
  getMediaDetail,
} from '@/actions/media/get-media-detail';
import type React from 'react';
import { createContext, useContext, useState } from 'react';

interface MediaLightboxContextType {
  isOpen: boolean;
  media: MediaDetail | null;
  isLoading: boolean;
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
  const [media, setMedia] = useState<MediaDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const openLightbox = async (mediaId: string) => {
    setIsLoading(true);
    setIsOpen(true);

    try {
      const result = await getMediaDetail(mediaId);
      if (result.media && !result.error) {
        setMedia(result.media);
      } else {
        console.error('Failed to fetch media detail:', result.error);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Failed to fetch media detail:', error);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const closeLightbox = () => {
    setIsOpen(false);
    setMedia(null);
    setIsLoading(false);
  };

  return (
    <MediaLightboxContext.Provider
      value={{
        isOpen,
        media,
        isLoading,
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
