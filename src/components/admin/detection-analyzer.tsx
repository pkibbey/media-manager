'use client';

import { runDetectionAnalysis } from '@/app/actions/detection';
import { addAbortToken, removeAbortToken } from '@/lib/abort-tokens';
import type {
  DetectionMethod,
  DetectionProgress,
} from '@/types/detection-types';
import { ReloadIcon } from '@radix-ui/react-icons';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';

export default function DetectionAnalyzer() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<DetectionProgress | null>(null);
  const [skipProcessedFiles, setSkipProcessedFiles] = useState(true);
  const [minConfidence, setMinConfidence] = useState(50);
  const [detectionMethod, setDetectionMethod] =
    useState<DetectionMethod>('default');
  const abortTokenRef = useRef<string | null>(null);

  // Cleanup function to abort processing when component unmounts
  useEffect(() => {
    return () => {
      if (abortTokenRef.current) {
        removeAbortToken(abortTokenRef.current);
        abortTokenRef.current = null;
      }
    };
  }, []);

  const startAnalysis = async () => {
    setIsProcessing(true);
    setProgress(null);

    // Generate an abort token
    abortTokenRef.current = `${Date.now()}-${Math.random()}`;

    // Add the token to allow us to cancel the process
    await addAbortToken(abortTokenRef.current);

    try {
      // Call the server action directly instead of using fetch
      const stream = await runDetectionAnalysis({
        skipProcessedFiles,
        minConfidence,
        detectionMethod,
        abortToken: abortTokenRef.current,
      });

      // Process SSE stream for progress updates
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      let buffer = '';
      let done = false;

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
                const progressUpdate: DetectionProgress = JSON.parse(data);

                setProgress(progressUpdate);

                // If detection is complete or there's an error, we're done
                if (
                  progressUpdate.status === 'completed' ||
                  progressUpdate.status === 'error'
                ) {
                  setIsProcessing(false);
                  if (abortTokenRef.current) {
                    removeAbortToken(abortTokenRef.current);
                    abortTokenRef.current = null;
                  }
                }
              } catch (e) {
                console.error('Error parsing SSE message:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error during detection:', error);
      setProgress({
        status: 'error',
        message: 'Error connecting to detection service',
        error: error instanceof Error ? error.message : String(error),
      });
      setIsProcessing(false);
      if (abortTokenRef.current) {
        removeAbortToken(abortTokenRef.current);
        abortTokenRef.current = null;
      }
    }
  };

  const cancelAnalysis = async () => {
    if (abortTokenRef.current) {
      await removeAbortToken(abortTokenRef.current);
      abortTokenRef.current = null;
    }
    setIsProcessing(false);
    setProgress((prev) =>
      prev
        ? { ...prev, status: 'error', message: 'Detection cancelled' }
        : null,
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Media Detection Analysis</CardTitle>
        <CardDescription>
          Extract keywords and identify objects in your media files using image
          recognition. This process will analyze your media files and extract
          useful keywords for searching.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col gap-4">
            {/* Configuration options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Skip processed files option */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="skipProcessedFiles"
                  checked={skipProcessedFiles}
                  onChange={(e) => setSkipProcessedFiles(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  disabled={isProcessing}
                />
                <label
                  htmlFor="skipProcessedFiles"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Skip already processed files
                </label>
              </div>

              {/* Detection method selector */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="detectionMethod"
                  className="text-sm font-medium"
                >
                  Detection Method
                </label>
                <select
                  id="detectionMethod"
                  value={detectionMethod}
                  onChange={(e) =>
                    setDetectionMethod(e.target.value as DetectionMethod)
                  }
                  className="rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  disabled={isProcessing}
                >
                  <option value="default">Default (Local First)</option>
                  <option value="local-model">Local Model Only</option>
                  <option value="cloud-api">Cloud API Only</option>
                  <option value="hybrid">Hybrid (Local + Cloud)</option>
                </select>
              </div>

              {/* Confidence threshold slider */}
              <div className="flex flex-col gap-2">
                <label htmlFor="minConfidence" className="text-sm font-medium">
                  Minimum Confidence ({minConfidence}%)
                </label>
                <input
                  type="range"
                  id="minConfidence"
                  min="0"
                  max="100"
                  step="5"
                  value={minConfidence}
                  onChange={(e) =>
                    setMinConfidence(Number.parseInt(e.target.value, 10))
                  }
                  className="w-full"
                  disabled={isProcessing}
                />
              </div>
            </div>

            {/* Start/Cancel button */}
            <Button
              onClick={isProcessing ? cancelAnalysis : startAnalysis}
              disabled={isProcessing && !abortTokenRef.current}
              className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                isProcessing
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {isProcessing && <ReloadIcon className="h-4 w-4 animate-spin" />}
              {isProcessing ? 'Cancel Detection' : 'Start Detection Analysis'}
            </Button>
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
                  {progress.status === 'started' && 'Starting detection...'}
                  {progress.status === 'processing' && 'Analyzing media...'}
                  {progress.status === 'completed' && 'Analysis complete'}
                  {progress.status === 'error' && 'Analysis error'}
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

              {/* Additional statistics */}
              {(progress.filesProcessed !== undefined ||
                progress.successCount !== undefined ||
                progress.failedCount !== undefined ||
                progress.skippedFiles !== undefined) && (
                <div className="grid grid-cols-4 gap-2 mt-3 text-sm border-t border-border/30 pt-2">
                  {progress.filesProcessed !== undefined && (
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Processed
                      </div>
                      <div className="font-medium">
                        {progress.filesProcessed}
                      </div>
                    </div>
                  )}

                  {progress.successCount !== undefined && (
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Successful
                      </div>
                      <div className="font-medium">{progress.successCount}</div>
                    </div>
                  )}

                  {progress.failedCount !== undefined && (
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Failed
                      </div>
                      <div className="font-medium">{progress.failedCount}</div>
                    </div>
                  )}

                  {progress.skippedFiles !== undefined && (
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Skipped
                      </div>
                      <div className="font-medium">{progress.skippedFiles}</div>
                    </div>
                  )}
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
      </CardContent>
    </Card>
  );
}
