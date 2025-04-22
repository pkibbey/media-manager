import FileTypeManager from '@/components/admin/file-type-manager';
import { Suspense } from 'react';
import { getAllFileTypes } from '../../actions/file-types';

export default async function FileTypesPage() {
  const {
    success: fileTypesSuccess,
    data: fileTypes,
    error: fileTypesError,
  } = await getAllFileTypes();

  return (
    <div className="items-start">
      <Suspense fallback={<div>Loading file types...</div>}>
        {fileTypesSuccess ? (
          <FileTypeManager fileTypes={fileTypes || []} />
        ) : (
          <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
            Error loading file types: {fileTypesError}
          </div>
        )}
      </Suspense>
    </div>
  );
}
