'use client';

import React, { useState, memo } from 'react';
import { Calendar, Building2, FileText, Scale, ExternalLink, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PatentCardProps {
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
  onClick?: () => void;
  onCompare?: () => void;
  onSave?: () => void;
  selected?: boolean;
}

export const PatentCard = memo(function PatentCard({ patent, onClick, onCompare, onSave, selected }: PatentCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(patent.metadata?.patent_number || patent.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format date to readable format
  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status based on publication date
  const getStatus = () => {
    if (!patent.metadata?.date_published) return 'pending';
    return 'granted';
  };

  const status = getStatus();

  // Extract abstract from content (first 200 chars)
  const getAbstract = () => {
    const content = patent.content || '';
    const abstractMatch = content.match(/##\s*Abstract\s*\n\n([\s\S]*?)(?=\n##|\n\n##|$)/);
    if (abstractMatch && abstractMatch[1]) {
      return abstractMatch[1].trim().substring(0, 250) + '...';
    }
    // Fallback: just get first 200 chars
    return content.substring(0, 200).trim() + '...';
  };

  // Build IPC classification string
  const getIPCClass = () => {
    const { ipcr_section, ipcr_class, ipcr_subclass } = patent.metadata || {};
    if (ipcr_section && ipcr_class && ipcr_subclass) {
      return `${ipcr_section}${ipcr_class}${ipcr_subclass}`;
    }
    return null;
  };

  const ipcClass = getIPCClass();

  return (
    <div
      onClick={onClick}
      className={`
        group relative bg-card border rounded-lg p-4 cursor-pointer
        transition-all duration-200 hover:shadow-md
        ${selected
          ? 'border-primary shadow-md'
          : 'border-border hover:border-border'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          {/* Patent Number & Status */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-2">
              <img
                src="/assets/banner/uspto.png"
                alt="USPTO"
                className="w-4 h-4 object-contain"
              />
              <code className="text-sm font-semibold text-foreground font-mono">
                US {patent.metadata?.patent_number || patent.id}
              </code>
            </div>
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
            {patent.relevance_score && patent.relevance_score > 0.7 && (
              <Badge variant="secondary" className="text-[10px] px-2 py-0 bg-primary/10 text-primary border-primary/30">
                {Math.round(patent.relevance_score * 100)}% match
              </Badge>
            )}
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold text-foreground line-clamp-2 mb-2 leading-snug">
            {patent.title}
          </h3>

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {patent.metadata?.parties_assignees_name && (
              <div className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                <span className="line-clamp-1">{patent.metadata.parties_assignees_name.split(',')[0]}</span>
              </div>
            )}
            {patent.metadata?.filing_date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Filed {formatDate(patent.metadata.filing_date)}</span>
              </div>
            )}
            {patent.metadata?.number_of_claims && (
              <div className="flex items-center gap-1">
                <Scale className="w-3 h-3" />
                <span>{patent.metadata.number_of_claims} claims</span>
              </div>
            )}
            {ipcClass && (
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span className="font-mono">{ipcClass}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Abstract */}
      {!expanded && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {getAbstract()}
        </p>
      )}

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          <div>
            <div className="text-xs font-semibold text-foreground mb-1">Abstract</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {getAbstract()}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground mb-1">Application #</div>
              <div className="text-xs font-mono text-foreground">{patent.metadata?.application_number || 'N/A'}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground mb-1">Publication Date</div>
              <div className="text-xs text-foreground">{formatDate(patent.metadata?.date_published)}</div>
            </div>
            {patent.metadata?.total_citations !== undefined && (
              <>
                <div>
                  <div className="text-[10px] font-semibold text-muted-foreground mb-1">Total Citations</div>
                  <div className="text-xs text-foreground">{patent.metadata.total_citations}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-muted-foreground mb-1">Patent Citations</div>
                  <div className="text-xs text-foreground">{patent.metadata.patent_citations || 0}</div>
                </div>
              </>
            )}
            {patent.metadata?.examiners && (
              <div className="col-span-2">
                <div className="text-[10px] font-semibold text-muted-foreground mb-1">Examiner</div>
                <div className="text-xs text-foreground">{patent.metadata.examiners}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expand/Collapse Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? (
          <>
            <ChevronUp className="w-3 h-3" />
            <span>Show less</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3" />
            <span>Show more</span>
          </>
        )}
      </button>
    </div>
  );
});
