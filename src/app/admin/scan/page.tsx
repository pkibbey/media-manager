'use client';

import { Folder, RefreshCw, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { processScanResults } from '@/actions/admin/scan-directory';
import ActionButton from '@/components/admin/action-button';
import AdminLayout from '@/components/admin/layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { FileDetails } from '@/types/scan-types';

interface ScanStatus {
  totalFiles: number;
  processedFiles: number;
  currentDirectory: string;
  filesAdded: number;
  filesSkipped: number;
  errors: string[];
  mediaTypeStats: Record<string, number>;
}

export default function MediaScanPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [selectedDir, setSelectedDir] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>({
    totalFiles: 0,
    processedFiles: 0,
    currentDirectory: '',
    filesAdded: 0,
    filesSkipped: 0,
    errors: [],
    mediaTypeStats: {},
  });

  // Handle directory selection
  const handleSelectDirectory = async () => {
    try {
      // Use the File System Access API to select a directory
      const directoryHandle = await window.showDirectoryPicker({
        mode: 'read',
        startIn: 'desktop',
      });

      setSelectedDir(directoryHandle);
      setScanStatus({
        totalFiles: 0,
        processedFiles: 0,
        currentDirectory: directoryHandle.name,
        filesAdded: 0,
        filesSkipped: 0,
        errors: [],
        mediaTypeStats: {},
      });
    } catch (error) {
      // User canceled the picker or an error occurred
      console.error('Error selecting directory:', error);
    }
  };

  // Clear the selected directory
  const clearSelectedDirectory = () => {
    setSelectedDir(null);
    setScanStatus({
      totalFiles: 0,
      processedFiles: 0,
      currentDirectory: '',
      filesAdded: 0,
      filesSkipped: 0,
      errors: [],
      mediaTypeStats: {},
    });
  };

  // Process files in batches to avoid overwhelming the server
  const processBatch = useCallback(async (files: FileDetails[]) => {
    if (files.length === 0) return null;

    try {
      const result = await processScanResults(files);

      setScanStatus((prev) => ({
        ...prev,
        filesAdded: prev.filesAdded + result.filesAdded,
        filesSkipped: prev.filesSkipped + result.filesSkipped,
        errors: [...prev.errors, ...result.errors],
        mediaTypeStats: Object.entries(result.mediaTypeStats).reduce(
          (acc, [type, count]) => {
            acc[type] = (acc[type] || 0) + count;
            return acc;
          },
          { ...prev.mediaTypeStats },
        ),
      }));

      return result;
    } catch (error) {
      console.error('Error processing batch:', error);
      return null;
    }
  }, []);

  // Start the directory scan
  const startScan = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!selectedDir) {
      return { success: false, error: 'No directory selected' };
    }

    setIsScanning(true);
    setScanStatus((prev) => ({
      ...prev,
      totalFiles: 0,
      processedFiles: 0,
      filesAdded: 0,
      filesSkipped: 0,
      errors: [],
      mediaTypeStats: {},
    }));

    const files: FileDetails[] = [];
    let filesToProcess = 0;

    try {
      // First, count all files to get an accurate total
      async function countFiles(
        dirHandle: FileSystemDirectoryHandle,
        path = '',
      ): Promise<number> {
        let count = 0;

        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'directory') {
            count += await countFiles(entry, `${path}/${entry.name}`);
          } else {
            count++;
          }
        }

        return count;
      }

      filesToProcess = await countFiles(selectedDir);
      setScanStatus((prev) => ({
        ...prev,
        totalFiles: filesToProcess,
      }));

      // Then process all files recursively
      async function processDirectory(
        dirHandle: FileSystemDirectoryHandle,
        path = '',
        relativePath = '',
      ): Promise<void> {
        // Loop through all entries in the directory
        for await (const entry of dirHandle.values()) {
          const entryPath = path ? `${path}/${entry.name}` : entry.name;
          const entryRelativePath = relativePath
            ? `${relativePath}/${entry.name}`
            : entry.name;

          setScanStatus((prev) => ({
            ...prev,
            currentDirectory: entryPath,
          }));

          if (entry.kind === 'directory') {
            // Recursively process subdirectories
            await processDirectory(entry, entryPath, entryRelativePath);
          } else {
            // Process files
            try {
              const fileHandle = entry;
              const file = await fileHandle.getFile();

              files.push({
                path: entryPath,
                name: file.name,
                relativePath: entryRelativePath,
                size: file.size,
                type: file.type || 'application/octet-stream',
                lastModified: file.lastModified,
              });

              // Process in batches of 50 files
              if (files.length >= 50) {
                await processBatch([...files]);
                files.length = 0; // Clear the array
              }

              setScanStatus((prev) => ({
                ...prev,
                processedFiles: prev.processedFiles + 1,
              }));
            } catch (error) {
              console.error(`Error processing file ${entry.name}:`, error);
              setScanStatus((prev) => ({
                ...prev,
                errors: [
                  ...prev.errors,
                  `Failed to access ${entry.name}: ${error}`,
                ],
              }));
            }
          }
        }
      }

      // Start processing from the root directory
      await processDirectory(selectedDir, selectedDir.name, '');

      // Process any remaining files
      if (files.length > 0) {
        await processBatch([...files]);
      }

      return { success: true };
    } catch (error) {
      console.error('Error scanning directory:', error);
      setScanStatus((prev) => ({
        ...prev,
        errors: [...prev.errors, `Scan error: ${error}`],
      }));
      return { success: false, error: String(error) };
    } finally {
      setIsScanning(false);
    }
  }, [selectedDir, processBatch]);

  // Calculate progress percentage
  const progressPercentage = scanStatus.totalFiles
    ? Math.round((scanStatus.processedFiles / scanStatus.totalFiles) * 100)
    : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Media Scanner</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Scan Directory</CardTitle>
            <CardDescription>
              Select a directory to scan for media files and add them to the
              database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Directory Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleSelectDirectory}
                  disabled={isScanning}
                  className="flex items-center gap-2"
                >
                  <Folder className="h-4 w-4" />
                  Select Directory
                </Button>

                {selectedDir && (
                  <div className="flex items-center gap-2 bg-muted px-3 py-1 rounded-md flex-1">
                    <span className="font-mono text-sm truncate">
                      {selectedDir.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={clearSelectedDirectory}
                      disabled={isScanning}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Scan Controls */}
              {selectedDir && !isScanning && (
                <ActionButton
                  action={startScan}
                  variant="default"
                  className="flex items-center gap-2 mt-4"
                  loadingMessage="Starting scan..."
                >
                  <RefreshCw className="h-4 w-4" />
                  Start Scan
                </ActionButton>
              )}
            </div>

            {/* Scan Progress */}
            {isScanning && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Scanning files...</span>
                  <span>
                    {scanStatus.processedFiles} / {scanStatus.totalFiles} files
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  Current directory: {scanStatus.currentDirectory}
                </div>
              </div>
            )}

            {/* Scan Results */}
            {(scanStatus.filesAdded > 0 || scanStatus.filesSkipped > 0) && (
              <div className="border rounded-md p-4 mt-4">
                <h3 className="text-lg font-medium mb-2">Scan Results</h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Files Added
                    </div>
                    <div className="text-2xl font-bold">
                      {scanStatus.filesAdded}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Files Skipped
                    </div>
                    <div className="text-2xl font-bold">
                      {scanStatus.filesSkipped}
                    </div>
                  </div>
                </div>

                {/* Media Type Breakdown */}
                {Object.keys(scanStatus.mediaTypeStats).length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">File Types</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(scanStatus.mediaTypeStats).map(
                        ([type, count]) => (
                          <Badge key={type} variant="outline">
                            {type}: {count}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Errors */}
                {scanStatus.errors.length > 0 && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTitle>Errors</AlertTitle>
                    <AlertDescription>
                      <div className="text-xs mt-2 max-h-40 overflow-y-auto">
                        {scanStatus.errors.map((error, index) => (
                          <div key={index} className="mb-1">
                            {error}
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-muted/50 border-t">
            <p className="text-xs text-muted-foreground">
              Note: This tool will scan the selected directory recursively and
              add all media files to your database. Existing files with the same
              path will be skipped.
            </p>
          </CardFooter>
        </Card>
      </div>
    </AdminLayout>
  );
}
