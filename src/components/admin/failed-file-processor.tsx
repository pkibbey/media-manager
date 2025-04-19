import { revalidatePath } from 'next/cache';
import { Suspense } from 'react';
import { loadFailedFileData } from './failed-file-data-loader';
import FailedFileProcessorClient from './failed-file-processor-client';

export default async function FailedFileProcessor() {
  // Load the initial data on the server
  const initialData = await loadFailedFileData();

  // Function to refresh data (will be passed to client component)
  const handleRefresh = async () => {
    'use server';
    // Revalidate paths to refresh the server component
    revalidatePath('/admin');
  };

  return (
    <Suspense fallback={<div>Loading failed files...</div>}>
      <FailedFileProcessorClient
        initialData={initialData}
        onRefresh={handleRefresh}
      />
    </Suspense>
  );
}
