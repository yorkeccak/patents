'use client';

import React, { memo, useEffect, useState } from 'react';
import { X, ExternalLink, Building2, Calendar, Scale, FileText, Users, TrendingUp, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Streamdown } from 'streamdown';
import { getPatentDisplay, getKindCodeExplanation, type PatentFigure } from '@/lib/patent-utils';
import { PatentFigures } from '@/components/patent-figures';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PatentDetailsPanelProps {
  patent: {
    id: string;
    title: string;
    url?: string;
    content: string;
    publication_date?: string;
    // New fields from patentSearch with caching
    abstract?: string;
    patentNumber?: string;
    patentIndex?: number;
    assignees?: string[];
    filingDate?: string;
    publicationDate?: string;
    claimsCount?: number;
    fullContentCached?: boolean;
    figures?: PatentFigure[];
    metadata?: {
      patent_number?: string;
      application_number?: string;
      filing_date?: string;
      date_published?: string;
      priority_date?: string;
      parties_assignees_name?: string;
      number_of_claims?: string | number;
      ipcr_section?: string;
      ipcr_class?: string;
      ipcr_subclass?: string;
      ipc?: string[];
      cpc?: string[];
      total_citations?: number;
      patent_citations?: number;
      country?: string;
      kind_code?: string;
      designated_states?: string[] | string;
      language?: string;
      figures?: PatentFigure[];
      examiners?: string;
      bibliographic_data?: any;
    };
    relevance_score?: number;
  };
  onClose: () => void;
  /** Used to lazily fetch figure image URLs from the cache (kept out of the model's context). */
  sessionId?: string;
}

