'use client';

import { Separator } from '@radix-ui/react-select';
import { X } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatBytes } from '@/lib/consts';
import { useMediaSelection } from '../media-list/media-selection-context';

interface MediaDetailProps {
  onClose: () => void;
}

export function MediaDetail({ onClose }: MediaDetailProps) {
  const { selectedMedia } = useMediaSelection();

  // If no files are selected, show empty state
  if (selectedMedia.length === 0) {
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <CardTitle className="text-lg">Details</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Select a file to view details
        </div>
      </div>
    );
  }

  // Get the first selected file for display
  const file = selectedMedia[0];
  const fileName = file.file_path.split('/').pop() || file.file_path;

  return (
    <div className="h-full flex flex-col">
      <CardHeader className="px-4 py-3 flex flex-row justify-between items-center">
        <CardTitle className="text-lg">
          {selectedMedia.length > 1
            ? `${selectedMedia.length} files selected`
            : 'File Details'}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      {/* If multiple files selected, show summary info */}
      {selectedMedia.length > 1 ? (
        <CardContent>
          <p>
            {selectedMedia.length} files selected with a total size of{' '}
            {formatBytes(
              selectedMedia.reduce((sum, file) => sum + file.size_bytes, 0),
            )}
          </p>
          {/* You could add batch operations here */}
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm">
              Hide Selected
            </Button>
            <Button variant="destructive" size="sm">
              Delete Selected
            </Button>
          </div>
        </CardContent>
      ) : (
        /* Single file detailed view */
        <div className="flex-1 overflow-auto">
          {/* Preview */}
          {file.thumbnail && (
            <div className="p-4 border-b">
              <Image
                src={file.thumbnail.thumbnail_url}
                alt={fileName}
                className="max-h-[300px] w-full object-contain"
              />
            </div>
          )}

          {/* Tabs for different information categories */}
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="info" className="flex-1">
                Info
              </TabsTrigger>
              {file.exif && (
                <TabsTrigger value="exif" className="flex-1">
                  EXIF
                </TabsTrigger>
              )}
              {file.analysis && (
                <TabsTrigger value="analysis" className="flex-1">
                  Analysis
                </TabsTrigger>
              )}
            </TabsList>

            {/* Basic Information */}
            <TabsContent value="info" className="p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Filename
                  </h3>
                  <p className="break-all mt-1">{fileName}</p>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    File Path
                  </h3>
                  <p className="break-all mt-1">{file.file_path}</p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      File Type
                    </h3>
                    <p className="mt-1">{file.file_type.type_name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Size
                    </h3>
                    <p className="mt-1">{formatBytes(file.size_bytes)}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Date Created
                  </h3>
                  <p className="mt-1">
                    {new Date(file.created_date).toLocaleString()}
                  </p>
                </div>

                {file.file_type.mime_type && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">
                        MIME Type
                      </h3>
                      <p className="mt-1">{file.file_type.mime_type}</p>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            {/* EXIF Information */}
            {file.exif && (
              <TabsContent value="exif" className="p-4">
                <div className="space-y-4">
                  {file.exif.camera_make && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Camera Make
                      </h3>
                      <p className="mt-1">{file.exif.camera_make}</p>
                    </div>
                  )}

                  {file.exif.camera_make && <Separator />}

                  {file.exif.camera_model && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Camera Model
                      </h3>
                      <p className="mt-1">{file.exif.camera_model}</p>
                    </div>
                  )}

                  {file.exif.camera_model && <Separator />}

                  {file.exif.exif_timestamp && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Date Taken
                      </h3>
                      <p className="mt-1">
                        {new Date(file.exif.exif_timestamp).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {file.exif.exif_timestamp && <Separator />}

                  {file.exif.gps_latitude && file.exif.gps_longitude && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Location
                      </h3>
                      <p className="mt-1">
                        {file.exif.gps_latitude.toFixed(6)},{' '}
                        {file.exif.gps_longitude.toFixed(6)}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            )}

            {/* Analysis Information */}
            {file.analysis && (
              <TabsContent value="analysis" className="p-4">
                <div className="space-y-4">
                  {file.analysis.image_description && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Description
                      </h3>
                      <p className="mt-1">{file.analysis.image_description}</p>
                    </div>
                  )}

                  {file.analysis.image_description &&
                    file.analysis.tags &&
                    file.analysis.tags.length > 0 && <Separator />}

                  {file.analysis.tags && file.analysis.tags.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Tags
                      </h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {file.analysis.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}
    </div>
  );
}
