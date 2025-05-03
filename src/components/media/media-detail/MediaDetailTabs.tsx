import type { Tags } from 'exifreader';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { MediaItem } from '@/types/db-types';
import ExifDataDisplay from '../exif-data-display';
import { MediaDetailInfo } from './MediaDetailInfo';

type MediaDetailTabsProps = {
  item: MediaItem;
  category: string | null;
  exifData: Tags | null;
  isImageFile: boolean;
};

export function MediaDetailTabs({
  item,
  category,
  exifData,
  isImageFile,
}: MediaDetailTabsProps) {
  return (
    <Card className="flex-shrink-0 max-h-[40%] overflow-hidden border-t rounded-none">
      <CardContent className="p-4 h-full overflow-y-auto">
        <Tabs defaultValue="info">
          <TabsList className="mb-4">
            <TabsTrigger value="info">Info</TabsTrigger>
            {isImageFile && exifData && (
              <TabsTrigger value="exif">EXIF Data</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="info">
            <MediaDetailInfo item={item} category={category} />
          </TabsContent>

          {isImageFile && exifData && (
            <TabsContent value="exif">
              <ExifDataDisplay exifData={exifData} />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
