'use client';

import { useEffect, useState } from 'react';
import ActionButton from './action-button';
import { Pause, Play } from 'lucide-react';

interface PauseQueueButtonProps {
  queueName: string;
}

export default function PauseQueueButton({ queueName }: PauseQueueButtonProps) {
  const [isPaused, setIsPaused] = useState<boolean | null>(null);

  // Fetch pause state from API
  useEffect(() => {
    let isMounted = true;
    async function fetchPauseState() {
      try {
        const res = await fetch(
          `/api/admin/queue-paused?queueName=${queueName}`,
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setIsPaused(data.paused);
        } else {
          if (isMounted) setIsPaused(null);
        }
      } catch {
        if (isMounted) setIsPaused(null);
      }
    }
    fetchPauseState();
    return () => {
      isMounted = false;
    };
  }, [queueName]);

  const handleTogglePause = async () => {
    try {
      const res = await fetch(
        `/api/admin/queue-paused?queueName=${queueName}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pause: !isPaused }),
        },
      );
      if (res.ok) {
        setIsPaused((prev) => !prev);
      }
    } catch (error) {
      console.error('Failed to toggle pause state:', error);
    }
  };

  return (
    <ActionButton action={handleTogglePause} className={isPaused ? 'bg-green-100 hover:bg-green-200' : 'bg-yellow-100 hover:bg-yellow-200'}>
      {isPaused ? (
        <>
          <Play className="mr-1 h-4 w-4" /> Resume Queue
        </>
      ) : (
        <>
          <Pause className="mr-1 h-4 w-4" /> Pause Queue
        </>
      )}
    </ActionButton>
  );
}
