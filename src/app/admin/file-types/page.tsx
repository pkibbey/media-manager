import { Suspense } from 'react';
import { getAllFileTypes } from '@/actions/file-types/get-all-file-types';
import FileTypeManager from '@/components/admin/file-type-manager';

export default async function FileTypesPage() {
  const { data: fileTypes, error: fileTypesError } = await getAllFileTypes();

  return (
    <div className="items-start">
      <Suspense fallback={<div>Loading file types...</div>}>
        {!fileTypesError ? (
          <FileTypeManager fileTypes={fileTypes || []} />
        ) : (
          <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
            Error loading file types: {fileTypesError.message}
          </div>
        )}
      </Suspense>
    </div>
  );
}
