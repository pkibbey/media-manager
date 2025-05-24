import { processContentWarnings } from '@/actions/analysis/process-content-warnings';

/**
 * API route to process content warnings (uses the server action)
 * Returns batch result as JSON
 */
export async function POST() {
  const batchSize = 10; // Default batch size for API route
  const result = await processContentWarnings(batchSize);
  return Response.json(result);
}
