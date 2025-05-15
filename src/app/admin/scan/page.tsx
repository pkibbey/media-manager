'use client';

import { FolderSearch, RefreshCw, Scan, Trash2 } from 'lucide-react'; // Added Trash2
import { useEffect, useState } from 'react';
import { deleteAllMediaItems } from '@/actions/admin/delete-all-media'; // Import the new action
import { getScanStats } from '@/actions/admin/get-scan-stats';
import { processScanFolder } from '@/actions/admin/process-scan-folder';
import ActionButton from '@/components/admin/action-button';
import AdminLayout from '@/components/admin/layout';
import { StatsCard } from '@/components/admin/stats-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function MediaScanPage() {
  const [scanStats, setScanStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [folderPath, setFolderPath] = useState<string>(
    process.env.NEXT_PUBLIC_MEDIA_SCAN_PATH || '',
  );
  const [scanProgress, setScanProgress] = useState<{
    status: string;
    processed: number;
    total: number;
    error?: string;
    processingComplete?: boolean;
  }>({
    status: 'idle',
    processed: 0,
    total: 0,
  });
  const [discoveredFolders, setDiscoveredFolders] = useState<Set<string>>(
    new Set(),
  );
  const [processedFolders, setProcessedFolders] = useState<Set<string>>(
    new Set(),
  );

  // Fetch scan stats on page load
  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);

      try {
        const response = await getScanStats();

        if (response.stats) {
          setScanStats(response.stats);
        }
      } catch (e) {
        console.error('Failed to load scan statistics:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Action for refreshing stats
  const refreshStats = async () => {
    try {
      const response = await getScanStats();

      if (response.stats) {
        setScanStats(response.stats);
      }
    } catch (e) {
      console.error('Failed to refresh stats:', e);
    }
  };

  // Original refreshStats for action button use
  const refreshStatsWithResult = async () => {
    const response = await getScanStats();

    if (response.stats) {
      setScanStats(response.stats);
      return { success: true };
    }

    return { success: false, error: response.error || 'Unknown error' };
  };

  // Scan folders and process
  const scanFolders = async () => {
    if (!folderPath.trim()) {
      return {
        success: false,
        error: 'Please enter a valid folder path',
      };
    }

    setIsProcessing(true);
    // Initialize scan progress for the entire operation
    setScanProgress({
      status: 'Initializing scan...',
      processed: 0,
      total: 0, // This will be cumulative total files found
      error: undefined,
      processingComplete: false,
    });

    // Tracks all unique folder paths encountered to avoid reprocessing.
    const allEncounteredFolders = new Set<string>();
    allEncounteredFolders.add(folderPath.replace(/\/$/, '')); // Normalize and add initial path

    // Queue of folder paths to process
    const foldersToProcessQueue: string[] = [folderPath.replace(/\/$/, '')];

    let cumulativeProcessedCount = 0;
    let cumulativeSkippedCount = 0;
    let cumulativeTotalFilesFound = 0;
    let overallSuccess = true; // Assume success until an error occurs
    let lastErrorMessage: string | undefined;

    // Clear the UI display of discovered and processed folders from any previous run.
    setDiscoveredFolders(new Set());
    setProcessedFolders(new Set());

    let feedbackTimeoutId: NodeJS.Timeout | null = null;

    try {
      feedbackTimeoutId = setTimeout(() => {
        // Check isProcessing again in case the scan finished very quickly
        if (isProcessing) {
          setScanProgress((prev) => ({
            ...prev,
            status:
              prev.status === 'Initializing scan...'
                ? 'Scanning folders. This may take a while for large directories...'
                : prev.status, // Keep current status if it already updated
          }));
        }
      }, 2000);

      while (foldersToProcessQueue.length > 0) {
        const currentPathToScan = foldersToProcessQueue.shift()!;

        setScanProgress((prev) => ({
          ...prev,
          status: `Processing: ${currentPathToScan} (${foldersToProcessQueue.length} more in queue)...`,
          processed: cumulativeProcessedCount, // Show cumulative processed so far
          total: cumulativeTotalFilesFound, // Show cumulative total found so far
          error: undefined, // Clear previous folder-specific error display for this update
        }));

        try {
          // Call the server action to scan and process the current folder
          const result = await processScanFolder(currentPathToScan);

          // Mark this folder as processed
          setProcessedFolders((prevProcessedFolders) => {
            const updatedProcessedFolders = new Set(prevProcessedFolders);
            updatedProcessedFolders.add(currentPathToScan);
            return updatedProcessedFolders;
          });

          // Refetch scan stats after each folder is processed
          await refreshStats();

          cumulativeProcessedCount += result.processed || 0;
          cumulativeSkippedCount += result.skipped || 0;
          cumulativeTotalFilesFound += result.total || 0;

          if (!result.success) {
            overallSuccess = false;
            // Type guard for error property
            const currentError =
              'error' in result
                ? (result as any).error
                : 'Unknown error processing folder';
            lastErrorMessage = `Error in ${currentPathToScan}: ${currentError}`;
            console.error(lastErrorMessage);
            // Update progress with error for this specific folder, but operation continues
            setScanProgress((prev) => ({
              ...prev,
              status: `Error on ${currentPathToScan}. Processed: ${cumulativeProcessedCount}. Skipped: ${cumulativeSkippedCount}. Continuing...`,
              processed: cumulativeProcessedCount,
              total: cumulativeTotalFilesFound,
              error: lastErrorMessage, // Display the latest error
            }));
          } else {
            // Update progress after successful processing of a folder
            setScanProgress((prev) => ({
              ...prev,
              status: `Finished ${currentPathToScan}. Processed: ${cumulativeProcessedCount}. Skipped: ${cumulativeSkippedCount}. Queue: ${foldersToProcessQueue.length}`,
              processed: cumulativeProcessedCount,
              total: cumulativeTotalFilesFound,
            }));
          }

          // Add discovered subdirectories to the queue and UI
          if (result.directories && result.directories.length > 0) {
            const newlyDiscoveredPathsForUI: string[] = [];
            for (const dirName of result.directories) {
              // Ensure consistent path formatting (no trailing slash)
              const normalizedParentPath = currentPathToScan.replace(/\/$/, '');
              const fullDiscoveredPath = `${normalizedParentPath}/${dirName}`;

              if (!allEncounteredFolders.has(fullDiscoveredPath)) {
                allEncounteredFolders.add(fullDiscoveredPath);
                foldersToProcessQueue.push(fullDiscoveredPath);
                newlyDiscoveredPathsForUI.push(fullDiscoveredPath);
              }
            }
            if (newlyDiscoveredPathsForUI.length > 0) {
              setDiscoveredFolders((prevUiFolders) => {
                const updatedUiFolders = new Set(prevUiFolders);
                newlyDiscoveredPathsForUI.forEach((p) =>
                  updatedUiFolders.add(p),
                );
                return updatedUiFolders;
              });
            }
          }
        } catch (folderProcessingError) {
          // This catch block handles errors from the processScanFolder call itself (e.g., network issues)
          overallSuccess = false;
          lastErrorMessage = `Critical error processing ${currentPathToScan}: ${
            folderProcessingError instanceof Error
              ? folderProcessingError.message
              : 'Unknown critical error'
          }`;
          console.error(lastErrorMessage);
          setScanProgress((prev) => ({
            ...prev,
            status: `Critical error on ${currentPathToScan}. Processed: ${cumulativeProcessedCount}. Attempting to continue...`,
            processed: cumulativeProcessedCount,
            total: cumulativeTotalFilesFound,
            error: lastErrorMessage,
          }));
        }
      } // End of while loop

      if (feedbackTimeoutId) {
        clearTimeout(feedbackTimeoutId);
      }

      // Final progress update after all folders are processed
      setScanProgress({
        status: `Scan complete. Total folders processed: ${processedFolders.size}. Total files processed: ${cumulativeProcessedCount} (Skipped: ${cumulativeSkippedCount}). Total files found: ${cumulativeTotalFilesFound}.`,
        processed: cumulativeProcessedCount,
        total: cumulativeTotalFilesFound,
        processingComplete: true,
        error: lastErrorMessage, // Display the last error message if any occurred
      });

      // Refresh overall stats after the entire batch of processing
      await refreshStats();

      return {
        success: overallSuccess,
        message: `Processed ${cumulativeProcessedCount} files (Skipped: ${cumulativeSkippedCount}) from ${cumulativeTotalFilesFound} files found across all scanned directories. ${
          overallSuccess ? '' : 'Some folders encountered errors.'
        }`,
        error: overallSuccess ? undefined : lastErrorMessage,
      };
    } catch (err) {
      // This catch block is for errors during the setup of scanFolders or unhandled exceptions
      if (feedbackTimeoutId) {
        clearTimeout(feedbackTimeoutId);
      }
      console.error('Fatal error during scan operation:', err);
      const fatalErrorMessage =
        err instanceof Error ? err.message : 'Unknown fatal error during scan';
      setScanProgress({
        status: `Fatal error during scan operation. Processed ${processedFolders.size} folders before error.`,
        processed: cumulativeProcessedCount, // Show what was processed before fatal error
        total: cumulativeTotalFilesFound, // Show what was found before fatal error
        error: fatalErrorMessage,
        processingComplete: false, // Not fully complete due to fatal error
      });
      return {
        success: false,
        error: fatalErrorMessage,
      };
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Media Scanner</h2>
            <p className="text-muted-foreground">
              Scan directories and import new media files
            </p>
          </div>
          <ActionButton
            action={refreshStatsWithResult}
            variant="outline"
            loadingMessage="Refreshing..."
            successMessage="Stats updated"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Stats
          </ActionButton>
        </div>

        <StatsCard
          title="Media Library Status"
          total={scanStats?.total || 0}
          processed={scanStats?.scanned || 0}
          isLoading={isLoading}
          icon={<FolderSearch className="h-4 w-4" />}
          className="w-full"
        />

        <Tabs defaultValue="scanning">
          <TabsList>
            <TabsTrigger value="scanning">Folder Scanning</TabsTrigger>
            <TabsTrigger value="history">Scan History</TabsTrigger>
          </TabsList>

          <TabsContent value="scanning" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Scan Media Directory</CardTitle>
                <CardDescription>
                  Select a directory to scan and automatically import new media
                  files
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div>
                    <Input
                      id="folder-path"
                      placeholder="/path/to/media/folder"
                      value={folderPath}
                      onChange={(e) => setFolderPath(e.target.value)}
                      className={
                        !folderPath.trim().startsWith('/') &&
                        folderPath.trim() !== ''
                          ? 'border-red-500'
                          : ''
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter the absolute path to the folder you want to scan
                    </p>
                    {!folderPath.trim().startsWith('/') &&
                      folderPath.trim() !== '' && (
                        <p className="text-xs text-red-500 mt-1">
                          Path must be absolute (start with /)
                        </p>
                      )}
                  </div>
                </div>

                {scanProgress.status !== 'idle' && (
                  <div className="mt-4">
                    <div className="space-y-2">
                      <Progress
                        value={
                          discoveredFolders.size > 0
                            ? (processedFolders.size / discoveredFolders.size) *
                              100
                            : 0
                        }
                      />
                      <div className="text-sm text-muted-foreground">
                        <div>
                          Folders: {processedFolders.size} processed of{' '}
                          {discoveredFolders.size} discovered
                        </div>
                        <div>{scanProgress.status}</div>
                        {scanProgress.error && (
                          <p className="text-red-500">{scanProgress.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {scanProgress.processingComplete && (
                  <Alert className="mt-4">
                    <AlertTitle>Scan Complete</AlertTitle>
                    <AlertDescription>
                      All folders have been processed successfully.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <ActionButton
                  action={scanFolders}
                  disabled={isProcessing}
                  loadingMessage="Scanning and processing files..."
                  successMessage="Files processed successfully"
                >
                  <Scan className="h-4 w-4 mr-2" />
                  Scan Folders
                </ActionButton>
                {/* New Button to Delete All Media Items */}
                <ActionButton
                  action={async () => {
                    // TODO: Implement a confirmation dialog here for safety
                    // For example: if (!confirm('Are you sure you want to delete ALL media items?')) return { success: false, error: 'Deletion cancelled' };
                    const result = await deleteAllMediaItems();
                    if (result.success) {
                      await refreshStats(); // Refresh stats after deletion
                    }
                    return result;
                  }}
                  disabled={isProcessing} // Disable if a scan is in progress
                  variant="destructive" // Use destructive variant for delete actions
                  loadingMessage="Deleting all media items..."
                  successMessage="All media items deleted successfully"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All Media
                </ActionButton>
              </CardFooter>
            </Card>
            {/* New: Discovered folders count */}
            {discoveredFolders.size > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Discovered Folders</CardTitle>
                  <CardDescription>
                    Number of folders found during the scan process
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {discoveredFolders.size}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Scan History</CardTitle>
                <CardDescription>
                  Recent folder scans and imported files
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Total media items in database: {scanStats?.total || 0}
                </div>
                {/* History table could be added here in the future */}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
