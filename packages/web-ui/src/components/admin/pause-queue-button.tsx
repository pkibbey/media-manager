'use client';

import {} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { QueueName } from 'shared/types';
import { ActionButton } from './action-button';

interface PauseQueueButtonProps {
  queueName: QueueName;
}

export function PauseQueueButton({ queueName }: PauseQueueButtonProps) {
  const [isPaused, setIsPaused] = useState<boolean>(true);

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
          if (isMounted) setIsPaused(true);
        }
      } catch {
        if (isMounted) setIsPaused(true);
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
    <div className="relative">
      {/* Sleeping Z animation when paused */}
      {isPaused && (
        <div className="absolute -top-5 right-5 -translate-x-1/2 pointer-events-none">
          <div className="animate-float-z-1 text-blue-400 font-bold text-sm opacity-70">
            Z
          </div>
          <div className="animate-float-z-2 text-blue-400 font-bold text-xs opacity-50 absolute -top-2 left-2">
            z
          </div>
          <div className="animate-float-z-3 text-blue-400 font-bold text-xs opacity-30 absolute -top-4 left-4">
            z
          </div>
        </div>
      )}

      {/* Activity indicators when playing */}
      {isPaused === false && (
        <div className="absolute -top-5 h-5 left-1/2 -translate-x-1/2 pointer-events-none w-16 overflow-hidden">
          <div className="animate-bubble-1 w-1 h-1 bg-green-300 rounded-full absolute bottom-0 left-1" />
          <div className="animate-bubble-2 w-1 h-1 bg-green-300 rounded-full absolute bottom-0 left-3" />
          <div className="animate-bubble-3 w-1 h-1 bg-green-200 rounded-full absolute bottom-0 left-5" />
          <div className="animate-bubble-4 w-0.5 h-0.5 bg-green-200 rounded-full absolute bottom-0 left-0" />
          <div className="animate-bubble-5 w-0.5 h-0.5 bg-green-200 rounded-full absolute bottom-0 left-6" />
          <div className="animate-bubble-6 w-1 h-1 bg-green-200 rounded-full absolute bottom-0 left-8" />
          <div className="animate-bubble-7 w-1 h-1 bg-green-300 rounded-full absolute bottom-0 left-10" />
          <div className="animate-bubble-8 w-1 h-1 bg-green-300 rounded-full absolute bottom-0 left-12" />
          <div className="animate-bubble-9 w-0.5 h-0.5 bg-green-200 rounded-full absolute bottom-0 left-7" />
          <div className="animate-bubble-10 w-0.5 h-0.5 bg-green-200 rounded-full absolute bottom-0 left-14" />
        </div>
      )}

      <ActionButton
        action={handleTogglePause}
        className={
          isPaused
            ? 'bg-blue-100 hover:bg-blue-200 animate-sleeping'
            : 'bg-green-700 hover:bg-green-800 animate-active-glow'
        }
      >
        <span className="relative z-10 text-shadow-2xs font-semibold">
          {isPaused ? 'Queue Sleeping' : 'Queue Active'}
        </span>
      </ActionButton>

      <style jsx>{`
        @keyframes float-z-1 {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.7;
          }
          100% {
            transform: translateY(-20px) scale(1.3);
            opacity: 0;
          }
        }
        
        @keyframes float-z-2 {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.5;
          }
          100% {
            transform: translateY(-25px) scale(1.5);
            opacity: 0;
          }
        }
        
        @keyframes float-z-3 {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.3;
          }
          100% {
            transform: translateY(-30px) scale(1.7);
            opacity: 0;
          }
        }
        
        @keyframes bubble-1 {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            transform: translateY(-40px) scale(1.2);
            opacity: 0;
          }
        }
        
        @keyframes bubble-2 {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          25% {
            opacity: 1;
          }
          75% {
            opacity: 1;
          }
          100% {
            transform: translateY(-35px) scale(1.1);
            opacity: 0;
          }
        }
        
        @keyframes bubble-3 {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            transform: translateY(-45px) scale(1.3);
            opacity: 0;
          }
        }
        
        @keyframes bubble-4 {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          30% {
            opacity: 0.8;
          }
          70% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-30px) scale(1.0);
            opacity: 0;
          }
        }
        
        @keyframes bubble-5 {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-50px) scale(1.4);
            opacity: 0;
          }
        }
        
        @keyframes bubble-6 {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          25% {
            opacity: 1;
          }
          75% {
            opacity: 1;
          }
          100% {
            transform: translateY(-42px) scale(1.2);
            opacity: 0;
          }
        }
        
        @keyframes bubble-7 {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            transform: translateY(-38px) scale(1.1);
            opacity: 0;
          }
        }
        
        @keyframes bubble-8 {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            transform: translateY(-47px) scale(1.3);
            opacity: 0;
          }
        }
        
        @keyframes bubble-9 {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          30% {
            opacity: 0.7;
          }
          70% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(-33px) scale(1.0);
            opacity: 0;
          }
        }
        
        @keyframes bubble-10 {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          12% {
            opacity: 0.8;
          }
          88% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-52px) scale(1.5);
            opacity: 0;
          }
        }
        
        @keyframes active-glow {
          0%, 100% {
            box-shadow: 0 0 8px rgba(251, 146, 60, 0.4);
          }
          50% {
            box-shadow: 0 0 20px rgba(251, 146, 60, 0.7);
          }
        }
        
        @keyframes sleeping {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        
        .animate-float-z-1 {
          animation: float-z-1 2s infinite ease-out;
        }
        
        .animate-float-z-2 {
          animation: float-z-2 2.5s infinite ease-out 0.5s;
        }
        
        .animate-float-z-3 {
          animation: float-z-3 3s infinite ease-out 1s;
        }
        
        .animate-bubble-1 {
          animation: bubble-1 3.5s infinite linear;
        }
        
        .animate-bubble-2 {
          animation: bubble-2 4.0s infinite linear 0.5s;
        }
        
        .animate-bubble-3 {
          animation: bubble-3 4.5s infinite linear 1.0s;
        }
        
        .animate-bubble-4 {
          animation: bubble-4 3.0s infinite linear 1.5s;
        }
        
        .animate-bubble-5 {
          animation: bubble-5 4.2s infinite linear 2.0s;
        }
        
        .animate-bubble-6 {
          animation: bubble-6 3.8s infinite linear 2.5s;
        }
        
        .animate-bubble-7 {
          animation: bubble-7 3.3s infinite linear 3.0s;
        }
        
        .animate-bubble-8 {
          animation: bubble-8 4.3s infinite linear 3.5s;
        }
        
        .animate-bubble-9 {
          animation: bubble-9 3.2s infinite linear 4.0s;
        }
        
        .animate-bubble-10 {
          animation: bubble-10 4.1s infinite linear 4.5s;
        }
        
        .animate-active-glow {
          animation: active-glow 1.5s infinite ease-in-out;
        }
        
        .animate-sleeping {
          animation: sleeping 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
