import { format } from 'date-fns';
import { formatBytes } from '@/lib/utils';
import type { MediaItem } from '@/types/db-types';

type MediaDetailInfoProps = {
  item: MediaItem;
  category: string | null;
};

export function MediaDetailInfo({ item, category }: MediaDetailInfoProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">{item.file_name}</h3>
        <p className="text-sm text-muted-foreground">{item.folder_path}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Size</p>
          <p>{formatBytes(item.size_bytes || 0)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Type</p>
          <p className="uppercase">{category}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Created</p>
          <p>
            {item.created_date
              ? format(new Date(item.created_date), 'MMM d, yyyy h:mm a')
              : 'Unknown'}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Modified</p>
          <p>
            {item.modified_date
              ? format(new Date(item.modified_date), 'MMM d, yyyy h:mm a')
              : 'Unknown'}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Media Date</p>
          <p>
            {item.media_date
              ? format(new Date(item.media_date), 'MMM d, yyyy h:mm a')
              : 'Unknown'}
          </p>
        </div>
      </div>
    </div>
  );
}
