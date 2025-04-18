import { createServerSupabaseClient } from '../src/lib/supabase';

/**
 * Enhanced fixThumbnailPaths function that works in batches
 */
async function batchFixThumbnailPaths(
  batchSize = 1000,
): Promise<{ fixed: number; total: number }> {
  const supabase = createServerSupabaseClient();

  let totalFixed = 0;
  let lastProcessedId: string | null = null;
  let hasMoreRecords = true;
  let batchNumber = 1;

  console.log(`Starting to fix thumbnail paths in batches of ${batchSize}...`);

  while (hasMoreRecords) {
    console.log(`\nProcessing batch #${batchNumber}...`);

    // Build query for the current batch
    let query = supabase
      .from('media_items')
      .select('id, thumbnail_path')
      .like('thumbnail_path', '%/thumbnails/thumbnails/%')
      .order('id', { ascending: true })
      .limit(batchSize);

    // If we have a last processed ID, start after it
    if (lastProcessedId) {
      query = query.gt('id', lastProcessedId);
    }

    // Execute query
    const { data, error } = await query;

    if (error) {
      console.error('Error finding records with duplicate paths:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      hasMoreRecords = false;
      console.log('No more records to process.');
      break;
    }

    // Update last processed ID
    lastProcessedId = data[data.length - 1].id;

    // Process this batch
    console.log(`Found ${data.length} items to fix in batch #${batchNumber}`);

    let batchFixed = 0;
    const progressStep = Math.max(1, Math.floor(data.length / 20)); // Update progress ~20 times per batch

    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      // Show progress periodically
      if (i % progressStep === 0 || i === data.length - 1) {
        const percentComplete = Math.round((i / data.length) * 100);
        process.stdout.write(
          `\rProgress: ${i}/${data.length} (${percentComplete}%)`,
        );
      }

      const fixedPath = item.thumbnail_path?.replace(
        '/thumbnails/thumbnails/',
        '/thumbnails/',
      );

      const { error: updateError } = await supabase
        .from('media_items')
        .update({ thumbnail_path: fixedPath })
        .eq('id', item.id);

      if (!updateError) {
        batchFixed++;
      }
    }

    console.log(`\nFixed ${batchFixed} paths in batch #${batchNumber}`);
    totalFixed += batchFixed;
    batchNumber++;

    // If we got fewer records than the batch size, we're done
    if (data.length < batchSize) {
      hasMoreRecords = false;
    }
  }

  return { fixed: totalFixed, total: batchNumber - 1 };
}

async function run() {
  console.log('Starting thumbnail path fix process...');
  console.log('This will correct paths with duplicate "thumbnails/" prefixes.');

  try {
    const startTime = Date.now();
    const result = await batchFixThumbnailPaths(1000); // Process 1000 at a time
    const elapsedTime = (Date.now() - startTime) / 1000;

    console.log(
      `\n✅ Successfully fixed ${result.fixed} thumbnail paths across ${result.total} batches`,
    );
    console.log(`Process completed in ${elapsedTime.toFixed(2)} seconds`);

    if (result.fixed === 0) {
      console.log('No paths needed fixing or no matching records were found.');
    }
  } catch (error) {
    console.error('\n❌ Error fixing thumbnail paths:', error);
    process.exit(1);
  }
}

run();