export const PatentDetailsPanel = memo(function PatentDetailsPanel({ patent, onClose, sessionId }: PatentDetailsPanelProps) {
  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Jurisdiction-aware identity (office, ST.16 triplet, kind-code-driven status).
  const display = getPatentDisplay(patent.metadata, patent.content);

  // Figures are fetched on demand (signed URLs are not carried in the tool
  // result that the model ingests). Fall back to any figures passed directly.
  const [fetchedFigures, setFetchedFigures] = useState<PatentFigure[]>([]);
  const figures = fetchedFigures.length
    ? fetchedFigures
    : (patent.figures || patent.metadata?.figures || []);

  useEffect(() => {
    if (patent.figures?.length || patent.metadata?.figures?.length) return;
    if (!sessionId || patent.patentIndex === undefined) return;
    let cancelled = false;
    fetch(`/api/patents/figures?sessionId=${encodeURIComponent(sessionId)}&index=${patent.patentIndex}`)
      .then((r) => (r.ok ? r.json() : { figures: [] }))
      .then((d) => { if (!cancelled && Array.isArray(d.figures)) setFetchedFigures(d.figures); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [sessionId, patent.patentIndex, patent.figures, patent.metadata?.figures]);

  const getIPCClass = () => {
    const { ipcr_section, ipcr_class, ipcr_subclass } = patent.metadata || {};
    if (ipcr_section && ipcr_class && ipcr_subclass) {
      return `${ipcr_section}${ipcr_class}${ipcr_subclass}`;
    }
    return null;
  };

  const designatedStates = Array.isArray(patent.metadata?.designated_states)
    ? patent.metadata?.designated_states.join(', ')
    : patent.metadata?.designated_states;

  const extractAbstract = () => {
    // If we have the abstract field directly (from patentSearch), use it
    if (patent.abstract) {
      return patent.abstract;
    }

    // Otherwise extract from content (old behavior)
    const content = patent.content || '';
    const abstractMatch = content.match(/##\s*Abstract\s*\n\n([\s\S]*?)(?=\n##|\n\n##|$)/);
    if (abstractMatch && abstractMatch[1]) {
      return abstractMatch[1].trim();
    }
    return content.substring(0, 500).trim();
  };

  // Detect if we have full content or just abstract
  const hasFullContent = patent.content && patent.content.length > 1000 &&
                         (patent.content.includes('## Description') ||
                          patent.content.includes('## Claims') ||
                          patent.content.includes('DESCRIPTION') ||
                          patent.content.includes('CLAIMS'));

  const ipcClass = getIPCClass();

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <img
                src={display.office.logo}
                alt={display.office.label}
                title={display.office.name}
                className="w-5 h-5 object-contain"
              />
              <code className="text-sm font-bold text-foreground font-mono">
                {display.formatted || patent.id}
              </code>
              {(() => {
                const explanation = getKindCodeExplanation(display.country, display.kindCode);
                const badge = (
                  <Badge
                    variant={display.status === 'granted' ? 'default' : 'secondary'}
                    className="text-[10px] px-2 py-0 bg-primary/10 text-primary border-primary/30 cursor-help"
                  >
                    {display.statusLabel}
                  </Badge>
                );
                return explanation ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>{badge}</TooltipTrigger>
                      <TooltipContent className="max-w-[260px] text-xs">
                        <span className="font-mono font-semibold">{display.kindCode}</span> — {explanation}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : badge;
              })()}
            </div>
            <h2 className="text-base font-semibold text-foreground leading-snug">
              {patent.title}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 flex-shrink-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {patent.url && (
            <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
              <a href={patent.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3 mr-1" />
                View on {display.office.label}
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="p-4 space-y-4">
          {/* Key Information Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Assignees - support both new format (array) and old format (string) */}
            {(patent.assignees?.length || patent.metadata?.parties_assignees_name) && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Building2 className="w-3 h-3 text-muted-foreground" />
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Assignee
                  </div>
                </div>
                <div className="text-sm text-foreground">
                  {patent.assignees?.length ? patent.assignees.join(', ') : patent.metadata?.parties_assignees_name}
                </div>
              </div>
            )}

            {/* Filing Date - support both new and old format */}
            {(patent.filingDate || patent.metadata?.filing_date) && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Filing Date
                  </div>
                </div>
                <div className="text-sm text-foreground">
                  {formatDate(patent.filingDate || patent.metadata?.filing_date)}
                </div>
              </div>
            )}

            {/* Publication Date - support both new and old format */}
            {(patent.publicationDate || patent.metadata?.date_published) && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Published
                  </div>
                </div>
                <div className="text-sm text-foreground">
                  {formatDate(patent.publicationDate || patent.metadata?.date_published)}
                </div>
              </div>
            )}

            {patent.metadata?.application_number && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <FileText className="w-3 h-3 text-muted-foreground" />
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Application #
                  </div>
                </div>
                <div className="text-sm font-mono text-foreground">
                  {patent.metadata.application_number}
                </div>
              </div>
            )}

            {/* Claims Count - support both new and old format */}
            {(patent.claimsCount || patent.metadata?.number_of_claims) && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Scale className="w-3 h-3 text-muted-foreground" />
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Claims
                  </div>
                </div>
                <div className="text-sm text-foreground">
                  {patent.claimsCount || patent.metadata?.number_of_claims}
                </div>
              </div>
            )}

            {patent.metadata?.priority_date && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Priority
                  </div>
                </div>
                <div className="text-sm text-foreground">
                  {formatDate(patent.metadata.priority_date)}
                </div>
              </div>
            )}

            {(patent.metadata?.cpc?.length || patent.metadata?.ipc?.length || ipcClass) && (
              <div className="col-span-2">
                <div className="flex items-center gap-1 mb-1">
                  <FileText className="w-3 h-3 text-muted-foreground" />
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Classification
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {patent.metadata?.cpc?.slice(0, 6).map((c) => (
                    <Badge key={`cpc-${c}`} variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                      CPC {c}
                    </Badge>
                  ))}
                  {patent.metadata?.ipc?.slice(0, 6).map((c) => (
                    <Badge key={`ipc-${c}`} variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                      IPC {c}
                    </Badge>
                  ))}
                  {!patent.metadata?.cpc?.length && !patent.metadata?.ipc?.length && ipcClass && (
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                      IPC {ipcClass}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {designatedStates && (
              <div className="col-span-2">
                <div className="flex items-center gap-1 mb-1">
                  <Globe className="w-3 h-3 text-muted-foreground" />
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Designated States
                  </div>
                </div>
                <div className="text-sm text-foreground break-words">
                  {designatedStates}
                </div>
              </div>
            )}

            {patent.metadata?.examiners && (
              <div className="col-span-2">
                <div className="flex items-center gap-1 mb-1">
                  <Users className="w-3 h-3 text-muted-foreground" />
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Examiner
                  </div>
                </div>
                <div className="text-sm text-foreground">
                  {patent.metadata.examiners}
                </div>
              </div>
            )}
          </div>

          {/* Citations */}
          {(patent.metadata?.total_citations !== undefined || patent.metadata?.patent_citations !== undefined) && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <TrendingUp className="w-3 h-3 text-muted-foreground" />
                  <div className="text-xs font-semibold text-foreground">
                    Citations
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {patent.metadata?.total_citations !== undefined && (
                    <div className="bg-muted rounded p-2">
                      <div className="text-[10px] text-muted-foreground mb-0.5">Total</div>
                      <div className="text-lg font-bold text-foreground">
                        {patent.metadata.total_citations}
                      </div>
                    </div>
                  )}
                  {patent.metadata?.patent_citations !== undefined && (
                    <div className="bg-muted rounded p-2">
                      <div className="text-[10px] text-muted-foreground mb-0.5">Patents</div>
                      <div className="text-lg font-bold text-foreground">
                        {patent.metadata.patent_citations}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Figures / Drawings */}
          {figures.length > 0 && (
            <>
              <Separator />
              <PatentFigures figures={figures} />
            </>
          )}

          {/* Abstract */}
          <Separator />
          <div>
            <div className="text-xs font-semibold text-foreground mb-2">
              Abstract
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {extractAbstract()}
            </p>
          </div>

          {/* Full Content - Only show if we have full patent details */}
          {hasFullContent ? (
            <>
              <Separator />
              <div>
                <div className="text-xs font-semibold text-foreground mb-2">
                  Full Document
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground">
                  <Streamdown className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    {patent.content}
                  </Streamdown>
                </div>
              </div>
            </>
          ) : (
            <>
              <Separator />
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <div className="text-xs font-semibold text-foreground mb-2">
                  Full Patent Details
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  This view shows the abstract and key metadata only. To access the complete patent details including full claims, detailed description, and citations, use the <code className="bg-primary/10 text-primary px-1 py-0.5 rounded text-[10px]">readFullPatent</code> tool.
                </p>
                {patent.patentIndex !== undefined && (
                  <div className="bg-background/50 rounded p-2 border border-border">
                    <p className="text-[10px] text-muted-foreground font-mono">
                      readFullPatent({'{'}patentIndex: {patent.patentIndex}{'}'})
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
