import { FileIcon } from '@radix-ui/react-icons';

export function MediaDetailEmpty() {
  return (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <FileIcon className="h-10 w-10 mx-auto mb-2" />
        <p>Select a file to view details</p>
      </div>
    </div>
  );
}
