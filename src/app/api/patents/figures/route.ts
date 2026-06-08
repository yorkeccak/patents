import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { extractPatentFigures } from '@/lib/patent-utils';

/**
 * Returns the cached figures (signed image URLs) for a single patent from the
 * user's most recent search. Figures are intentionally NOT included in the
 * patentSearch / readFullPatent tool results (they would bloat the model's
 * context with large signed URLs), so the UI fetches them here on demand.
 *
 * Access is scoped by session: the cache read goes through the same auth path
 * as the rest of the app (RLS in production), so a user can only read figures
 * for patents in their own sessions.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const indexParam = searchParams.get('index');

  if (!sessionId || indexParam === null) {
    return NextResponse.json({ error: 'Missing sessionId or index' }, { status: 400 });
  }

  const patentIndex = Number(indexParam);
  if (!Number.isInteger(patentIndex) || patentIndex < 0) {
    return NextResponse.json({ error: 'Invalid index' }, { status: 400 });
  }

  try {
    const { data, error } = await db.getFullPatent(sessionId, patentIndex);
    if (error || !data) {
      return NextResponse.json({ figures: [] });
    }

    let metadata: any = (data as any).metadata;
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch {
        metadata = {};
      }
    }

    const figures = Array.isArray(metadata?.figures) && metadata.figures.length
      ? metadata.figures
      : extractPatentFigures((data as any).fullContent || (data as any).full_content || '');

    return NextResponse.json({ figures });
  } catch (e) {
    console.error('[api/patents/figures] error:', e);
    return NextResponse.json({ figures: [] });
  }
}
