'use client';

import { scanFolders } from '@/app/actions/scan-folders';
import type { ScanProgress } from '@/types/progress-types';
import { ReloadIcon } from '@radix-ui/react-icons';
import { useEffect, useRef, useState } from 'react';

export default function ScanFoldersTrigger() {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [ignoreSmallFiles, setIgnoreSmallFiles] = useState(true);
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
      // Pass the ignoreSmallFiles option to the server action
      const stream = await scanFolders({ ignoreSmallFiles });
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 items-start">
        <div>
          <h3 className="text-lg font-medium">Scan Folders</h3>
          <p className="text-sm text-muted-foreground">
            Scans all configured folders for media files and adds them to the
            database. Unchanged files will be skipped to improve performance.
          </p>
        </div>

        {/* Checkbox for ignoring small files */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="ignoreSmallFiles"
            checked={ignoreSmallFiles}
            onChange={(e) => setIgnoreSmallFiles(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            disabled={isScanning}
          />
          <label
            htmlFor="ignoreSmallFiles"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Ignore files (under 10Kb)
          </label>
        </div>

        <button
          onClick={isScanning ? cancelScan : startScan}
          disabled={isScanning && !abortControllerRef.current}
          className={`px-4 py-2 rounded-md flex items-center gap-2 ${
            isScanning
              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {isScanning && <ReloadIcon className="h-4 w-4 animate-spin" />}
          {isScanning ? 'Cancel Scan' : 'Start Scan'}
        </button>
      </div>

      {/* Progress area */}
      {progress && (
        <div
          className={`border rounded-md p-4 ${
            progress.status === 'error' ? 'bg-destructive/10' : 'bg-muted'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <h4
              className={`font-medium ${
                progress.status === 'error' ? 'text-destructive' : ''
              }`}
            >
              {progress.status === 'processing' && 'Scanning folders...'}
              {progress.status === 'completed' && 'Scan complete'}
              {progress.status === 'error' && 'Scan error'}
            </h4>
            <span className="text-xs text-muted-foreground">
              {progress.status === 'processing' &&
                progress.filesDiscovered &&
                progress.filesProcessed &&
                `${progress.filesProcessed}/${progress.filesDiscovered} files`}
            </span>
          </div>

          <div className="text-sm mb-2">{progress.message}</div>

          {/* Progress bar */}
          {progress.status === 'processing' &&
            progress.filesDiscovered !== undefined &&
            progress.filesProcessed !== undefined && (
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{
                    width: `${
                      (progress.filesProcessed /
                        Math.max(progress.filesDiscovered, 1)) *
                      100
                    }%`,
                  }}
                />
              </div>
            )}

          {/* Additional statistics in a grid layout for better organization */}
          {(progress.filesProcessed !== undefined ||
            progress.newFilesAdded !== undefined ||
            progress.ignoredFilesSkipped !== undefined ||
            progress.smallFilesSkipped !== undefined) && (
            <div className="grid grid-cols-3 gap-2 mt-3 text-sm border-t border-border/30 pt-2">
              {progress.filesProcessed !== undefined && (
                <div>
                  <div className="text-xs text-muted-foreground">Processed</div>
                  <div className="font-medium">{progress.filesProcessed}</div>
                </div>
              )}

              {progress.newFilesAdded !== undefined && (
                <div>
                  <div className="text-xs text-muted-foreground">
                    New/Updated
                  </div>
                  <div className="font-medium">{progress.newFilesAdded}</div>
                </div>
              )}

              {progress.ignoredFilesSkipped !== undefined && (
                <div>
                  <div className="text-xs text-muted-foreground">Ignored</div>
                  <div className="font-medium">
                    {progress.ignoredFilesSkipped}
                  </div>
                </div>
              )}

              {progress.smallFilesSkipped !== undefined && (
                <div>
                  <div className="text-xs text-muted-foreground">
                    Small Files
                  </div>
                  <div className="font-medium">
                    {progress.smallFilesSkipped}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* New file types discovered */}
          {progress.newFileTypes && progress.newFileTypes.length > 0 && (
            <div className="mt-3 border-t border-border/30 pt-2">
              <div className="text-xs text-muted-foreground">
                Discovered {progress.newFileTypes.length} new file types:
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {progress.newFileTypes.map((type) => (
                  <span
                    key={type}
                    className="text-xs px-2 py-1 bg-secondary rounded-md"
                  >
                    .{type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error details */}
          {progress.error && (
            <div className="text-xs text-destructive mt-2">
              {progress.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
