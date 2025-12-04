'use client';

import React, { useState, useEffect, memo } from 'react';
import { Streamdown } from 'streamdown';
import { csvToMarkdownTable, formatCsvForMarkdown, CSVData } from '@/lib/csv-utils';

// Cache for CSV data to prevent re-fetching during streaming
const csvDataCache = new Map<string, CSVData>();

// CSV Renderer Component - fetches and displays CSV as markdown table
const CsvRendererComponent = ({ csvId, alt }: { csvId: string; alt?: string }) => {
  const [csvData, setCsvData] = useState<CSVData | null>(() => csvDataCache.get(csvId) || null);
  const [loading, setLoading] = useState(!csvDataCache.has(csvId));
  const [error, setError] = useState(false);

  useEffect(() => {
    // If already cached, don't fetch again
    if (csvDataCache.has(csvId)) {
      return;
    }

    let cancelled = false;

    const fetchCsv = async () => {
      try {
        const response = await fetch(`/api/csvs/${csvId}`);
        if (cancelled) return;

        if (!response.ok) {
          setError(true);
          setLoading(false);
          return;
        }

        const data = await response.json();
        if (cancelled) return;

        const csvDataObj = {
          title: data.title,
          description: data.description,
          headers: data.headers,
          rows: data.rows,
        };

        // Cache the result
        csvDataCache.set(csvId, csvDataObj);
        setCsvData(csvDataObj);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      }
    };

    fetchCsv();

    return () => {
      cancelled = true;
    };
  }, [csvId]);

  if (loading) {
    return (
      <div className="my-4 border border-border rounded-lg p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <div className="mt-2 text-sm text-muted-foreground">Loading table...</div>
      </div>
    );
  }

  if (error || !csvData) {
    return (
      <div className="my-4 border border-destructive/30 rounded-lg p-4 text-center">
        <div className="text-sm text-destructive">Failed to load table</div>
      </div>
    );
  }

  // Validate that rows is an array
  if (!Array.isArray(csvData.rows)) {
    return (
      <div className="my-4 border border-destructive/30 rounded-lg p-4 text-center">
        <div className="text-sm text-destructive">Invalid table data format</div>
      </div>
    );
  }

  // Format and convert to markdown table
  const formattedCsvData = formatCsvForMarkdown(csvData);
  const markdownTable = csvToMarkdownTable(formattedCsvData);

  return (
    <div className="my-4 w-full overflow-x-auto scrollbar-hide">
      <Streamdown className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {markdownTable}
      </Streamdown>
    </div>
  );
};

export const CsvRenderer = memo(CsvRendererComponent, (prevProps, nextProps) => {
  return prevProps.csvId === nextProps.csvId && prevProps.alt === nextProps.alt;
});

CsvRenderer.displayName = 'CsvRenderer';
