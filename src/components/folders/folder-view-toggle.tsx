'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CubeIcon, StackIcon } from '@radix-ui/react-icons';
import { useRouter } from 'next/navigation';

interface FolderViewToggleProps {
  includeSubfolders: boolean;
  baseUrl: string;
}

export default function FolderViewToggle({
  includeSubfolders,
  baseUrl,
}: FolderViewToggleProps) {
  const router = useRouter();

  const handleToggleChange = (value: string) => {
    if (value === 'includeSubfolders' || value === 'currentFolderOnly') {
      const shouldIncludeSubfolders = value === 'includeSubfolders';

      // Only navigate if the value has changed
      if (shouldIncludeSubfolders !== includeSubfolders) {
        router.push(`${baseUrl}&includeSubfolders=${shouldIncludeSubfolders}`);
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground mr-1">Show:</span>
      <ToggleGroup
        type="single"
        defaultValue={
          includeSubfolders ? 'includeSubfolders' : 'currentFolderOnly'
        }
        onValueChange={handleToggleChange}
        aria-label="Folder view options"
      >
        <ToggleGroupItem
          value="currentFolderOnly"
          aria-label="Current folder only"
          className="flex items-center gap-1 px-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          title="Show items in current folder only"
        >
          <CubeIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Current folder only</span>
        </ToggleGroupItem>
        <ToggleGroupItem
          value="includeSubfolders"
          aria-label="Include subfolders"
          className="flex items-center gap-1 px-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          title="Include items from all subfolders"
        >
          <StackIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Include subfolders</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
