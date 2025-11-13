import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredPatents } from '@/lib/db';

/**
 * Vercel Cron job to cleanup expired patent cache entries
 * Runs every hour to remove patents that have exceeded their 1-hour TTL
 *
 * This endpoint is called by Vercel Cron (configured in vercel.json)
 * and requires CRON_SECRET authentication to prevent unauthorized access
 */
export async function GET(request: NextRequest) {
  // Verify Vercel Cron secret for security
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    console.error('[Cron] CRON_SECRET not configured');
    return NextResponse.json(
      { error: 'Cron secret not configured' },
      { status: 500 }
    );
  }

  if (authHeader !== expectedAuth) {
    console.warn('[Cron] Unauthorized cleanup attempt');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    console.log('[Cron] Starting patent cache cleanup...');
    const startTime = Date.now();

    const { error, deletedCount } = await cleanupExpiredPatents();

    const duration = Date.now() - startTime;

    if (error) {
      console.error('[Cron] Cleanup failed:', error);
      return NextResponse.json(
        {
          success: false,
          error: error,
          timestamp: new Date().toISOString(),
          durationMs: duration
        },
        { status: 500 }
      );
    }

    console.log(`[Cron] Cleanup completed: ${deletedCount} patents deleted in ${duration}ms`);

    return NextResponse.json({
      success: true,
      deletedCount: deletedCount,
      timestamp: new Date().toISOString(),
      durationMs: duration
    });

  } catch (error) {
    console.error('[Cron] Unexpected error during cleanup:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
