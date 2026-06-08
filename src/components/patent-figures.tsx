'use client';

import React, { memo, useCallback, useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Download, ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { PatentFigure } from '@/lib/patent-utils';

interface PatentFiguresProps {
  figures: PatentFigure[];
  /** Cap thumbnails shown in the grid (e.g. compact card view). */
  maxThumbnails?: number;
  /** Smaller tiles for the card surface. */
  compact?: boolean;
}

/**
 * Responsive patent-drawing gallery. Lazy-loaded thumbnails with reserved
 * aspect-ratio boxes (no layout shift in the streaming chat column) and an
 * accessible lightbox with zoom + keyboard navigation. Mirrors the
 * Espacenet "Mosaics" / Google Patents enlarge interaction patent searchers
 * already expect - they triage by scanning drawings before reading claims.
 */
export const PatentFigures = memo(function PatentFigures({
  figures,
  maxThumbnails,
  compact = false,
}: PatentFiguresProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  const shown = typeof maxThumbnails === 'number' ? figures.slice(0, maxThumbnails) : figures;
  const remaining = figures.length - shown.length;

  const go = useCallback(
    (delta: number) => {
      setOpenIndex((prev) => {
        if (prev === null) return prev;
        const next = (prev + delta + figures.length) % figures.length;
        return next;
      });
      setZoom(1);
    },
    [figures.length]
  );

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 0.25, 4));
      else if (e.key === '-') setZoom((z) => Math.max(z - 0.25, 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openIndex, go]);

  if (!figures.length) return null;

  const active = openIndex !== null ? figures[openIndex] : null;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <ImageIcon className="w-3 h-3 text-muted-foreground" />
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {figures.length} {figures.length === 1 ? 'Figure' : 'Figures'}
        </span>
      </div>

      <div
        className={`grid gap-2 ${
          compact ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'
        }`}
      >
        {shown.map((fig, i) => (
          <button
            key={fig.url}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenIndex(i);
              setZoom(1);
            }}
            className="group relative block w-full overflow-hidden rounded-md border border-border bg-white transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-sm hover:ring-1 hover:ring-primary/30"
            style={{ aspectRatio: '1 / 1' }}
            title={fig.label || 'Patent figure'}
          >
            {/* Plain img: signed URLs are short-lived and host-varied, so skip next/image optimization. */}
            <img
              src={fig.url}
              alt={fig.alt || fig.label || 'Patent drawing'}
              loading="lazy"
              className="h-full w-full object-contain p-1 mix-blend-multiply dark:mix-blend-normal dark:bg-white"
            />
            {fig.label && (
              <span className="absolute bottom-0 inset-x-0 bg-background/80 text-[9px] text-center text-muted-foreground py-0.5 truncate px-1">
                {fig.label}
              </span>
            )}
          </button>
        ))}
      </div>

      {remaining > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpenIndex(0);
            setZoom(1);
          }}
          className="mt-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          +{remaining} more {remaining === 1 ? 'figure' : 'figures'}
        </button>
      )}

      <Dialog open={openIndex !== null} onOpenChange={(o) => !o && setOpenIndex(null)}>
        <DialogContent className="max-w-4xl w-[92vw] p-0 overflow-hidden bg-card">
          <DialogTitle className="sr-only">
            {active?.label || 'Patent figure'}
          </DialogTitle>
          {active && (
            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border">
                <span className="text-sm font-medium text-foreground">
                  {active.label || `Figure ${(openIndex ?? 0) + 1}`}
                  <span className="text-muted-foreground font-normal ml-2">
                    {(openIndex ?? 0) + 1} / {figures.length}
                  </span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(z - 0.25, 1))}
                    className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted disabled:opacity-40"
                    disabled={zoom <= 1}
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-muted-foreground w-10 text-center tabular-nums">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(z + 0.25, 4))}
                    className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted disabled:opacity-40"
                    disabled={zoom >= 4}
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <a
                    href={active.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted"
                    aria-label="Open original"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="relative bg-white flex items-center justify-center overflow-auto" style={{ height: '70vh' }}>
                <img
                  src={active.url}
                  alt={active.alt || active.label || 'Patent drawing'}
                  className="max-h-full max-w-full object-contain transition-transform duration-150"
                  style={{ transform: `scale(${zoom})` }}
                />
                {figures.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => go(-1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 inline-flex items-center justify-center rounded-full bg-background/80 border border-border hover:bg-background"
                      aria-label="Previous figure"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => go(1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 inline-flex items-center justify-center rounded-full bg-background/80 border border-border hover:bg-background"
                      aria-label="Next figure"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
});
