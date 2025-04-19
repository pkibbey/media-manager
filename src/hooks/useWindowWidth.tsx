'use client';

import { useEffect, useState } from 'react';

export default function useWindowWidth() {
  const [windowWidth, setWindowWidth] = useState<number>(0);

  useEffect(() => {
    // Function to update the window width state
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    // Set the initial window width
    handleResize();

    // Add event listener for window resize
    window.addEventListener('resize', handleResize);

    // Cleanup function to remove the event listener
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return windowWidth;
}
