"use client";

import React, { useState, useEffect, useMemo, createContext, useContext, ReactNode } from "react";
import { Streamdown } from "streamdown";
import katex from "katex";
import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselItem,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationSource,
  InlineCitationQuote,
} from "@/components/ai/inline-citation";
import { CitationMap } from "@/lib/citation-utils";
import { PatentChart } from "@/components/financial-chart";
import { CsvRenderer } from "@/components/csv-renderer";

interface CitationTextRendererProps {
  text: string;
  citations: CitationMap;
  className?: string;
  isAnimating?: boolean;
}

// Context to pass citations down to custom components
const CitationsContext = createContext<CitationMap>({});

// Cache for chart data to prevent re-fetching during streaming
const chartDataCache = new Map<string, any>();

// Inline Chart Renderer for CitationTextRenderer
const InlineChartRenderer = React.memo(({ chartId, alt }: { chartId: string; alt?: string }) => {
  const [chartData, setChartData] = useState<any>(() => chartDataCache.get(chartId) || null);
  const [loading, setLoading] = useState(!chartDataCache.has(chartId));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (chartDataCache.has(chartId)) {
      return;
    }

    let cancelled = false;

    const fetchChart = async () => {
      try {
        const response = await fetch(`/api/charts/${chartId}`);
        if (cancelled) return;

        if (!response.ok) {
          setError(true);
          setLoading(false);
          return;
        }

        const data = await response.json();
        if (cancelled) return;

        chartDataCache.set(chartId, data);
        setChartData(data);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      }
    };

    fetchChart();

    return () => {
      cancelled = true;
    };
  }, [chartId]);

  if (loading) {
    return (
      <div className="my-4 border border-border rounded-lg p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <div className="mt-2 text-sm text-muted-foreground">Loading chart...</div>
      </div>
    );
  }

  if (error || !chartData) {
    return (
      <div className="my-4 border border-destructive/30 rounded-lg p-4 text-center">
        <div className="text-sm text-destructive">Failed to load chart</div>
      </div>
    );
  }

  return (
    <div className="my-4">
      <PatentChart {...chartData} />
    </div>
  );
}, (prevProps, nextProps) => prevProps.chartId === nextProps.chartId);

InlineChartRenderer.displayName = 'InlineChartRenderer';

// Component to render grouped citations with hover card
const GroupedCitationBadge = React.memo(({
  citationKeys,
  citations
}: {
  citationKeys: string[];
  citations: CitationMap;
}) => {
  const allCitations: any[] = [];
  const allSources: string[] = [];

  citationKeys.forEach(key => {
    const citationList = citations[key] || [];
    citationList.forEach(citation => {
      allCitations.push(citation);
      if (citation.url) {
        allSources.push(citation.url);
      }
    });
  });

  if (allCitations.length === 0) {
    return <span className="text-primary">{citationKeys.join('')}</span>;
  }

  return (
    <InlineCitation>
      <InlineCitationCard>
        <InlineCitationCardTrigger sources={allSources} />
        <InlineCitationCardBody>
          <InlineCitationCarousel>
            {allCitations.length > 1 && (
              <InlineCitationCarouselHeader>
                <InlineCitationCarouselIndex />
              </InlineCitationCarouselHeader>
            )}
            <InlineCitationCarouselContent>
              {allCitations.map((citation, idx) => (
                <InlineCitationCarouselItem key={idx}>
                  <InlineCitationSource
                    title={citation.title}
                    url={citation.url}
                    description={citation.description}
                    date={citation.date}
                    authors={citation.authors}
                    doi={citation.doi}
                    relevanceScore={citation.relevanceScore}
                  />
                  {citation.quote && (
                    <InlineCitationQuote>
                      {citation.quote}
                    </InlineCitationQuote>
                  )}
                </InlineCitationCarouselItem>
              ))}
            </InlineCitationCarouselContent>
          </InlineCitationCarousel>
        </InlineCitationCardBody>
      </InlineCitationCard>
    </InlineCitation>
  );
});

