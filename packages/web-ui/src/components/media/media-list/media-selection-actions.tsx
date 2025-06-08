'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Trash2, X } from 'lucide-react';
import { useMediaSelection } from './media-selection-context';

export function MediaSelectionActions() {
  const {
    selection,
    selectedMedia,
    clearSelection,
    toggleHideSelected,
    toggleDeleteSelected,
  } = useMediaSelection();

  if (selection.selectedIds.size === 0) {
    return null;
  }

  const selectedCount = selection.selectedIds.size;
  const hasVisibleItems = selectedMedia.some((item) => !item.is_hidden);
  const hasUndeleted = selectedMedia.some((item) => !item.is_deleted);

  return (
    <Card className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 shadow-lg">
      <div className="flex items-center gap-2 p-3">
        <span className="text-sm font-medium text-muted-foreground">
          {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
        </span>

        <div className="flex items-center gap-1 ml-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleHideSelected}
            className="h-8"
          >
            {hasVisibleItems ? (
              <>
                <EyeOff className="h-4 w-4 mr-1" />
                Hide
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-1" />
                Show
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleDeleteSelected}
            className={cn(
              'h-8',
              hasUndeleted ? 'text-destructive hover:text-destructive' : '',
            )}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {hasUndeleted ? 'Delete' : 'Restore'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="h-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
