import { useEffect, useRef, useState } from 'react';
import { scanFolders } from '@/app/actions/scan';
import type { ScanProgress } from '@/types/progress-types';

export function useScanFolders() {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup function to abort scanning when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const startScan = async () => {
    setIsScanning(true);
    setProgress(null);
    abortControllerRef.current = new AbortController();

    try {
      const stream = await scanFolders();
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages
          const messages = buffer.split('\n\n');
          buffer = messages.pop() || ''; // Keep the last incomplete message

          for (const message of messages) {
            if (message.startsWith('data: ')) {
              const data = message.slice(6);
              try {
                const progressUpdate: ScanProgress = JSON.parse(data);

                setProgress(progressUpdate);

                // If scan is complete or there's an error, we're done
                if (
                  progressUpdate.status === 'completed' ||
                  progressUpdate.status === 'error'
                ) {
                  setIsScanning(false);
                }
              } catch (e) {
                console.error('Error parsing SSE message:', e);
              }
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer?.startsWith('data: ')) {
        try {
          const data = buffer.slice(6);
          const progressUpdate: ScanProgress = JSON.parse(data);

          setProgress(progressUpdate);

          if (
            progressUpdate.status === 'completed' ||
            progressUpdate.status === 'error'
          ) {
            setIsScanning(false);
          }
        } catch (e) {
          console.error('Error parsing SSE message:', e);
        }
      }
    } catch (error) {
      console.error('Error during scan:', error);
      setProgress({
        status: 'error',
        message: 'Error connecting to scan service',
        error: error instanceof Error ? error.message : String(error),
      });
      setIsScanning(false);
    }
  };

  const cancelScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsScanning(false);
    setProgress((prev) =>
      prev ? { ...prev, status: 'error', message: 'Scan cancelled' } : null,
    );
  };

  return {
    isScanning,
    progress,
    startScan,
    cancelScan,
  };
}
