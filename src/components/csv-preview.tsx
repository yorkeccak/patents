'use client';

import React, { useState } from 'react';
import { Download, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface CSVPreviewProps {
  title: string;
  description?: string;
  headers: string[];
  rows: string[][];
  csvContent: string;
  rowCount: number;
  columnCount: number;
}

function CSVPreviewComponent({
  title,
  description,
  headers,
  rows,
  csvContent,
  rowCount,
  columnCount,
}: CSVPreviewProps) {
  const [copied, setCopied] = useState(false);

  // Download CSV file
  const handleDownload = () => {
    try {
      // Create blob with proper CSV MIME type
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

      // Sanitize filename
      const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;

      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
    }
  };

  // Copy CSV to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(csvContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
    }
  };

  return (
    <div className="w-full bg-gradient-to-br from-background to-background rounded-xl border border-border overflow-hidden shadow-sm">
      {/* Header - elegant and clean */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground mb-1.5">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}

            {/* Metadata Badges - minimal and refined */}
            <div className="flex gap-2 mt-2.5">
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-md bg-muted text-foreground">
                {rowCount} Row{rowCount !== 1 ? 's' : ''}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-md bg-muted text-foreground">
                {columnCount} Column{columnCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Action Buttons - refined styling */}
          <div className="flex gap-1.5 flex-shrink-0">
            <Button
              onClick={handleCopy}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-muted"
              title="Copy CSV to clipboard"
            >
              {copied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </Button>
            <Button
              onClick={handleDownload}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-muted"
              title="Download CSV file"
            >
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>

      {/* Table Container - elegant typography */}
      <div className="overflow-hidden">
        <div className="max-h-[500px] overflow-x-auto overflow-y-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <table className="w-full border-collapse text-xs min-w-max">
            {/* Header - refined styling */}
            <thead className="sticky top-0 z-10 bg-gradient-to-b from-muted to-muted backdrop-blur-sm">
              <tr className="border-b-2 border-border">
                {headers.map((header, index) => (
                  <th
                    key={index}
                    className="px-4 py-2.5 text-left font-semibold text-foreground whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body - clean rows with subtle hover */}
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-border/50 hover:bg-muted transition-colors"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-4 py-2 text-foreground whitespace-nowrap"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const CSVPreview = React.memo(CSVPreviewComponent, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.description === nextProps.description &&
    prevProps.csvContent === nextProps.csvContent &&
    prevProps.rowCount === nextProps.rowCount &&
    prevProps.columnCount === nextProps.columnCount
  );
});

CSVPreview.displayName = 'CSVPreview';
