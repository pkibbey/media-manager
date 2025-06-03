'use server';

/**
 * Add advanced analysis items to queue via API endpoint
 * This returns immediately without blocking the UI
 */
export async function addAdvancedToQueueAsync(): Promise<boolean> {
  try {
    // Use dynamic import to get the base URL in server context
    const { headers } = await import('next/headers');
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    const response = await fetch(`${baseUrl}/api/admin/add-advanced-to-queue`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to start advanced queue operation:', error);
      return false;
    }

    const result = await response.json();
    console.log(result.message);
    return true;
  } catch (error) {
    console.error('Error starting advanced queue operation:', error);
    return false;
  }
}
