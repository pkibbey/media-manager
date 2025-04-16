'use client';

import { generateMissingThumbnails } from '@/app/api/actions/thumbnails';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ThumbnailGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [processed, setProcessed] = useState(0);

  const handleGenerateThumbnails = async () => {
    try {
      setIsGenerating(true);
      setProgress(0);
      setProcessed(0);

      // Get a count of items that need thumbnails
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const countResponse = await fetch(
        `${supabaseUrl}/rest/v1/media_items?thumbnail_path=is.null&select=count`,
        {
          method: 'GET',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const countData = await countResponse.json();
      const totalToProcess = countData[0]?.count || 0;
      setTotal(totalToProcess);

      if (totalToProcess === 0) {
        toast.success('No thumbnails to generate');
        setIsGenerating(false);
        return;
      }

      // Process in batches of 20
      const batchSize = 20;
      let currentProcessed = 0;

      toast.success(`Generating thumbnails for ${totalToProcess} media items.`);

      while (currentProcessed < totalToProcess) {
        const result = await generateMissingThumbnails(batchSize);

        if (!result.success) {
          toast.error(`Error generating thumbnails: ${result.message}`);
          break;
        }

        currentProcessed += result.processed;
        setProcessed(currentProcessed);
        setProgress(Math.round((currentProcessed / totalToProcess) * 100));

        if (result.processed === 0) {
          // No more items to process
          break;
        }
      }

      toast.success(
        `Generated thumbnails for ${currentProcessed} media items.`,
      );
    } catch (error: any) {
      toast.error(
        `Error generating thumbnails: ${error.message || 'An unknown error occurred'}`,
      );
      console.error('Error generating thumbnails:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Thumbnail Generator</h3>
      <div className="text-sm text-muted-foreground">
        Generate thumbnails for media items and store them in Supabase Storage.
        This helps improve performance by pre-generating thumbnails instead of
        creating them on-demand.
      </div>
      <div className="flex flex-col justify-between items-start gap-4">
        <Button onClick={handleGenerateThumbnails} disabled={isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate Thumbnails'}
        </Button>
      </div>

      {isGenerating && (
        <div className="space-y-2">
          <Progress value={progress} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              Progress: {processed} / {total} items
            </span>
            <span>{progress}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
