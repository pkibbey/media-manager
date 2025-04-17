import { getPerformanceMetrics } from '@/app/api/actions/performance-metrics';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const metrics = await getPerformanceMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from('performance_metrics')
      .delete()
      .filter('id', 'not.is', null); // Select all non-null IDs (all rows)

    if (error) {
      console.error('Error deleting performance metrics:', error);
      return NextResponse.json(
        { error: 'Failed to delete performance metrics' },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting performance metrics:', error);
    return NextResponse.json(
      { error: 'Failed to delete performance metrics' },
      { status: 500 },
    );
  }
}
import { createServerSupabaseClient } from '@/lib/supabase';