GroupedCitationBadge.displayName = "GroupedCitationBadge";

// Process text to find and render citations
function processTextWithCitations(text: string, citations: CitationMap): ReactNode[] {
  // Pattern to match grouped citations: [1][2][3] or [1,2,3] or [1, 2, 3]
  const groupedPattern = /((?:\[\d+\])+|\[\d+(?:\s*,\s*\d+)*\])/g;
  const parts = text.split(groupedPattern);

  return parts.map((part, index) => {
    // Check if this part matches a citation pattern
    if (groupedPattern.test(part)) {
      // Reset lastIndex after test
      groupedPattern.lastIndex = 0;

      const citationKeys: string[] = [];

      if (part.includes(',')) {
        // Handle [1,2,3] format
        const numbers = part.match(/\d+/g) || [];
        numbers.forEach(num => citationKeys.push(`[${num}]`));
      } else {
        // Handle [1][2][3] format
        const individualCitations = part.match(/\[\d+\]/g) || [];
        citationKeys.push(...individualCitations);
      }

      if (citationKeys.length > 0) {
        return <GroupedCitationBadge key={index} citationKeys={citationKeys} citations={citations} />;
      }
    }
    return part;
  });
}

// Wrapper components for Streamdown that handle citations
function ParagraphWithCitations({ children }: { children?: ReactNode }) {
  const citations = useContext(CitationsContext);

  const processChildren = (child: ReactNode): ReactNode => {
    if (typeof child === "string") {
      return processTextWithCitations(child, citations);
    }
    return child;
  };

  const processed = Array.isArray(children)
    ? children.map((child, i) => <span key={i}>{processChildren(child)}</span>)
    : processChildren(children);

  return <p>{processed}</p>;
}

function HeadingWithCitations({ level, children }: { level: 1 | 2 | 3 | 4 | 5 | 6; children?: ReactNode }) {
  const citations = useContext(CitationsContext);
  const Tag = `h${level}` as const;

  const processChildren = (child: ReactNode): ReactNode => {
    if (typeof child === "string") {
      return processTextWithCitations(child, citations);
    }
    return child;
  };

  const processed = Array.isArray(children)
    ? children.map((child, i) => <span key={i}>{processChildren(child)}</span>)
    : processChildren(children);

  return <Tag>{processed}</Tag>;
}

function ListItemWithCitations({ children }: { children?: ReactNode }) {
  const citations = useContext(CitationsContext);

  const processChildren = (child: ReactNode): ReactNode => {
    if (typeof child === "string") {
      return processTextWithCitations(child, citations);
    }
    return child;
  };

  const processed = Array.isArray(children)
    ? children.map((child, i) => <span key={i}>{processChildren(child)}</span>)
    : processChildren(children);

  return <li>{processed}</li>;
}

function StrongWithCitations({ children }: { children?: ReactNode }) {
  const citations = useContext(CitationsContext);

  const processChildren = (child: ReactNode): ReactNode => {
    if (typeof child === "string") {
      return processTextWithCitations(child, citations);
    }
    return child;
  };

  const processed = Array.isArray(children)
    ? children.map((child, i) => <span key={i}>{processChildren(child)}</span>)
    : processChildren(children);

  return <strong>{processed}</strong>;
}

// Custom code component for math rendering
function CodeWithMath({ children, className }: { children?: ReactNode; className?: string }) {
  const isInline = !className;
  const content = typeof children === "string" ? children : children?.toString() || "";

  // Check if this is a math block (language-math class)
  if (className === "language-math" || className === "math") {
    try {
      const html = katex.renderToString(content, {
        displayMode: true,
        throwOnError: false,
        strict: false,
      });
      return <div dangerouslySetInnerHTML={{ __html: html }} className="katex-display my-4" />;
    } catch (error) {
      return <code className="bg-muted px-1 rounded">{content}</code>;
    }
  }

  return <code className={className}>{children}</code>;
}

