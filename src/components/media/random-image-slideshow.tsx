'use client';

import type { MediaItem } from '@/types/db-types';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import MediaFullView from './media-full-view';

interface RandomImageSlideshowProps {
  images: MediaItem[];
  interval?: number; // Time in milliseconds between transitions
}

export default function RandomImageSlideshow({
  images,
  interval = 5000, // Default to 5 seconds
}: RandomImageSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeState, setFadeState] = useState<'fade-in' | 'fade-out'>('fade-in');

  // Skip if no images provided
  if (!images || images.length === 0) {
    return null;
  }

  // Use only the first image if only one is available
  if (images.length === 1) {
    const image = images[0];
    // Use the dedicated thumbnail_path field from the media_item
    const thumbnailPath = image.thumbnail_path;

    return (
      <div className="w-full h-[400px] lg:h-[600px] rounded-lg overflow-hidden relative">
        <Image
          src={thumbnailPath || `/api/media?id=${image.id}`}
          alt={image.file_name}
          className="object-cover"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          priority
        />
      </div>
    );
  }

  // Set up the image rotation
  useEffect(() => {
    // Start the rotation timer
    const timer = setInterval(() => {
      // Start the fade-out animation
      setFadeState('fade-out');

      // After the fade-out is complete, change the image and fade back in
      const changeTimeout = setTimeout(() => {
        setCurrentIndex((prevIndex) =>
          prevIndex === images.length - 1 ? 0 : prevIndex + 1,
        );
        setFadeState('fade-in');
      }, 500); // Time should match the CSS transition duration

      return () => clearTimeout(changeTimeout);
    }, interval);

    // Clean up
    return () => clearInterval(timer);
  }, [images.length, interval]);

  const currentImage = images[currentIndex];

  return (
    <div className="w-full h-[400px] lg:h-[600px] rounded-lg overflow-hidden relative bg-black mb-8">
      <div
        className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
          fadeState === 'fade-in' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <MediaFullView item={currentImage} />
      </div>

      {/* Optional overlay with photo information */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white">
        <p className="font-medium">{currentImage.file_name}</p>
        <p className="text-sm opacity-80" suppressHydrationWarning={true}>
          {currentImage.media_date &&
            new Date(currentImage.media_date).toLocaleDateString()}
        </p>
      </div>

      {/* Optional dot indicators */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
        {images.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full ${
              index === currentIndex ? 'bg-white' : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
