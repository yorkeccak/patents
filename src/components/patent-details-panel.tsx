'use client';

import React, { memo } from 'react';
import { X, ExternalLink, Download, Share2, Building2, Calendar, Scale, FileText, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PatentDetailsPanelProps {
  patent: {
    id: string;
    title: string;
    url?: string;
    content: string;
    publication_date?: string;
    metadata?: {
      patent_number?: string;
      application_number?: string;
      filing_date?: string;
      date_published?: string;
      parties_assignees_name?: string;
      number_of_claims?: string;
      ipcr_section?: string;
      ipcr_class?: string;
      ipcr_subclass?: string;
      total_citations?: number;
      patent_citations?: number;
      country?: string;
      examiners?: string;
      bibliographic_data?: any;
    };
    relevance_score?: number;
  };
  onClose: () => void;
}

export const PatentDetailsPanel = memo(function PatentDetailsPanel({ patent, onClose }: PatentDetailsPanelProps) {
  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatus = () => {
    if (!patent.metadata?.date_published) return 'pending';
    return 'granted';
  };

  const getIPCClass = () => {
    const { ipcr_section, ipcr_class, ipcr_subclass } = patent.metadata || {};
    if (ipcr_section && ipcr_class && ipcr_subclass) {
      return `${ipcr_section}${ipcr_class}${ipcr_subclass}`;
    }
    return null;
  };

  const extractAbstract = () => {
    const content = patent.content || '';
    const abstractMatch = content.match(/##\s*Abstract\s*\n\n([\s\S]*?)(?=\n##|\n\n##|$)/);
    if (abstractMatch && abstractMatch[1]) {
      return abstractMatch[1].trim();
    }
    return content.substring(0, 500).trim();
  };

  const status = getStatus();
  const ipcClass = getIPCClass();

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <img
                src="/assets/banner/uspto.png"
                alt="USPTO"
                className="w-5 h-5 object-contain"
              />
              <code className="text-sm font-bold text-foreground font-mono">
                US {patent.metadata?.patent_number || patent.id}
              </code>
              <Badge
                variant={status === 'granted' ? 'default' : 'secondary'}
                className={`text-[10px] px-2 py-0 ${
                  status === 'granted'
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-primary/10 text-primary border-primary/30'
                }`}
              >
                {status === 'granted' ? 'Granted' : 'Pending'}
              </Badge>
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
                View USPTO
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <Download className="w-3 h-3 mr-1" />
            Export
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <Share2 className="w-3 h-3 mr-1" />
            Share
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="p-4 space-y-4">
          {/* Key Information Grid */}
          <div className="grid grid-cols-2 gap-3">
            {patent.metadata?.parties_assignees_name && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Building2 className="w-3 h-3 text-muted-foreground" />
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Assignee
                  </div>
                </div>
                <div className="text-sm text-foreground">
                  {patent.metadata.parties_assignees_name}
                </div>
              </div>
            )}

            {patent.metadata?.filing_date && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Filing Date
                  </div>
                </div>
                <div className="text-sm text-foreground">
                  {formatDate(patent.metadata.filing_date)}
                </div>
              </div>
            )}

            {patent.metadata?.date_published && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Published
                  </div>
                </div>
                <div className="text-sm text-foreground">
                  {formatDate(patent.metadata.date_published)}
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

            {patent.metadata?.number_of_claims && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Scale className="w-3 h-3 text-muted-foreground" />
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Claims
                  </div>
                </div>
                <div className="text-sm text-foreground">
                  {patent.metadata.number_of_claims}
                </div>
              </div>
            )}

            {ipcClass && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <FileText className="w-3 h-3 text-muted-foreground" />
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    IPC Class
                  </div>
                </div>
                <div className="text-sm font-mono text-foreground">
                  {ipcClass}
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

          {/* Full Content */}
          <Separator />
          <div>
            <div className="text-xs font-semibold text-foreground mb-2">
              Full Document
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {patent.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