// Helper to parse and extract CSV/chart references from markdown
const parseSpecialReferences = (text: string): Array<{ type: 'text' | 'csv' | 'chart', content: string, id?: string }> => {
  const segments: Array<{ type: 'text' | 'csv' | 'chart', content: string, id?: string }> = [];

  // Pattern to match ![alt](csv:uuid) or ![alt](/api/csvs/uuid) or chart references
  const pattern = /!\[([^\]]*)\]\((csv:[a-f0-9-]+|\/api\/csvs\/[a-f0-9-]+|\/api\/charts\/[^\/]+\/image)\)/gi;

  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      });
    }

    const url = match[2];

    const csvProtocolMatch = url.match(/^csv:([a-f0-9-]+)$/i);
    const csvApiMatch = url.match(/^\/api\/csvs\/([a-f0-9-]+)$/i);

    if (csvProtocolMatch || csvApiMatch) {
      const csvId = (csvProtocolMatch || csvApiMatch)![1];
      segments.push({
        type: 'csv',
        content: match[0],
        id: csvId
      });
    } else {
      const chartMatch = url.match(/^\/api\/charts\/([^\/]+)\/image$/);
      if (chartMatch) {
        segments.push({
          type: 'chart',
          content: match[0],
          id: chartMatch[1]
        });
      }
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }

  return segments;
};

export const CitationTextRenderer = React.memo(({
  text,
  citations,
  className = "",
  isAnimating = false
}: CitationTextRendererProps) => {
  // Memoize the custom components for Streamdown
  const components = useMemo(() => ({
    p: ParagraphWithCitations,
    h1: (props: { children?: ReactNode }) => <HeadingWithCitations level={1} {...props} />,
    h2: (props: { children?: ReactNode }) => <HeadingWithCitations level={2} {...props} />,
    h3: (props: { children?: ReactNode }) => <HeadingWithCitations level={3} {...props} />,
    h4: (props: { children?: ReactNode }) => <HeadingWithCitations level={4} {...props} />,
    h5: (props: { children?: ReactNode }) => <HeadingWithCitations level={5} {...props} />,
    h6: (props: { children?: ReactNode }) => <HeadingWithCitations level={6} {...props} />,
    li: ListItemWithCitations,
    strong: StrongWithCitations,
    code: CodeWithMath,
  }), []);

  // Parse special references (CSV/charts)
  const specialSegments = useMemo(() => parseSpecialReferences(text), [text]);
  const hasSpecialRefs = specialSegments.some(s => s.type === 'csv' || s.type === 'chart');

  // If we have CSV or chart references, render them separately to avoid nesting issues
  if (hasSpecialRefs) {
    return (
      <div className={className}>
        <CitationsContext.Provider value={citations}>
          {specialSegments.map((segment, idx) => {
            if (segment.type === 'csv' && segment.id) {
              return <CsvRenderer key={`${segment.id}-${idx}`} csvId={segment.id} />;
            }
            if (segment.type === 'chart' && segment.id) {
              return <InlineChartRenderer key={`${segment.id}-${idx}`} chartId={segment.id} />;
            }
            // Render text segment with Streamdown
            return (
              <Streamdown
                key={idx}
                className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                isAnimating={isAnimating}
                components={components}
              >
                {segment.content}
              </Streamdown>
            );
          })}
        </CitationsContext.Provider>
      </div>
    );
  }

  return (
    <CitationsContext.Provider value={citations}>
      <div className={className}>
        <Streamdown
          className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
          isAnimating={isAnimating}
          components={components}
        >
          {text}
        </Streamdown>
      </div>
    </CitationsContext.Provider>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.text === nextProps.text &&
    Object.keys(prevProps.citations).length === Object.keys(nextProps.citations).length &&
    prevProps.className === nextProps.className &&
    prevProps.isAnimating === nextProps.isAnimating
  );
});

CitationTextRenderer.displayName = "CitationTextRenderer";
