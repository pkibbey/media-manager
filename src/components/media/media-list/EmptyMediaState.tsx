import { MixerHorizontalIcon } from '@radix-ui/react-icons';

export function EmptyMediaState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <MixerHorizontalIcon className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium">No media found</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Try adjusting your filters or browsing another folder.
      </p>
    </div>
  );
}
