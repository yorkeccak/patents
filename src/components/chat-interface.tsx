"use client";

import React from "react";
import { useChat } from "@ai-sdk/react";
import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { PatentUIMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useLocalProvider } from "@/lib/ollama-context";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { useSubscription } from "@/hooks/use-subscription";
import { createClient } from '@/utils/supabase/client-wrapper';
import { track } from '@vercel/analytics';
import { AuthModal } from '@/components/auth/auth-modal';
import { RateLimitBanner } from '@/components/rate-limit-banner';
import { ModelCompatibilityDialog } from '@/components/model-compatibility-dialog';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { VirtualizedContentDialog } from "@/components/virtualized-content-dialog";
import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  memo,
  useDeferredValue,
} from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  RotateCcw,
  Square,
  Trash2,
  AlertCircle,
  Loader2,
  Edit3,
  Wrench,
  CheckCircle,
  Copy,
  Clock,
  ChevronDown,
  ExternalLink,
  FileText,
  Clipboard,
  Download,
  Brain,
  Search,
  Globe,
  BookOpen,
  Code2,
  Table,
  BarChart3,
  Check,
} from "lucide-react";
import { Streamdown } from "streamdown";
import "katex/dist/katex.min.css";
import katex from "katex";
import { PatentChart } from "@/components/financial-chart";
import { CSVPreview } from "@/components/csv-preview";
import { CitationTextRenderer } from "@/components/citation-text-renderer";
import { CitationMap } from "@/lib/citation-utils";
import { CsvRenderer } from "@/components/csv-renderer";
import { Favicon } from "@/components/favicon";
const JsonView = dynamic(() => import("@uiw/react-json-view"), {
  ssr: false,
  loading: () => <div className="text-xs text-muted-foreground">Loading JSON…</div>,
});
import { parseFirstLine } from "@/lib/text-utils";
import { motion, AnimatePresence } from "framer-motion";
import DataSourceLogos from "./data-source-logos";
import SocialLinks from "./social-links";
import { calculateMessageMetrics, MessageMetrics } from "@/lib/metrics-calculator";
import { MetricsPills } from "@/components/metrics-pills";
import { PatentCard } from "@/components/patent-card";
import { PatentDetailsPanel } from "@/components/patent-details-panel";

// Debug toggles removed per request

// Professional BioMed Research UI - Workflow-inspired with checkmarks and clean cards
const TimelineStep = memo(({
  part,
  messageId,
  index,
  status,
  type = 'reasoning',
  title,
  subtitle,
  icon,
  expandedTools,
  toggleToolExpansion,
  children,
}: {
  part: any;
  messageId: string;
  index: number;
  status: string;
  type?: 'reasoning' | 'search' | 'action' | 'tool';
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  expandedTools: Set<string>;
  toggleToolExpansion: (id: string) => void;
  children?: React.ReactNode;
}) => {
  const stepId = `step-${type}-${messageId}-${index}`;
  const isExpanded = expandedTools.has(stepId);
  const hasContent = children || (part.text && part.text.length > 0);

  const toggleExpand = () => {
    toggleToolExpansion(stepId);
  };

  const isComplete = status === 'complete';
  const isStreaming = status === 'streaming';
  const isError = status === 'error';

  return (
    <div className="group relative py-0.5 animate-in fade-in duration-200">
      {/* Minimal, refined design */}
      <div
        className={`relative flex items-start gap-4 py-4 px-3 sm:px-4 -mx-1 sm:-mx-2 rounded-md transition-all duration-150 ${
          isStreaming ? 'bg-primary/5' : ''
        } ${
          hasContent ? 'hover:bg-muted dark:hover:bg-card/[0.02] cursor-pointer' : ''
        }`}
        onClick={hasContent ? toggleExpand : undefined}
      >
        {/* Minimal status indicator */}
        <div className="flex-shrink-0">
          {isComplete ? (
            <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-primary stroke-[2.5]" />
            </div>
          ) : isStreaming ? (
            <div className="relative w-4 h-4">
              <div className="absolute inset-0 rounded-full border border-primary/40" />
              <div className="absolute inset-0 rounded-full border border-transparent border-t-primary animate-spin" />
            </div>
          ) : isError ? (
            <div className="w-4 h-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-2.5 h-2.5 text-destructive" />
            </div>
          ) : (
            <div className="w-4 h-4 rounded-full border border-border" />
          )}
        </div>

        {/* Clean icon */}
        {icon && (
          <div className={`flex-shrink-0 w-4 h-4 ${
            isStreaming ? 'text-primary' : 'text-muted-foreground'
          }`}>
            {icon}
          </div>
        )}

        {/* Clean typography */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-foreground">
              {title}
            </span>
          </div>
          {subtitle && !isExpanded && (
            <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {subtitle}
            </div>
          )}
        </div>

        {/* Minimal chevron */}
        {hasContent && !isStreaming && (
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform duration-150 ${
            isExpanded ? 'rotate-180' : ''
          }`} />
        )}
      </div>

      {/* Clean expanded content */}
      {isExpanded && hasContent && (
        <div className="mt-1.5 ml-6 mr-2 animate-in fade-in duration-150">
          {children || (
            <div className="text-sm leading-relaxed text-foreground bg-muted/50 rounded-lg px-3 py-2.5 border-l-2 border-border">
              <Streamdown className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                {part.text || ''}
              </Streamdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.part === nextProps.part &&
    prevProps.status === nextProps.status &&
    prevProps.expandedTools === nextProps.expandedTools &&
    prevProps.children === nextProps.children
  );
});
TimelineStep.displayName = 'TimelineStep';

// Live Reasoning Preview - shows latest **title** + 2 most recent lines
// Lines wrap and stream/switch as new content comes in
const LiveReasoningPreview = memo(({ title, lines }: { title: string; lines: string[] }) => {
  if (!title && lines.length === 0) return null;

  // Always show the last 2 lines
  const displayLines = lines.slice(-2);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className="my-1 ml-3 sm:ml-8 mr-3 sm:mr-0"
    >
      <div className="bg-primary/10 border-l-2 border-primary rounded-r px-2 sm:px-2.5 py-1.5 space-y-1 overflow-hidden max-w-full">
        {/* Show the latest **title** */}
        {title && (
          <div className="text-xs font-semibold text-primary truncate">
            {title}
          </div>
        )}

        {/* Show 2 most recent lines - each limited to 1 visual line */}
        <AnimatePresence mode="popLayout">
          {displayLines.map((line, index) => (
            <motion.div
              key={`${displayLines.length}-${index}-${line.substring(0, 30)}`}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.08 }}
              className="text-xs text-muted-foreground leading-snug truncate max-w-full"
            >
              {line}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

LiveReasoningPreview.displayName = 'LiveReasoningPreview';

// Reasoning component - wraps TimelineStep
const ReasoningComponent = memo(({
  part,
  messageId,
  index,
  status,
  expandedTools,
  toggleToolExpansion,
}: {
  part: any;
  messageId: string;
  index: number;
  status: string;
  expandedTools: Set<string>;
  toggleToolExpansion: (id: string) => void;
}) => {
  const reasoningText = part.text || "";
  // Extract the first meaningful line as the title and strip markdown
  const firstLine = reasoningText.split('\n').find((line: string) => line.trim().length > 0) || "";
  // Remove markdown formatting like **, *, _, etc.
  const cleanedLine = firstLine.replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').trim();
  const title = cleanedLine.length > 50 ? cleanedLine.slice(0, 50) + '...' : cleanedLine || "Thinking";

  return (
    <TimelineStep
      part={part}
      messageId={messageId}
      index={index}
      status={status}
      type="reasoning"
      title={title}
      subtitle={undefined}
      icon={<Brain />}
      expandedTools={expandedTools}
      toggleToolExpansion={toggleToolExpansion}
    />
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.part.text === nextProps.part.text &&
    prevProps.messageId === nextProps.messageId &&
    prevProps.index === nextProps.index &&
    prevProps.status === nextProps.status &&
    prevProps.expandedTools === nextProps.expandedTools
  );
});
ReasoningComponent.displayName = 'ReasoningComponent';

// ChartImageRenderer component - Fetches and renders charts from markdown references
const ChartImageRendererComponent = ({ chartId, alt }: { chartId: string; alt?: string }) => {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
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
      <span className="block w-full border border-border rounded-lg p-12 my-4 text-center">
        <span className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></span>
        <span className="block mt-3 text-sm text-muted-foreground">Loading chart...</span>
      </span>
    );
  }

  if (error || !chartData) {
    return (
      <span className="block w-full border border-destructive/30 rounded-lg p-6 my-4 text-center">
        <span className="text-sm text-destructive">Failed to load chart</span>
      </span>
    );
  }

  return (
    <span className="block w-full my-4">
      <PatentChart {...chartData} key={chartId} />
    </span>
  );
};

// Memoize ChartImageRenderer to prevent unnecessary re-fetches and re-renders
const ChartImageRenderer = memo(ChartImageRendererComponent, (prevProps, nextProps) => {
  return prevProps.chartId === nextProps.chartId && prevProps.alt === nextProps.alt;
});
ChartImageRenderer.displayName = 'ChartImageRenderer';

// CSV rendering now handled by shared CsvRenderer component

// Memoized Chart Result - prevents re-rendering when props don't change
const MemoizedChartResult = memo(function MemoizedChartResult({
  chartData,
  actionId,
  expandedTools,
  toggleToolExpansion
}: {
  chartData: any;
  actionId: string;
  expandedTools: Set<string>;
  toggleToolExpansion: (id: string) => void;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <PatentChart {...chartData} />
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.chartData === nextProps.chartData &&
    prevProps.actionId === nextProps.actionId &&
    prevProps.expandedTools === nextProps.expandedTools
  );
});
MemoizedChartResult.displayName = 'MemoizedChartResult';

// Memoized Code Execution Result - prevents re-rendering when props don't change
// Uses plain pre/code WITHOUT syntax highlighting to prevent browser freeze
const MemoizedCodeExecutionResult = memo(function MemoizedCodeExecutionResult({
  code,
  output,
  actionId,
  expandedTools,
  toggleToolExpansion
}: {
  code: string;
  output: string;
  actionId: string;
  expandedTools: Set<string>;
  toggleToolExpansion: (id: string) => void;
}) {
  const isExpanded = expandedTools.has(actionId);

  // Escape HTML entities to prevent rendering <module> and other HTML-like content as actual HTML
  const escapeHtml = (text: string) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  return (
    <div className="space-y-4">
      {/* Code Section - clean monospace display */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Input</div>
        <pre className="p-4 bg-card bg-card text-foreground text-xs overflow-x-auto rounded-lg max-h-[400px] overflow-y-auto border border-border shadow-inner">
          <code>{code || "No code available"}</code>
        </pre>
      </div>

      {/* Output Section - elegant typography */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Output</div>
        <div className="prose prose-sm max-w-none dark:prose-invert text-sm p-4 bg-card/50 rounded-lg max-h-[400px] overflow-y-auto border border-border/50">
          <MemoizedMarkdown text={escapeHtml(output)} />
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.code === nextProps.code &&
    prevProps.output === nextProps.output &&
    prevProps.actionId === nextProps.actionId &&
    prevProps.expandedTools === nextProps.expandedTools
  );
});
MemoizedCodeExecutionResult.displayName = 'MemoizedCodeExecutionResult';

// Memoized component for parsed first line to avoid repeated parsing
const MemoizedFirstLine = memo(function MemoizedFirstLine({
  text,
  fallback,
}: {
  text: string;
  fallback: string;
}) {
  const parsed = useMemo(
    () => parseFirstLine(text, fallback),
    [text, fallback]
  );
  return <>{parsed}</>;
});

// Helper function to group message parts - memoized to prevent re-computation on every render
function groupMessageParts(parts: any[]): any[] {
  const groupedParts: any[] = [];
  let currentReasoningGroup: any[] = [];
  const seenToolCallIds = new Set<string>();


  parts.forEach((part, index) => {
    // Skip step-start markers entirely - they're metadata from AI SDK
    if (part.type === "step-start") {
      return;
    }

    // Deduplicate tool calls by toolCallId - skip if we've already seen this tool call
    if (part.toolCallId && seenToolCallIds.has(part.toolCallId)) {
      return;
    }

    // Track this tool call ID
    if (part.toolCallId) {
      seenToolCallIds.add(part.toolCallId);
    }

    if (
      part.type === "reasoning" &&
      part.text &&
      part.text.trim() !== ""
    ) {
      currentReasoningGroup.push({ part, index });
    } else {
      if (currentReasoningGroup.length > 0) {
        groupedParts.push({
          type: "reasoning-group",
          parts: currentReasoningGroup,
        });
        currentReasoningGroup = [];
      }
      groupedParts.push({ type: "single", part, index });
    }
  });

  // Add any remaining reasoning group
  if (currentReasoningGroup.length > 0) {
    groupedParts.push({
      type: "reasoning-group",
      parts: currentReasoningGroup,
    });
  }


  return groupedParts;
}

// Helper to parse and extract CSV/chart references from markdown
const parseSpecialReferences = (text: string): Array<{ type: 'text' | 'csv' | 'chart', content: string, id?: string }> => {
  const segments: Array<{ type: 'text' | 'csv' | 'chart', content: string, id?: string }> = [];

  // Pattern to match ![alt](csv:uuid) or ![alt](/api/csvs/uuid) or chart references
  const pattern = /!\[([^\]]*)\]\((csv:[a-f0-9-]+|\/api\/csvs\/[a-f0-9-]+|\/api\/charts\/[^\/]+\/image)\)/gi;

  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before the reference
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      });
    }

    const url = match[2];

    // Check if it's a CSV reference
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
      // Chart reference
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

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }

  return segments;
};

// Memoized Markdown renderer using Streamdown for better streaming performance
const MemoizedMarkdown = memo(function MemoizedMarkdown({
  text,
  isAnimating = false,
}: {
  text: string;
  isAnimating?: boolean;
}) {
  // Parse special references (CSV/charts) - MUST be before any conditional returns
  const specialSegments = useMemo(() => parseSpecialReferences(text), [text]);
  const hasSpecialRefs = specialSegments.some(s => s.type === 'csv' || s.type === 'chart');

  // Streamdown components for custom rendering
  const streamdownComponents = useMemo(() => ({
    code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
      const content = typeof children === "string" ? children : children?.toString() || "";
      // Check if this is a math block
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
    },
  }), []);

  // If we have CSV or chart references, render them separately to avoid nesting issues
  if (hasSpecialRefs) {
    return (
      <>
        {specialSegments.map((segment, idx) => {
          if (segment.type === 'csv' && segment.id) {
            return <CsvRenderer key={`${segment.id}-${idx}`} csvId={segment.id} />;
          }
          if (segment.type === 'chart' && segment.id) {
            return <ChartImageRenderer key={`${segment.id}-${idx}`} chartId={segment.id} />;
          }
          // Render text segment with Streamdown
          return (
            <Streamdown
              key={idx}
              className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
              isAnimating={isAnimating}
              components={streamdownComponents}
            >
              {segment.content}
            </Streamdown>
          );
        })}
      </>
    );
  }

  return (
    <Streamdown
      className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
      isAnimating={isAnimating}
      components={streamdownComponents}
    >
      {text}
    </Streamdown>
  );
}, (prevProps, nextProps) => {
  // PERFORMANCE FIX: Only re-render if text actually changes
  return prevProps.text === nextProps.text && prevProps.isAnimating === nextProps.isAnimating;
});

// THIS IS THE KEY OPTIMIZATION - prevents re-renders during streaming
// Extract citations ONLY when parts change, NOT when text streams
const MemoizedTextPartWithCitations = memo(
  function MemoizedTextPartWithCitations({
    text,
    messageParts,
    currentPartIndex,
    allMessages,
    currentMessageIndex,
    isAnimating = false,
  }: {
    text: string;
    messageParts: any[];
    currentPartIndex: number;
    allMessages?: any[];
    currentMessageIndex?: number;
    isAnimating?: boolean;
  }) {
    // Extract citations only when parts before this one change, not when text streams
    const citations = useMemo(() => {
      const citationMap: CitationMap = {};
      let citationNumber = 1;


      // Scan ALL previous messages AND current message for tool results
      if (allMessages && currentMessageIndex !== undefined) {
        for (let msgIdx = 0; msgIdx <= currentMessageIndex; msgIdx++) {
          const msg = allMessages[msgIdx];
          if (!msg) continue; // Skip if message doesn't exist
          const parts = msg.parts || (Array.isArray(msg.content) ? msg.content : []);


          for (let i = 0; i < parts.length; i++) {
            const p = parts[i];


        // Check for search tool results - handle both live streaming and saved message formats
        // Live: p.type = "tool-patentSearch", Saved: p.type = "tool-result" with toolName
        const isSearchTool =
          p.type === "tool-patentSearch" ||
          p.type === "tool-webSearch" ||
          (p.type === "tool-result" && (
            p.toolName === "patentSearch" ||
            p.toolName === "webSearch"
          ));

        if (isSearchTool && (p.output || p.result)) {
          try {
            const output = typeof p.output === "string" ? JSON.parse(p.output) :
                          typeof p.result === "string" ? JSON.parse(p.result) :
                          p.output || p.result;

            // Check if this is a search result with multiple items
            if (output.results && Array.isArray(output.results)) {
              output.results.forEach((item: any) => {
                const key = `[${citationNumber}]`;
                let description = item.content || item.summary || item.description || "";
                if (typeof description === "object") {
                  description = JSON.stringify(description);
                }
                citationMap[key] = [
                  {
                    number: citationNumber.toString(),
                    title: item.title || `Source ${citationNumber}`,
                    url: item.url || "",
                    description: description,
                    source: item.source,
                    date: item.date,
                    authors: Array.isArray(item.authors) ? item.authors : [],
                    doi: item.doi,
                    relevanceScore: item.relevanceScore || item.relevance_score,
                    toolType:
                      p.type === "tool-patentSearch" || p.toolName === "patentSearch"
                        ? "patent"
                        : "web",
                  },
                ];
                citationNumber++;
              });
            }
          } catch (error) {
            // Ignore parse errors
          }
        }
          }
        }
      } else {
        // Fallback: scan current message only (for streaming messages)
        for (let i = 0; i < messageParts.length; i++) {
          const p = messageParts[i];

          const isSearchTool =
            p.type === "tool-patentSearch" ||
            p.type === "tool-webSearch" ||
            (p.type === "tool-result" && (
              p.toolName === "patentSearch" ||
              p.toolName === "webSearch"
            ));

          if (isSearchTool && (p.output || p.result)) {
            try {
              const output = typeof p.output === "string" ? JSON.parse(p.output) :
                            typeof p.result === "string" ? JSON.parse(p.result) :
                            p.output || p.result;

              if (output.results && Array.isArray(output.results)) {
                output.results.forEach((item: any) => {
                  const key = `[${citationNumber}]`;
                  let description = item.content || item.summary || item.description || "";
                  if (typeof description === "object") {
                    description = JSON.stringify(description);
                  }
                  citationMap[key] = [
                    {
                      number: citationNumber.toString(),
                      title: item.title || `Source ${citationNumber}`,
                      url: item.url || "",
                      description: description,
                      source: item.source,
                      date: item.date,
                      authors: Array.isArray(item.authors) ? item.authors : [],
                      doi: item.doi,
                      relevanceScore: item.relevanceScore || item.relevance_score,
                      toolType:
                        p.type === "tool-patentSearch" || p.toolName === "patentSearch"
                          ? "patent"
                          : "web",
                    },
                  ];
                  citationNumber++;
                });
              }
            } catch (error) {
              // Ignore parse errors
            }
          }
        }
      }

      return citationMap;
    }, [messageParts, currentPartIndex, allMessages, currentMessageIndex]); // Only recompute when parts array changes, not text

    // Memoize whether citations exist to avoid Object.keys() on every render
    const hasCitations = useMemo(() => {
      return Object.keys(citations).length > 0;
    }, [citations]);

    // Render with or without citations
    if (hasCitations) {
      return <CitationTextRenderer text={text} citations={citations} isAnimating={isAnimating} />;
    } else {
      return <MemoizedMarkdown text={text} isAnimating={isAnimating} />;
    }
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if text changed OR parts structure changed
    // This prevents re-rendering on every token during streaming
    return (
      prevProps.text === nextProps.text &&
      prevProps.currentPartIndex === nextProps.currentPartIndex &&
      prevProps.messageParts.length === nextProps.messageParts.length &&
      prevProps.isAnimating === nextProps.isAnimating
    );
  }
);

// Helper function to extract search results for carousel display
const extractSearchResults = (jsonOutput: string) => {
  try {
    const data = JSON.parse(jsonOutput);
    if (data.results && Array.isArray(data.results)) {
      const mappedResults = data.results.map((result: any, index: number) => ({
        id: result.id || index,
        title: result.title || `Result ${index + 1}`,
        summary: result.content
          ? typeof result.content === "string"
            ? result.content.length > 150
              ? result.content.substring(0, 150) + "..."
              : result.content
            : typeof result.content === "number"
            ? `Current Price: $${result.content.toFixed(2)}`
            : `${
                result.dataType === "structured" ? "Structured data" : "Data"
              } from ${result.source || "source"}`
          : "No summary available",
        source: result.source || "Unknown source",
        date: result.date || "",
        url: result.url || "",
        fullContent:
          typeof result.content === "number"
            ? `$${result.content.toFixed(2)}`
            : result.content || "No content available",
        isStructured: result.dataType === "structured",
        dataType: result.dataType || "unstructured",
        length: result.length,
        imageUrls: result.imageUrl || result.image_url || {},
        relevanceScore: result.relevanceScore || result.relevance_score || 0,
        metadata: result.metadata || {},
        publication_date: result.publication_date || result.metadata?.date_published,
      }));

      // Sort results: structured first, then by relevance score within each category
      return mappedResults.sort((a: any, b: any) => {
        // If one is structured and the other is unstructured, structured comes first
        if (a.isStructured && !b.isStructured) return -1;
        if (!a.isStructured && b.isStructured) return 1;

        // Within the same category, sort by relevance score (higher score first)
        return (b.relevanceScore || 0) - (a.relevanceScore || 0);
      });
    }
    return [];
  } catch (error) {
    return [];
  }
};

// Search Result Card Component
const SearchResultCard = ({
  result,
  type,
}: {
  result: any;
  type: "web" | "patent";
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Calculate content size to determine if we need virtualization
  const contentSize = useMemo(() => {
    const content =
      typeof result.fullContent === "string"
        ? result.fullContent
        : JSON.stringify(result.fullContent || {}, null, 2);
    return new Blob([content]).size;
  }, [result.fullContent]);

  // Use virtualized dialog for content larger than 500KB
  const useVirtualized = contentSize > 100 * 1024;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
    }
  };

  // If using virtualized dialog, render it separately
  if (useVirtualized) {
    const content =
      typeof result.fullContent === "string"
        ? result.fullContent
        : JSON.stringify(result.fullContent || {}, null, 2);

    return (
      <>
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow min-w-[240px] sm:min-w-[280px] max-w-[280px] sm:max-w-[320px] flex-shrink-0 py-2"
          onClick={() => setIsDialogOpen(true)}
        >
          <CardContent className="h-full p-3">
            <div className="flex gap-2.5 h-full">
              {/* Favicon on left */}
              <div className="flex-shrink-0 pt-0.5">
                {type === "patent" ? (
                  <div className="w-5 h-5 rounded bg-muted flex items-center justify-center overflow-hidden p-0.5">
                    <img
                      src="/assets/banner/uspto.png"
                      alt="USPTO"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded bg-muted flex items-center justify-center overflow-hidden">
                    <Favicon
                      url={result.url}
                      size={12}
                      className="w-3 h-3"
                    />
                  </div>
                )}
              </div>

              {/* Content on right */}
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                {/* Title and external link */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground">
                    {result.title}
                  </h4>
                  <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                </div>

                {/* Markdown preview with separator */}
                <div className="flex flex-col gap-1">
                  <div className="h-px bg-border" />
                  <div className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                    {result.summary?.slice(0, 120) || ''}
                  </div>
                </div>

                {/* Metadata badges */}
                <div className="flex items-center gap-1.5 mt-auto">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      result.isStructured
                        ? "bg-primary/10 text-primary"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {result.dataType}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {(() => {
                      try {
                        const url = new URL(result.url);
                        return url.hostname.replace("www.", "");
                      } catch {
                        return result.source || "unknown";
                      }
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <VirtualizedContentDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title={result.title}
          content={content}
          isJson={result.isStructured}
        />
      </>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:shadow-md transition-shadow min-w-[240px] sm:min-w-[280px] max-w-[280px] sm:max-w-[320px] flex-shrink-0 py-2">
          <CardContent className="h-full p-3">
            <div className="flex gap-2.5 h-full">
              {/* Favicon on left */}
              <div className="flex-shrink-0 pt-0.5">
                {type === "patent" ? (
                  <div className="w-5 h-5 rounded bg-muted flex items-center justify-center overflow-hidden p-0.5">
                    <img
                      src="/assets/banner/uspto.png"
                      alt="USPTO"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded bg-muted flex items-center justify-center overflow-hidden">
                    <Favicon
                      url={result.url}
                      size={12}
                      className="w-3 h-3"
                    />
                  </div>
                )}
              </div>

              {/* Content on right */}
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                {/* Title and external link */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground">
                    {result.title}
                  </h4>
                  <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                </div>

                {/* Markdown preview with separator */}
                <div className="flex flex-col gap-1">
                  <div className="h-px bg-border" />
                  <div className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                    {result.summary?.slice(0, 120) || ''}
                  </div>
                </div>

                {/* Metadata badges */}
                <div className="flex items-center gap-1.5 mt-auto">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      result.isStructured
                        ? "bg-primary/10 text-primary"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {result.dataType}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {(() => {
                      try {
                        const urlObj = new URL(result.url);
                        return urlObj.hostname.replace(/^www\./, "");
                      } catch {
                        return result.url;
                      }
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="!max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className=" pr-8">{result.title}</DialogTitle>
          <Separator />
          <div className="text-sm text-muted-foreground space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* <span>{result.source}</span> */}
              {result.date && <span>• {result.date}</span>}
              {result.relevanceScore && (
                <span className="text-xs bg-muted px-2 py-1 rounded">
                  {(result.relevanceScore * 100).toFixed(0)}% relevance
                </span>
              )}
            </div>

            {result.url && (
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:text-primary"
              >
                <Favicon
                  url={result.url}
                  size={16}
                  className="w-3.5 h-3.5"
                />
                <ExternalLink className="h-3 w-3" />
                View Source
              </a>
            )}
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] pr-2">
          {result.isStructured ? (
            // Structured data - show as formatted JSON
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <FileText className="h-4 w-4" />
                  Structured Data
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    {result.dataType}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const jsonData =
                      typeof result.fullContent === "object"
                        ? JSON.stringify(result.fullContent, null, 2)
                        : result.fullContent;
                    copyToClipboard(jsonData);
                  }}
                  className="h-8 px-3 text-muted-foreground hover:text-foreground"
                >
                  <Clipboard className="h-3 w-3 mr-1" />
                  Copy JSON
                </Button>
              </div>
              <div className="bg-muted border border-border rounded-lg overflow-hidden">
                <JsonView
                  value={(() => {
                    try {
                      return typeof result.fullContent === "object"
                        ? result.fullContent
                        : JSON.parse(result.fullContent || "{}");
                    } catch {
                      return {
                        error: "Invalid JSON data",
                        raw: result.fullContent,
                      };
                    }
                  })()}
                  displayDataTypes={false}
                  displayObjectSize={false}
                  enableClipboard={false}
                  collapsed={2}
                  style={
                    {
                      "--w-rjv-font-family":
                        'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                      "--w-rjv-font-size": "13px",
                      "--w-rjv-line-height": "1.4",
                      "--w-rjv-color-string": "rgb(34, 197, 94)",
                      "--w-rjv-color-number": "rgb(239, 68, 68)",
                      "--w-rjv-color-boolean": "rgb(168, 85, 247)",
                      "--w-rjv-color-null": "rgb(107, 114, 128)",
                      "--w-rjv-color-undefined": "rgb(107, 114, 128)",
                      "--w-rjv-color-key": "rgb(30, 41, 59)",
                      "--w-rjv-background-color": "transparent",
                      "--w-rjv-border-left": "1px solid rgb(229, 231, 235)",
                      "--w-rjv-padding": "16px",
                      "--w-rjv-hover-color": "rgb(243, 244, 246)",
                    } as React.CSSProperties
                  }
                  className="dark:[--w-rjv-color-string:rgb(34,197,94)] dark:[--w-rjv-color-number:rgb(248,113,113)] dark:[--w-rjv-color-boolean:rgb(196,181,253)] dark:[--w-rjv-color-key:rgb(248,250,252)] dark:[--w-rjv-border-left:1px_solid_rgb(75,85,99)] dark:[--w-rjv-hover-color:rgb(55,65,81)]"
                />
              </div>
            </div>
          ) : (
            // Unstructured data - show as markdown
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <FileText className="h-4 w-4" />
                Content
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  {result.dataType}
                </span>
                {result.length && (
                  <span className="text-xs text-muted-foreground">
                    {result.length.toLocaleString()} chars
                  </span>
                )}
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <MemoizedMarkdown
                  text={
                    typeof result.fullContent === "string"
                      ? result.fullContent
                      : typeof result.fullContent === "number"
                      ? `$${result.fullContent.toFixed(2)}`
                      : typeof result.fullContent === "object"
                      ? JSON.stringify(result.fullContent, null, 2)
                      : String(result.fullContent || "No content available")
                  }
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Search Results Carousel Component
const SearchResultsCarousel = memo(function SearchResultsCarousel({
  results,
  type,
}: {
  results: any[];
  type: "web" | "patent";
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const imagesScrollRef = useRef<HTMLDivElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showAllImages, setShowAllImages] = useState(false);
  const [selectedPatent, setSelectedPatent] = useState<any>(null);

  const handlePatentClick = useCallback((result: any) => {
    setSelectedPatent(result);
  }, []);

  // Extract all images from results
  const allImages: { url: string; title: string; sourceUrl: string }[] = [];
  const firstImages: { url: string; title: string; sourceUrl: string }[] = [];

  results.forEach((result) => {
    let firstImageAdded = false;
    if (result.imageUrls && typeof result.imageUrls === "object") {
      Object.values(result.imageUrls).forEach((imageUrl: any) => {
        if (typeof imageUrl === "string" && imageUrl.trim()) {
          const imageData = {
            url: imageUrl,
            title: result.title,
            sourceUrl: result.url,
          };
          allImages.push(imageData);

          // Add only the first image per result to firstImages
          if (!firstImageAdded) {
            firstImages.push(imageData);
            firstImageAdded = true;
          }
        }
      });
    }
  });

  const handleImageClick = (idx: number) => {
    setSelectedIndex(idx);
    setDialogOpen(true);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIndex(
      (prev) => (prev - 1 + allImages.length) % allImages.length
    );
  };
  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIndex((prev) => (prev + 1) % allImages.length);
  };

  useEffect(() => {
    if (!dialogOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "Escape") setDialogOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialogOpen, allImages.length, handleNext, handlePrev]);

  if (results.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No results found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Results Carousel */}
      <div className="relative">
        {type === "patent" ? (
          // Patent cards grid for patent results
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 px-2">
            {results.map((result) => (
              <PatentCard
                key={result.id}
                patent={{
                  id: result.id,
                  title: result.title,
                  url: result.url,
                  content: result.fullContent || result.content || '',
                  publication_date: result.publication_date,
                  metadata: result.metadata,
                  relevance_score: result.relevance_score,
                }}
                onClick={() => handlePatentClick(result)}
              />
            ))}
          </div>
        ) : (
          // Original horizontal carousel for other result types
          <div
            ref={scrollRef}
            className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide py-1 sm:py-2 px-1 sm:px-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {results.map((result) => (
              <SearchResultCard key={result.id} result={result} type={type} />
            ))}
          </div>
        )}
      </div>

      {/* Patent Details Panel - Shows when a patent is selected */}
      {type === "patent" && selectedPatent && (
        <div className="fixed inset-y-0 right-0 w-[500px] bg-card border-l border-border shadow-2xl z-50 animate-in slide-in-from-right duration-300">
          <PatentDetailsPanel
            patent={{
              id: selectedPatent.id,
              title: selectedPatent.title,
              url: selectedPatent.url,
              content: selectedPatent.fullContent || selectedPatent.content || '',
              publication_date: selectedPatent.publication_date,
              metadata: selectedPatent.metadata,
              relevance_score: selectedPatent.relevance_score,
              // Pass through fields from patentSearch caching
              abstract: selectedPatent.abstract,
              patentNumber: selectedPatent.patentNumber,
              patentIndex: selectedPatent.patentIndex,
              assignees: selectedPatent.assignees,
              filingDate: selectedPatent.filingDate,
              publicationDate: selectedPatent.publicationDate,
              claimsCount: selectedPatent.claimsCount,
              fullContentCached: selectedPatent.fullContentCached,
            }}
            onClose={() => setSelectedPatent(null)}
          />
        </div>
      )}

      {/* Images Carousel - Only show if there are images */}
      {allImages.length > 0 && (
        <div className="relative">
          <div className="text-sm font-medium text-foreground mb-2 px-2">
            Related Images
          </div>
          <div
            ref={imagesScrollRef}
            className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide py-1 sm:py-2 px-1 sm:px-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {(showAllImages ? allImages : firstImages).map((image, index) => (
              <div
                key={index}
                className="flex-shrink-0 cursor-pointer group"
                onClick={() => {
                  // When clicking an image, use the correct index from allImages
                  const realIndex = allImages.findIndex((img) => img === image);
                  handleImageClick(realIndex);
                }}
              >
                <div className="relative overflow-hidden rounded-lg border border-border hover:border-border transition-all">
                  <Image
                    src={image.url}
                    width={200}
                    height={150}
                    alt={image.title}
                    className="h-24 sm:h-32 w-36 sm:w-48 object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-white text-xs line-clamp-2">
                      {image.title}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Show expand/collapse button if there are more images than first images */}
            {allImages.length > firstImages.length && (
              <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{ minWidth: "120px" }}
              >
                <button
                  onClick={() => setShowAllImages(!showAllImages)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted rounded-lg transition-colors"
                >
                  {showAllImages ? (
                    <>Show less</>
                  ) : (
                    <>+{allImages.length - firstImages.length} more</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Dialog for image carousel */}
          {dialogOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
              onClick={() => setDialogOpen(false)}
            >
              <div
                className="relative max-w-3xl w-full flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="absolute top-2 right-2 text-white bg-black/60 rounded-full p-2 hover:bg-black/80 z-10"
                  onClick={() => setDialogOpen(false)}
                  aria-label="Close"
                >
                  <svg
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <div className="flex items-center justify-center w-full h-[60vh]">
                  <button
                    className="text-white bg-black/40 hover:bg-black/70 rounded-full p-2 absolute left-2 top-1/2 -translate-y-1/2 z-10"
                    onClick={handlePrev}
                    aria-label="Previous"
                  >
                    <svg
                      width="32"
                      height="32"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <Image
                    src={allImages[selectedIndex].url}
                    alt={allImages[selectedIndex].title}
                    width={800}
                    height={600}
                    className="max-h-[60vh] max-w-full rounded-lg shadow-lg mx-8"
                  />
                  <button
                    className="text-white bg-black/40 hover:bg-black/70 rounded-full p-2 absolute right-2 top-1/2 -translate-y-1/2 z-10"
                    onClick={handleNext}
                    aria-label="Next"
                  >
                    <svg
                      width="32"
                      height="32"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
                <div className="mt-4 text-center">
                  <div className="text-lg font-medium text-white mb-2 line-clamp-2">
                    {allImages[selectedIndex].title}
                  </div>
                  <a
                    href={allImages[selectedIndex].sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary/60 underline hover:text-primary text-sm"
                  >
                    View Source
                  </a>
                  <div className="text-xs text-muted-foreground mt-2">
                    {selectedIndex + 1} / {allImages.length}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export function ChatInterface({
  sessionId,
  onMessagesChange,
  onRateLimitError,
  onSessionCreated,
  onNewChat,
  rateLimitProps,
}: {
  sessionId?: string;
  onMessagesChange?: (hasMessages: boolean) => void;
  onRateLimitError?: (resetTime: string) => void;
  onSessionCreated?: (sessionId: string) => void;
  onNewChat?: () => void;
  rateLimitProps?: {
    allowed?: boolean;
    remaining?: number;
    resetTime?: Date;
    increment: () => Promise<any>;
  };
}) {
  const [input, setInput] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [isTraceExpanded, setIsTraceExpanded] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);
  const sessionIdRef = useRef<string | undefined>(undefined);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const userHasInteracted = useRef(false);

  const [isFormAtBottom, setIsFormAtBottom] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isStartingNewChat, setIsStartingNewChat] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [queryStartTime, setQueryStartTime] = useState<number | null>(null);
  const [modelCompatibilityError, setModelCompatibilityError] = useState<{
    message: string;
    compatibilityIssue: string;
  } | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [liveProcessingTime, setLiveProcessingTime] = useState<number>(0);
  const [selectedPatentFromTool, setSelectedPatentFromTool] = useState<any>(null);

  // Live reasoning preview - no longer needed as global state
  // Each reasoning component will handle its own preview based on streaming state

  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  // Rate limit props passed from parent
  const { allowed, remaining, resetTime, increment } = rateLimitProps || {};
  const canSendQuery = allowed;

  // Optimistic rate limit increment mutation
  const rateLimitMutation = useMutation({
    mutationFn: async () => {
      // This is a dummy mutation since the actual increment happens server-side
      return Promise.resolve();
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['rateLimit'] });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData(['rateLimit']);
      
      // Optimistically update
      queryClient.setQueryData(['rateLimit'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          used: (old.used || 0) + 1,
          remaining: Math.max(0, (old.remaining || 0) - 1),
          allowed: (old.used || 0) + 1 < (old.limit || 5)
        };
      });
      
      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['rateLimit'], context.previousData);
      }
    },
    // No onSettled - let the optimistic update persist until chat finishes
  });


  const { selectedModel, selectedProvider } = useLocalProvider();
  const user = useAuthStore((state) => state.user);
  const getValyuAccessToken = useAuthStore((state) => state.getValyuAccessToken);
  const subscription = useSubscription();

  // Auth modal state for paywalls
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Signup prompt for non-authenticated users
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);

  // Listen for global auth modal trigger (from sidebar, etc.)
  useEffect(() => {
    const handleShowAuthModal = () => setShowAuthModal(true);
    window.addEventListener('show-auth-modal', handleShowAuthModal);
    return () => window.removeEventListener('show-auth-modal', handleShowAuthModal);
  }, []);

  // Session management functions
  const generateSessionTitle = useCallback((firstMessage: string): string => {
    // Create a smart title from the first user message
    const cleaned = firstMessage.trim();

    // Patent-related keywords to prioritize in titles
    const patentKeywords = [
      'patent', 'patents', 'prior art', 'claims', 'fto', 'freedom to operate',
      'infringement', 'novelty', 'assignee', 'inventor', 'filing', 'application',
      'USPTO', 'EPO', 'PCT', 'granted', 'pending', 'expired', 'citation', 'citations',
      'portfolio', 'competitive', 'landscape', 'technology', 'CPC', 'IPC', 'classification',
      'prosecution', 'litigation', 'licensing', 'IP', 'intellectual property'
    ];

    if (cleaned.length <= 50) {
      return cleaned;
    }

    // Try to find a sentence with patent-related context
    const sentences = cleaned.split(/[.!?]+/);
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 10 && trimmed.length <= 50) {
        // Check if this sentence contains patent keywords
        const hasPatentContext = patentKeywords.some(keyword =>
          trimmed.toLowerCase().includes(keyword.toLowerCase())
        );

        if (hasPatentContext) {
          return trimmed;
        }
      }
    }

    // Fall back to smart truncation
    const truncated = cleaned.substring(0, 47);
    const lastSpace = truncated.lastIndexOf(' ');
    const lastPeriod = truncated.lastIndexOf('.');
    const lastQuestion = truncated.lastIndexOf('?');

    const breakPoint = Math.max(lastSpace, lastPeriod, lastQuestion);
    const title = breakPoint > 20 ? truncated.substring(0, breakPoint) : truncated;

    return title + (title.endsWith('.') || title.endsWith('?') ? '' : '...');
  }, []);

  const createSession = useCallback(async (firstMessage: string): Promise<string | null> => {
    if (!user) return null;

    try {
      // Use fast fallback title initially
      const quickTitle = generateSessionTitle(firstMessage);

      // Create session immediately with fallback title (auth via Supabase cookies)
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: quickTitle })
      });

      if (response.ok) {
        const { session: newSession } = await response.json();

        // Generate better AI title in background (don't wait)
        const titleHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Add Ollama preference header if in development mode
        if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_APP_MODE === 'development') {
          const ollamaEnabled = localStorage.getItem('ollama-enabled');
          if (ollamaEnabled !== null) {
            titleHeaders['x-ollama-enabled'] = ollamaEnabled;
          }
        }

        fetch('/api/chat/generate-title', {
          method: 'POST',
          headers: titleHeaders,
          body: JSON.stringify({ message: firstMessage })
        }).then(async (titleResponse) => {
          if (titleResponse.ok) {
            const { title: aiTitle } = await titleResponse.json();
            // Update session title in background
            await fetch(`/api/chat/sessions/${newSession.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ title: aiTitle })
            });
          }
        }).catch(() => {
        });

        return newSession.id;
      }
    } catch (error) {
    }
    return null;
  }, [user, generateSessionTitle]);

  // Placeholder for loadSessionMessages - will be defined after useChat hook

  const transport = useMemo(() =>
    new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: async ({ messages }) => {
        const headers: Record<string, string> = {};
        if (selectedModel) {
          headers['x-ollama-model'] = selectedModel;
        }

        // Check if local provider is enabled in localStorage (only in development mode)
        if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_APP_MODE === 'development') {
          const localEnabled = localStorage.getItem('ollama-enabled');
          if (localEnabled !== null) {
            headers['x-ollama-enabled'] = localEnabled;
          }
          // Add selected provider
          if (selectedProvider) {
            headers['x-local-provider'] = selectedProvider;
          }
        }

        // Auth is handled via Supabase cookies - no need for explicit token header

        // Get Valyu OAuth token for API proxy (uses user's credits instead of server's)
        const valyuAccessToken = getValyuAccessToken();

        return {
          body: {
            messages,
            sessionId: sessionIdRef.current,
            valyuAccessToken, // Pass to server for Valyu API proxy
          },
          headers,
        };
      }
    }), [selectedModel, selectedProvider, getValyuAccessToken]
  );

  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    regenerate,
    setMessages,
    addToolResult,
  } = useChat<PatentUIMessage>({
    transport,
    // Automatically submit when all tool results are available
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onFinish: () => {
      // Sync with server when chat completes (server has definitely processed increment by now)
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['rateLimit'] });
      }
    },
    onError: (error: Error) => {
      console.error('[Chat Interface] Error:', error);

      // Check if this is a model compatibility error
      if (error.message.includes('MODEL_COMPATIBILITY_ERROR')) {
        try {
          // Parse the error details from the message
          const errorData = JSON.parse(error.message.replace(/^Error: /, ''));
          if (errorData.error === 'MODEL_COMPATIBILITY_ERROR') {
            setModelCompatibilityError({
              message: errorData.message,
              compatibilityIssue: errorData.compatibilityIssue
            });
          }
        } catch (e) {
          console.error('Failed to parse compatibility error:', e);
        }
      }
    },
  });


  // Session loading function - defined after useChat to access setMessages
  const loadSessionMessages = useCallback(async (sessionId: string) => {
    if (!user) return;

    setIsLoadingSession(true);
    try {
      // Auth via Supabase cookies
      const response = await fetch(`/api/chat/sessions/${sessionId}`);

      if (response.ok) {
        const { messages: sessionMessages } = await response.json();
        
        // Convert session messages to the format expected by useChat
        const convertedMessages = sessionMessages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          parts: msg.parts,
          toolCalls: msg.toolCalls,
          createdAt: msg.createdAt,
          processing_time_ms: msg.processing_time_ms
        }));
        
        // Set messages in the chat
        setMessages(convertedMessages);
        sessionIdRef.current = sessionId;
        setCurrentSessionId(sessionId);
        
        // Move form to bottom when loading a session with messages
        if (convertedMessages.length > 0) {
          setIsFormAtBottom(true);
        }
        
        // Scroll to bottom after loading messages
        setTimeout(() => {
          const c = messagesContainerRef.current;
          if (c) {
            c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
          }
          // Also try the messagesEndRef as backup
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }, 500);
      }
    } catch (error) {
    } finally {
      setIsLoadingSession(false);
    }
  }, [user, setMessages]);

  // Handle stop with error catching to prevent AbortError
  const handleStop = useCallback(() => {
    try {
      // Just call stop, the SDK should handle if there's nothing to stop
      stop();
    } catch (error) {
      // Silently ignore AbortError - this is expected behavior
      // The error occurs when stop() is called but there's no active stream
    }
  }, [stop]);

  // Initialize and handle sessionId prop changes
  useEffect(() => {
    if (sessionId !== currentSessionId) {
      if (sessionId) {
        // Update ref and load messages when sessionId prop has a value
        sessionIdRef.current = sessionId;
        loadSessionMessages(sessionId);
      } else if (!sessionIdRef.current) {
        // Only clear if we don't have a locally-created session
        // (if sessionIdRef has a value, it means handleSubmit just created a session
        // but the prop hasn't updated yet - don't clear in this case!)

        // Don't call stop() here - it causes AbortErrors
        // The SDK will handle cleanup when we clear messages

        // Clear everything for fresh start
        setCurrentSessionId(undefined);
        setMessages([]);
        setInput(''); // Clear input field
        setIsFormAtBottom(false); // Reset form position for new chat
        setEditingMessageId(null); // Clear any editing state
        setEditingText('');

        // Call parent's new chat handler if provided
        onNewChat?.();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]); // Only sessionId prop dependency - internal state changes should not retrigger this

  // Check rate limit status 
  useEffect(() => {
    setIsRateLimited(!canSendQuery);
  }, [canSendQuery]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768 || // 768px is the sm breakpoint in Tailwind
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
      // On mobile, always keep form at bottom
      if (isMobileDevice) {
        setIsFormAtBottom(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []); // Empty dependency array - only run on mount

  // Handle rate limit errors
  useEffect(() => {
    if (error) {
      
      // Check if it's a rate limit error
      if (error.message && (error.message.includes('RATE_LIMIT_EXCEEDED') || error.message.includes('429'))) {
        setIsRateLimited(true);
        try {
          // Try to extract reset time from error response
          const errorData = JSON.parse(error.message);
          const resetTime = errorData.resetTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          onRateLimitError?.(resetTime);
        } catch (e) {
          // Fallback: use default reset time (next day)
          const resetTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          onRateLimitError?.(resetTime);
        }
      }
    }
  }, [error]); // Remove onRateLimitError from dependencies to prevent infinite loops

  // Notify parent component about message state changes
  useEffect(() => {
    onMessagesChange?.(messages.length > 0);
  }, [messages.length]); // Remove onMessagesChange from dependencies to prevent infinite loops

  // Track page visibility to reduce re-renders in background
  const [isPageVisible, setIsPageVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsPageVisible(visible);

      if (document.hidden) {
        // Page is hidden (tab switched away) - stream continues in background
        console.log('[Chat Interface] Page hidden - reducing re-render frequency to prevent crash');
      } else {
        // Page is visible again (tab switched back)
        console.log('[Chat Interface] Page visible again - resuming normal updates');

        // Check if streaming was active
        if (status === 'submitted' || status === 'streaming') {
          console.log('[Chat Interface] Stream still active - UI will update with any buffered data');
        }
      }
    };

    // Set initial visibility
    setIsPageVisible(!document.hidden);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status]); // Re-attach listener when status changes


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const [anchorInView, setAnchorInView] = useState<boolean>(true);
  const [isAtBottomState, setIsAtBottomState] = useState<boolean>(true);
  const urlUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Tracks whether we should stick to bottom (true when user is at bottom)
  const shouldStickToBottomRef = useRef<boolean>(true);
  // Defer messages to keep input responsive during streaming
  // When page is hidden, aggressively defer to prevent memory buildup
  const deferredMessages = useDeferredValue(messages);
  // Use original messages when visible, deferred when hidden to reduce re-renders
  const displayMessages = isPageVisible ? messages : deferredMessages;
  // Lightweight virtualization for long threads
  const virtualizationEnabled = deferredMessages.length > 60;
  const [avgRowHeight, setAvgRowHeight] = useState<number>(140);
  const [visibleRange, setVisibleRange] = useState<{
    start: number;
    end: number;
  }>({ start: 0, end: 30 });
  const overscan = 8;
  // Use ref to track visible range and avoid infinite loop (critical fix for tab switching)
  const visibleRangeRef = useRef(visibleRange);
  useEffect(() => {
    visibleRangeRef.current = visibleRange;
  }, [visibleRange]);

  const updateVisibleRange = useCallback(() => {
    if (!virtualizationEnabled) return;
    const c = messagesContainerRef.current;
    if (!c) return;
    const minRow = 60;
    const rowH = Math.max(minRow, avgRowHeight);
    const containerH = c.clientHeight || 0;
    const start = Math.max(0, Math.floor(c.scrollTop / rowH) - overscan);
    const count = Math.ceil(containerH / rowH) + overscan * 2;
    const end = Math.min(deferredMessages.length, start + count);
    // Use ref to compare instead of state - prevents infinite loop
    if (start !== visibleRangeRef.current.start || end !== visibleRangeRef.current.end) {
      setVisibleRange({ start, end });
    }
  }, [
    virtualizationEnabled,
    avgRowHeight,
    overscan,
    deferredMessages.length,
    // Removed visibleRange.start and visibleRange.end - this was causing infinite loop
  ]);
  useEffect(() => {
    if (virtualizationEnabled) {
      setVisibleRange({ start: 0, end: Math.min(deferredMessages.length, 30) });
      requestAnimationFrame(updateVisibleRange);
    }
    // Removed updateVisibleRange from dependencies - prevents infinite loop
  }, [virtualizationEnabled, deferredMessages.length]);
  useEffect(() => {
    const onResize = () => updateVisibleRange();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - updateVisibleRange is stable now

  // Helper: detect if messages container scrolls or if page scroll is used
  const isContainerScrollable = () => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    return container.scrollHeight > container.clientHeight + 2;
  };

  // Load query from URL params on initial load (but not when starting new chat or submitting)
  useEffect(() => {
    if (isStartingNewChat) {
      setIsStartingNewChat(false);
      return;
    }

    // Skip URL sync when actively submitting to prevent race condition
    if (isSubmitting) {
      return;
    }

    const queryParam = searchParams.get("q");
    if (queryParam && messages.length === 0) {
      let decodedQuery = queryParam;
      try {
        decodedQuery = decodeURIComponent(queryParam);
      } catch (e) {
        // fallback: use raw queryParam
      }
      setInput(decodedQuery);
    } else if (!queryParam && messages.length === 0) {
      // Clear input if no query param and no messages (fresh start)
      setInput("");
    }
  }, [searchParams, messages.length, isStartingNewChat, isSubmitting]);

  // Clear submitting flag when message is added
  useEffect(() => {
    if (isSubmitting && messages.length > 0) {
      setIsSubmitting(false);
    }
  }, [messages.length, isSubmitting]);

  // Reset form position when all messages are cleared (except on mobile)
  useEffect(() => {
    if (messages.length === 0 && !isMobile) {
      setIsFormAtBottom(false);
    }
  }, [messages.length, isMobile]);

  // Live processing time tracker
  useEffect(() => {
    const isLoading = status === "submitted" || status === "streaming";

    if (isLoading && !queryStartTime) {
      // Start tracking when query begins
      setQueryStartTime(Date.now());
    } else if (!isLoading && queryStartTime) {
      // Capture final time before stopping
      const finalTime = Date.now() - queryStartTime;
      setLiveProcessingTime(finalTime);
      setQueryStartTime(null);

    }

    if (isLoading && queryStartTime) {
      // Update live timer every 100ms
      const interval = setInterval(() => {
        setLiveProcessingTime(Date.now() - queryStartTime);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [status, queryStartTime]);

  // Check if user is at bottom of scroll (container only)
  // Wrap in useCallback to prevent re-renders (doc line 1386)
  const isAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    const threshold = 5;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const atBottom = distanceFromBottom <= threshold;
    return atBottom;
  }, []);

  // Auto-scroll ONLY if already at bottom when new content arrives
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // ONLY auto-scroll if sticky is enabled AND streaming/submitted
    const isLoading = status === "submitted" || status === "streaming";
    if (isLoading && shouldStickToBottomRef.current) {
      // Small delay to let content render
      requestAnimationFrame(() => {
        const c = messagesContainerRef.current;
        if (c && c.scrollHeight > c.clientHeight + 1) {
          c.scrollTo({ top: c.scrollHeight, behavior: "smooth" });
        } else {
          const doc = document.scrollingElement || document.documentElement;
          const targetTop = doc.scrollHeight;
          window.scrollTo({ top: targetTop, behavior: "smooth" });
        }
      });
    } else {
    }
  }, [messages, status, isAtBottomState, anchorInView]);

  // Handle scroll events to track position and show/hide scroll button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      const atBottom = isAtBottom();
      setIsAtBottomState(atBottom);
      // Disable sticky when not at bottom; re-enable when at bottom
      shouldStickToBottomRef.current = atBottom;
      userHasInteracted.current = !atBottom;
      updateVisibleRange();
    };

    const handleWindowScroll = () => {};

    // Handle wheel events to immediately detect scroll intent
    const handleWheel = (e: WheelEvent) => {
      // If scrolling up, immediately disable auto-scroll
      if (e.deltaY < 0) {
        userHasInteracted.current = true;
        shouldStickToBottomRef.current = false;
      } else if (e.deltaY > 0) {
        // Check if we're at bottom after scrolling down
        setTimeout(() => {
          const atBottom = isAtBottom();
          if (atBottom) {
            userHasInteracted.current = false; // Reset if back at bottom
            shouldStickToBottomRef.current = true;
          }
        }, 50);
      }
    };

    // Also handle touch events for mobile
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const deltaY = touchStartY - touchY;

      if (deltaY > 10) {
        // Scrolling up
        userHasInteracted.current = true;
        shouldStickToBottomRef.current = false;
      }
    };

    // Add all event listeners
    container.addEventListener("scroll", handleScroll, { passive: true });
    container.addEventListener("wheel", handleWheel, { passive: true });
    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    // No window scroll listener needed when using container scrolling only

    // Also add to document level to catch all scroll attempts
    const handleGlobalWheel = (e: WheelEvent) => {
      const inContainer = container.contains(e.target as Node);
      if (inContainer) {
        if (e.deltaY < 0) {
          userHasInteracted.current = true;
          shouldStickToBottomRef.current = false;
        }
        return;
      }
    };

    document.addEventListener("wheel", handleGlobalWheel, { passive: true });

    // Force sticky autoscroll by default
    setIsAtBottomState(true);
    shouldStickToBottomRef.current = true;
    userHasInteracted.current = false;

    return () => {
      container.removeEventListener("scroll", handleScroll);
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("wheel", handleGlobalWheel);
      // No window scroll listener to remove
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - prevent infinite loop on tab switch

  // Observe bottom anchor visibility relative to the scroll container
  useEffect(() => {
    const container = messagesContainerRef.current;
    const anchor = bottomAnchorRef.current;
    if (!container || !anchor) return;

    const observer = new IntersectionObserver(
      ([entry]) => setAnchorInView(entry.isIntersecting),
      { root: container, threshold: 1.0 }
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

  // Scroll to bottom when user submits a message
  useEffect(() => {
    if (status === "submitted") {
      userHasInteracted.current = false; // Reset interaction flag for new message
      shouldStickToBottomRef.current = true; // Re-enable stickiness on new message
      // Always scroll to bottom when user sends a message
      setTimeout(() => {
        const c = messagesContainerRef.current;
        if (c) {
          c.scrollTo({ top: c.scrollHeight, behavior: "smooth" });
        }
      }, 100);
    }
  }, [status]);

  const handleSubmit = async (e: React.FormEvent, skipSignupPrompt = false) => {
    e.preventDefault();
    if (input.trim() && status === "ready") {
      // Check current rate limit status immediately before sending

      if (!canSendQuery) {
        // Rate limit exceeded - show dialog and don't send message or update URL
        setIsRateLimited(true);
        onRateLimitError?.(resetTime?.toISOString() || new Date().toISOString());
        return;
      }

      // Store the input to send
      const queryText = input.trim();

      // Show signup prompt for non-authenticated users on first message
      if (!user && messages.length === 0 && !skipSignupPrompt) {
        setShowSignupPrompt(true);
        return; // Don't send message yet
      }

      // Set submitting flag to prevent URL sync race condition
      setIsSubmitting(true);

      // Clear input immediately before sending to prevent any display lag
      setInput("");

      // Track user query submission
      track('User Query Submitted', {
        query: queryText,
        queryLength: queryText.length,
        messageCount: messages.length,
        remainingQueries: remaining ? remaining - 1 : 0
      });

      updateUrlWithQuery(queryText);
      // Move form to bottom when submitting (always true on mobile, conditional on desktop)
      if (!isFormAtBottom) {
        setIsFormAtBottom(true);
      }

      // Create session BEFORE sending message for proper usage tracking
      if (user && !currentSessionId && messages.length === 0) {
        try {
          const newSessionId = await createSession(queryText);
          if (newSessionId) {
            sessionIdRef.current = newSessionId;
            setCurrentSessionId(newSessionId);
            onSessionCreated?.(newSessionId);
          }
        } catch (error) {
          // Continue with message sending even if session creation fails
        }
      }

      // Increment rate limit for anonymous users (authenticated users handled server-side)
      if (!user && increment) {
        try {
          const result = await increment();
        } catch (error) {
          // Continue with message sending even if increment fails
        }
      }

      // Send message with sessionId available for usage tracking
      sendMessage({ text: queryText });
      
      // For authenticated users, trigger optimistic rate limit update
      if (user) {
        rateLimitMutation.mutate();
      }
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const newValue = e.target.value;
    setInput(newValue);

    // Debounce URL updates to avoid excessive history changes
    if (newValue.trim()) {
      if (urlUpdateTimeoutRef.current) {
        clearTimeout(urlUpdateTimeoutRef.current);
      }
      urlUpdateTimeoutRef.current = setTimeout(() => {
        updateUrlWithQuery(newValue);
      }, 500);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages(messages.filter((message) => message.id !== messageId));
  };

  const handleEditMessage = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (message && message.parts[0]?.type === "text") {
      setEditingMessageId(messageId);
      setEditingText(message.parts[0].text);
    }
  };

  const handleSaveEdit = (messageId: string) => {
    setMessages(
      messages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              parts: [{ type: "text" as const, text: editingText }],
            }
          : message
      )
    );
    setEditingMessageId(null);
    setEditingText("");
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  // Wrap in useCallback to prevent re-renders (doc line 625)
  const toggleToolExpansion = useCallback((toolId: string) => {
    setExpandedTools((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(toolId)) {
        newSet.delete(toolId);
      } else {
        newSet.add(toolId);
      }
      return newSet;
    });
  }, []);

  const toggleChartExpansion = useCallback((toolId: string) => {
    setExpandedTools((prev) => {
      const newSet = new Set(prev);
      const collapsedKey = `collapsed-${toolId}`;
      if (newSet.has(collapsedKey)) {
        newSet.delete(collapsedKey);
      } else {
        newSet.add(collapsedKey);
      }
      return newSet;
    });
  }, []);

  // Wrap in useCallback to prevent re-renders (doc line 619)
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here if desired
    } catch (err) {
    }
  }, []);

  // Track PDF download state
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  // Download professional PDF report with charts and citations
  const handleDownloadPDF = useCallback(async () => {
    if (!sessionIdRef.current) {
      return;
    }

    // Track PDF download
    track('PDF Download Started', {
      sessionId: sessionIdRef.current,
      messageCount: messages.length
    });

    setIsDownloadingPDF(true);

    try {

      // Call server-side PDF generation API
      const response = await fetch('/api/reports/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate PDF');
      }

      // Get PDF blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Get filename from response header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `report-${Date.now()}.pdf`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);


      track('PDF Downloaded', {
        sessionId: sessionIdRef.current,
        messageCount: messages.length,
      });
    } catch (err) {
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloadingPDF(false);
    }
  }, [messages]);

  const updateUrlWithQuery = (query: string) => {
    if (query.trim()) {
      const url = new URL(window.location.href);
      url.searchParams.set('q', query);
      // Preserve chatId if it exists
      if (sessionIdRef.current) {
        url.searchParams.set('chatId', sessionIdRef.current);
      }
      window.history.replaceState({}, "", url.toString());
    }
  };

  const setInputAndUpdateUrl = (query: string) => {
    setInput(query);
    updateUrlWithQuery(query);
  };

  const handlePromptClick = (query: string) => {
    // Clear input first for animation effect
    setInput("");
    updateUrlWithQuery(query);
    setIsStartingNewChat(false); // Reset flag since we're setting new content

    // Animate text appearing character by character
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= query.length) {
        setInput(query.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 4); // Adjust speed here (lower = faster)
  };

  const getMessageText = (message: PatentUIMessage) => {
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");
  };

  // Removed startNewChat function - using parent's handleNewChat via URL management

  const isLoading = status === "submitted" || status === "streaming";
  const canStop = status === "submitted" || status === "streaming";
  const canRegenerate =
    (status === "ready" || status === "error") && messages.length > 0;

  // Calculate cumulative metrics from all assistant messages
  const cumulativeMetrics = useMemo(() => {
    let totalMetrics: MessageMetrics = {
      sourcesAnalyzed: 0,
      wordsProcessed: 0,
      timeSavedMinutes: 0,
      moneySaved: 0,
      processingTimeMs: 0,
      breakdown: {
        sourceReadingMinutes: 0,
        sourceFindingMinutes: 0,
        writingMinutes: 0,
        csvCreationMinutes: 0,
        chartCreationMinutes: 0,
        analysisMinutes: 0,
        dataProcessingMinutes: 0,
      },
    };

    messages.filter(m => m.role === 'assistant').forEach(message => {
      // Extract message parts from different possible formats
      let messageParts: any[] = [];

      if (Array.isArray((message as any).content)) {
        messageParts = (message as any).content;
      } else if ((message as any).parts) {
        messageParts = (message as any).parts;
      }

      const messageMetrics = calculateMessageMetrics(messageParts);

      // Accumulate metrics
      totalMetrics.sourcesAnalyzed += messageMetrics.sourcesAnalyzed;
      totalMetrics.wordsProcessed += messageMetrics.wordsProcessed;
      totalMetrics.timeSavedMinutes += messageMetrics.timeSavedMinutes;
      totalMetrics.moneySaved += messageMetrics.moneySaved;

      // Accumulate processing time from message metadata
      if ((message as any).processing_time_ms || (message as any).processingTimeMs) {
        const msgProcessingTime = (message as any).processing_time_ms || (message as any).processingTimeMs || 0;
        totalMetrics.processingTimeMs += msgProcessingTime;
      }

      // Accumulate breakdown
      Object.keys(messageMetrics.breakdown).forEach((key) => {
        const breakdownKey = key as keyof typeof messageMetrics.breakdown;
        totalMetrics.breakdown[breakdownKey] += messageMetrics.breakdown[breakdownKey];
      });
    });

    // Add live processing time if currently loading
    if (liveProcessingTime > 0) {
      totalMetrics.processingTimeMs += liveProcessingTime;
    }

    return totalMetrics;
  }, [messages, liveProcessingTime]);

  return (
    <div className="w-full max-w-3xl mx-auto relative min-h-0">
      {/* Removed duplicate New Chat button - handled by parent page */}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className={`space-y-4 sm:space-y-8 min-h-[300px] overflow-y-auto overflow-x-hidden ${
          messages.length > 0 ? "pt-20 sm:pt-24" : "pt-2 sm:pt-4"
        } ${isFormAtBottom ? "pb-44 sm:pb-36" : "pb-4 sm:pb-8"}`}
      >
        {messages.length === 0 && (
          <motion.div
            className="pt-8 1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-6 sm:mb-8">
              {/* Capabilities */}
              <div className="max-w-4xl mx-auto">
                <motion.div
                  className="text-center mb-4 sm:mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                >
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Try these capabilities
                  </h3>
                </motion.div>

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 px-2 sm:px-0">
                  <motion.button
                    onClick={() =>
                      handlePromptClick(
                        "Map the competitive landscape for CRISPR base editing technologies filed 2020-2024. Analyze patents covering adenine and cytosine base editors, prime editing systems, and in vivo delivery methods. Create a CSV with assignees, filing trends, and technology clusters. Generate visualizations showing R&D velocity by institution and forecast which editing modalities will dominate clinical applications by 2027."
                      )
                    }
                    className="bg-muted/50 p-2.5 sm:p-4 rounded-xl border border-border hover:border-primary transition-colors hover:bg-muted text-left group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-foreground mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-foreground">
                      Gene Editing Intel
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">
                      CRISPR base editing competitive landscape
                    </div>
                  </motion.button>

                  <motion.button
                    onClick={() =>
                      handlePromptClick(
                        "Analyze SpaceX, Blue Origin, and Rocket Lab patent portfolios in reusable launch systems filed 2018-2024. Focus on rapid reusability, autonomous landing, and propulsion efficiency. Create charts showing: 1) Filing velocity and R&D investment signals, 2) Technology clustering around vertical landing vs horizontal recovery, 3) Citation network analysis to identify foundational patents. Calculate portfolio strength metrics and forecast which company will achieve lowest cost-per-kg to orbit by 2026."
                      )
                    }
                    className="bg-muted/50 p-2.5 sm:p-4 rounded-xl border border-border hover:border-primary transition-colors hover:bg-muted text-left group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-foreground mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-foreground">
                      Launch Systems R&D
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">
                      SpaceX vs Blue Origin vs Rocket Lab
                    </div>
                  </motion.button>

                  <motion.button
                    onClick={() =>
                      handlePromptClick(
                        "Find all patents covering AI-driven drug discovery platforms filed by major pharma companies 2021-2024. Search for: generative models for molecular design, protein structure prediction, binding affinity prediction, and ADMET optimization. Identify which companies are positioned to accelerate clinical candidates from discovery to Phase I trials. Create a competitive matrix showing technology readiness levels and forecast which platforms will produce FDA-approved drugs first."
                      )
                    }
                    className="bg-muted/50 p-2.5 sm:p-4 rounded-xl border border-border hover:border-primary transition-colors hover:bg-muted text-left group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-foreground mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-foreground">
                      AI Drug Discovery
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">
                      Accelerating R&D to clinical trials
                    </div>
                  </motion.button>

                  <motion.button
                    onClick={() =>
                      handlePromptClick(
                        "Search for patents covering neuromorphic computing and brain-computer interfaces filed 2020-2024. Focus on: spiking neural networks, memristor arrays, invasive and non-invasive BCIs, and signal processing for neural decoding. Identify blocking patents that would prevent commercial deployment of high-bandwidth BCIs. Generate a freedom-to-operate analysis for a startup building a speech neuroprosthetic device, including expiration dates and licensing opportunities."
                      )
                    }
                    className="bg-muted/50 p-2.5 sm:p-4 rounded-xl border border-border hover:border-primary transition-colors hover:bg-muted text-left group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-foreground mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-foreground">
                      BCI Freedom-to-Operate
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">
                      Neuromorphic computing & neural interfaces
                    </div>
                  </motion.button>

                  <motion.button
                    onClick={() =>
                      handlePromptClick(
                        "Map invalidating prior art for patent litigation involving quantum computing IP. Search for patents and publications pre-2016 covering: superconducting qubit designs, quantum error correction codes, and quantum gate implementations. Create comprehensive claim charts mapping prior art elements to asserted claims. Identify the strongest obviousness combinations and calculate litigation risk scores. Use this analysis to forecast settlement ranges and trial outcomes."
                      )
                    }
                    className="bg-muted/50 p-2.5 sm:p-4 rounded-xl border border-border hover:border-primary transition-colors hover:bg-muted text-left group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-foreground mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-foreground">
                      Patent Litigation Intel
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">
                      Invalidation search + claim charts + risk scoring
                    </div>
                  </motion.button>

                  <motion.button
                    onClick={() =>
                      handlePromptClick(
                        "Create comprehensive CSV of defense technology patents filed in 2024-2025 across all major assignees. Segment by: autonomous weapons systems, hypersonic propulsion, directed energy weapons, AI target recognition, electronic warfare, and swarming UAV coordination. Generate detailed plots showing patent concentration by technology area and assignee. Analyze filing trends to forecast emerging weapons development priorities and identify which nations are accelerating specific capabilities. Use citation analysis to map technology transfer between defense contractors."
                      )
                    }
                    className="bg-primary/10 p-2.5 sm:p-4 rounded-xl border border-primary hover:border-primary transition-colors hover:bg-primary/15 text-left group col-span-1 sm:col-span-2 lg:col-span-1"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-primary mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-primary">
                      Defense Tech Forecasting
                    </div>
                    <div className="text-[10px] sm:text-xs text-primary/80">
                      Weapons development trends + competitive intelligence
                    </div>
                  </motion.button>
                </div>

                <div className="mt-4 sm:mt-8">
                  <DataSourceLogos />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Input Form when not at bottom (desktop only) */}
        {!isFormAtBottom && messages.length === 0 && !isMobile && (
          <motion.div
            className="mt-8 mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            <div className="w-full max-w-3xl mx-auto px-4 sm:px-6">
              {/* Metrics Pills - connected to input box */}
              {messages.length > 0 && (
                <div className="mb-2">
                  <MetricsPills metrics={cumulativeMetrics} />
                </div>
              )}

              <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                <div className="bg-card rounded-2xl shadow-sm border border-border px-4 py-2.5 relative flex items-center">
                  <Textarea
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Ask a question..."
                    className="w-full resize-none border-0 px-0 py-2 pr-12 min-h-[36px] max-h-24 focus:ring-0 focus-visible:ring-0 bg-transparent overflow-y-auto text-base placeholder:text-muted-foreground shadow-none scrollbar-hide"
                    disabled={status === "error" || isLoading}
                    rows={1}
                    style={{ lineHeight: "1.5" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                  <Button
                    type={canStop ? "button" : "submit"}
                    onClick={canStop ? handleStop : undefined}
                    disabled={
                      !canStop &&
                      (isLoading || !input.trim() || status === "error")
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl h-8 w-8 p-0 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors"
                  >
                    {canStop ? (
                      <Square className="h-4 w-4" />
                    ) : isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 12l14 0m-7-7l7 7-7 7"
                        />
                      </svg>
                    )}
                  </Button>
                </div>
              </form>

              {/* Powered by Valyu */}
              <motion.div
                className="flex items-center justify-center mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.5 }}
              >
                <span className="text-xs text-muted-foreground">
                  Powered by
                </span>
                <a
                  href="https://platform.valyu.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center hover:scale-105 transition-transform"
                >
                  <Image
                    src="/valyu.svg"
                    alt="Valyu"
                    width={60}
                    height={60}
                    className="h-4 opacity-60 hover:opacity-100 transition-opacity cursor-pointer dark:invert"
                  />
                </a>
              </motion.div>
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={!virtualizationEnabled}>
          {(virtualizationEnabled
            ? deferredMessages
                .slice(visibleRange.start, visibleRange.end)
                .map((message, i) => ({
                  item: message,
                  realIndex: visibleRange.start + i,
                }))
            : displayMessages.map((m, i) => ({ item: m, realIndex: i }))
          ).map(({ item: message, realIndex }) => (
            <motion.div
              key={message.id}
              className="group"
              initial={
                virtualizationEnabled ? undefined : { opacity: 0, y: 20 }
              }
              animate={virtualizationEnabled ? undefined : { opacity: 1, y: 0 }}
              exit={virtualizationEnabled ? undefined : { opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {message.role === "user" ? (
                /* User Message */
                <div className="flex justify-end mb-4 sm:mb-6 px-3 sm:px-0">
                  <div className="max-w-[85%] sm:max-w-[80%] bg-muted rounded-2xl px-4 sm:px-4 py-3 sm:py-3 relative group shadow-sm">
                    {/* User Message Actions */}
                    <div className="absolute -left-8 sm:-left-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 sm:gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditMessage(message.id)}
                        className="h-6 w-6 p-0 bg-card rounded-full shadow-sm border border-border"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMessage(message.id)}
                        className="h-6 w-6 p-0 bg-card rounded-full shadow-sm border border-border text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {editingMessageId === message.id ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="min-h-[80px] border-border rounded-xl"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleSaveEdit(message.id)}
                            size="sm"
                            disabled={!editingText.trim()}
                            className="rounded-full"
                          >
                            Save
                          </Button>
                          <Button
                            onClick={handleCancelEdit}
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-foreground">
                        {message.parts.find((p) => p.type === "text")?.text}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Assistant Message */
                <div className="mb-6 sm:mb-8 group px-3 sm:px-0">
                  {editingMessageId === message.id ? null : (
                    <div className="space-y-5">
                      {(() => {
                        // Group consecutive reasoning steps together
                        // Note: This runs on every render, but it's a simple grouping operation
                        // The real performance fix is in removing expensive operations during input-available state
                        const groupedParts = groupMessageParts(message.parts);

                        // Count reasoning steps and tool calls
                        const reasoningSteps = groupedParts.filter(g => g.type === "reasoning-group").length;
                        const toolCalls = groupedParts.filter(g => g.type !== "reasoning-group" && g.part?.type?.startsWith("tool-")).length;
                        const totalActions = reasoningSteps + toolCalls;

                        // Calculate duration (if available in message metadata)
                        const hasTextOutput = groupedParts.some(g => g.part?.type === "text");
                        // A message is complete if it has text output AND either:
                        // 1. It's not the last message, OR
                        // 2. It's the last message and we're not currently loading
                        const isLastMessage = realIndex === messages.length - 1;
                        const messageIsComplete = hasTextOutput && (!isLastMessage || !isLoading);

                        // Show header if there's any reasoning/tool activity (not just text)
                        const hasActivity = groupedParts.some(g =>
                          g.type === "reasoning-group" || g.part?.type?.startsWith("tool-")
                        );

                        // Get the latest step info for display
                        const latestStep = groupedParts[groupedParts.length - 1];
                        let latestStepTitle = "";
                        let latestStepSubtitle = "";
                        let latestStepIcon = <Brain className="h-5 w-5" />;

                        if (latestStep) {
                          if (latestStep.type === "reasoning-group") {
                            // Get reasoning text - handle both single and multiple parts
                            const allText = latestStep.parts
                              .map((item: any) => item.part?.text || "")
                              .join("\n\n");
                            const lines = allText.split('\n').filter((l: string) => l.trim());

                            // Try to find a title (line with **)
                            const titleLine = lines.find((l: string) => l.match(/^\*\*.*\*\*$/));
                            if (titleLine) {
                              latestStepTitle = titleLine.replace(/\*\*/g, '').trim();
                              // Get lines after title as preview
                              const titleIndex = lines.indexOf(titleLine);
                              if (titleIndex >= 0 && titleIndex < lines.length - 1) {
                                latestStepSubtitle = lines
                                  .slice(titleIndex + 1, titleIndex + 3)
                                  .map((l: string) => l.trim())
                                  .filter((l: string) => !l.match(/^\*\*.*\*\*$/))
                                  .join(' ');
                              }
                            } else if (lines.length > 0) {
                              // No title found, use first line as title and next as subtitle
                              latestStepTitle = lines[0].trim();
                              if (lines.length > 1) {
                                latestStepSubtitle = lines.slice(1, 3).map((l: string) => l.trim()).join(' ');
                              }
                            } else {
                              latestStepTitle = "Thinking...";
                            }
                            latestStepIcon = <Brain className="h-5 w-5 text-primary" />;
                          } else if (latestStep.part?.type?.startsWith("tool-")) {
                            // Get tool name and details
                            const toolType = latestStep.part.type.replace("tool-", "");

                            if (toolType === "patentSearch") {
                              latestStepTitle = "Patent Search";
                              latestStepSubtitle = latestStep.part.input?.query || "...";
                              latestStepIcon = <Search className="h-5 w-5 text-primary" />;
                            } else if (toolType === "webSearch") {
                              latestStepTitle = "Web Search";
                              latestStepSubtitle = latestStep.part.input?.query || "...";
                              latestStepIcon = <Globe className="h-5 w-5 text-primary" />;
                            } else if (toolType === "codeExecution") {
                              latestStepTitle = "Code Execution";
                              latestStepSubtitle = latestStep.part.input?.description || "Running Python code";
                              latestStepIcon = <Code2 className="h-5 w-5 text-primary" />;
                            } else if (toolType === "createChart") {
                              latestStepTitle = "Creating Chart";
                              latestStepSubtitle = latestStep.part.output?.title || "Generating visualization";
                              latestStepIcon = <BarChart3 className="h-5 w-5 text-primary" />;
                            } else if (toolType === "createCSV") {
                              latestStepTitle = "Creating Table";
                              latestStepSubtitle = latestStep.part.output?.title || "Generating CSV data";
                              latestStepIcon = <Table className="h-5 w-5 text-primary" />;
                            } else {
                              latestStepTitle = toolType;
                              latestStepSubtitle = "";
                            }
                          }
                        }

                        // Filter to show only the latest step when trace is collapsed
                        // When collapsed: hide ALL reasoning/tool steps, only show text output
                        // When expanded: show all steps
                        const displayParts = isTraceExpanded
                          ? groupedParts
                          : groupedParts.filter(g => {
                              // Only show text parts when collapsed
                              if (g.type === "reasoning-group") return false;
                              if (g.part?.type?.startsWith("tool-")) return false;
                              return g.part?.type === "text";
                            });

                        return (
                          <>
                            {/* Trace Header - Show when there's any reasoning/tool activity */}
                            {hasActivity && (
                              <button
                                onClick={() => setIsTraceExpanded(!isTraceExpanded)}
                                className="w-full flex items-start gap-4 px-4 py-4 bg-gradient-to-br from-muted to-muted rounded-xl border border-border hover:border-border hover:shadow-sm transition-all mb-4 text-left group"
                              >
                                {/* Icon */}
                                <div className="flex-shrink-0 mt-0.5">
                                  {messageIsComplete ? (
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                      <Check className="h-5 w-5 text-primary" />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                      {latestStepIcon}
                                    </div>
                                  )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  {messageIsComplete ? (
                                    <>
                                      <div className="text-sm font-semibold text-foreground mb-1">
                                        Completed
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        Performed {totalActions} {totalActions === 1 ? 'action' : 'actions'}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="text-sm font-semibold text-foreground">
                                          {latestStepTitle || "Working..."}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                                          <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                                          <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                                        </div>
                                      </div>
                                      {latestStepSubtitle && (
                                        <div className="text-sm text-muted-foreground line-clamp-2">
                                          {latestStepSubtitle}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>

                                {/* Expand button */}
                                <div className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors mt-1">
                                  <span className="hidden sm:inline">
                                    {isTraceExpanded ? 'Hide' : 'Show'}
                                  </span>
                                  <ChevronDown className={`h-4 w-4 transition-transform ${isTraceExpanded ? 'rotate-180' : ''}`} />
                                </div>
                              </button>
                            )}

                            {displayParts.map((group, groupIndex) => {
                          if (group.type === "reasoning-group") {
                            // Render combined reasoning component
                            const combinedText = group.parts
                              .map((item: any) => item.part.text)
                              .join("\n\n");
                            const firstPart = group.parts[0].part;
                            // Only show as streaming if THIS specific part is actively streaming
                            const isStreaming = group.parts.some(
                              (item: any) => item.part.state === "streaming"
                            );

                            // Extract latest **title** and lines after it for live preview
                            let previewTitle = "";
                            let previewLines: string[] = [];

                            if (isStreaming && combinedText) {
                              const allLines = combinedText.split('\n').filter((l: string) => l.trim());

                              // Find the LATEST line that matches **text** pattern
                              let lastTitleIndex = -1;
                              for (let i = allLines.length - 1; i >= 0; i--) {
                                if (allLines[i].match(/^\*\*.*\*\*$/)) {
                                  lastTitleIndex = i;
                                  previewTitle = allLines[i].replace(/\*\*/g, ''); // Remove ** markers
                                  break;
                                }
                              }

                              // Get all lines after the latest title
                              if (lastTitleIndex !== -1 && lastTitleIndex < allLines.length - 1) {
                                previewLines = allLines.slice(lastTitleIndex + 1);
                              } else if (lastTitleIndex === -1 && allLines.length > 0) {
                                // No title found, just use all lines
                                previewLines = allLines;
                              }
                            }

                            return (
                              <React.Fragment key={`reasoning-group-${groupIndex}`}>
                                <ReasoningComponent
                                  part={{ ...firstPart, text: combinedText }}
                                  messageId={message.id}
                                  index={groupIndex}
                                  status={isStreaming ? "streaming" : "complete"}
                                  expandedTools={expandedTools}
                                  toggleToolExpansion={toggleToolExpansion}
                                />
                                {isStreaming && previewLines.length > 0 && (
                                  <LiveReasoningPreview
                                    title={previewTitle}
                                    lines={previewLines}
                                  />
                                )}
                              </React.Fragment>
                            );
                          } else {
                            // Render single part normally
                            const { part, index } = group;

                            switch (part.type) {
                              // Skip step-start markers (metadata from AI SDK)
                              case "step-start":
                                return null;

                              // Text parts
                              case "text":
                                // Use index directly instead of findIndex to avoid extra computation
                                return (
                                  <div
                                    key={index}
                                    className="prose prose-sm max-w-none dark:prose-invert"
                                  >
                                    <MemoizedTextPartWithCitations
                                      text={part.text}
                                      messageParts={message.parts}
                                      currentPartIndex={index}
                                      allMessages={deferredMessages}
                                      currentMessageIndex={realIndex}
                                      isAnimating={isLoading && realIndex === messages.length - 1}
                                    />
                                  </div>
                                );

                              // Skip individual reasoning parts as they're handled in groups
                              case "reasoning":
                                return null;

                              // Python Executor Tool
                              case "tool-codeExecution": {
                                const callId = part.toolCallId;
                                const isStreaming = part.state === "input-streaming" || part.state === "input-available";
                                const hasOutput = part.state === "output-available";
                                const hasError = part.state === "output-error";

                                if (hasError) {
                                  return (
                                    <div key={callId}>
                                      <TimelineStep
                                        part={part}
                                        messageId={message.id}
                                        index={index}
                                        status="error"
                                        type="tool"
                                        title="Python Execution Error"
                                        subtitle={part.errorText}
                                        icon={<AlertCircle />}
                                        expandedTools={expandedTools}
                                        toggleToolExpansion={toggleToolExpansion}
                                      />
                                    </div>
                                  );
                                }

                                const description = part.input?.description || "Executed Python code";

                                return (
                                  <div key={callId}>
                                    <TimelineStep
                                      part={part}
                                      messageId={message.id}
                                      index={index}
                                      status={isStreaming ? "streaming" : "complete"}
                                      type="tool"
                                      title="Code & Output"
                                      subtitle={description}
                                      icon={<Code2 />}
                                      expandedTools={expandedTools}
                                      toggleToolExpansion={toggleToolExpansion}
                                    >
                                      {hasOutput && (
                                        <MemoizedCodeExecutionResult
                                          code={part.input?.code || ""}
                                          output={part.output}
                                          actionId={callId}
                                          expandedTools={expandedTools}
                                          toggleToolExpansion={toggleToolExpansion}
                                        />
                                      )}
                                    </TimelineStep>
                                  </div>
                                );
                              }

                              // Web Search Tool
                              case "tool-webSearch": {
                                const callId = part.toolCallId;
                                const isStreaming = part.state === "input-streaming" || part.state === "input-available";
                                const hasResults = part.state === "output-available";
                                const hasError = part.state === "output-error";

                                if (hasError) {
                                  return (
                                    <div key={callId} className="my-1">
                                      <TimelineStep
                                        part={part}
                                        messageId={message.id}
                                        index={index}
                                        status="error"
                                        type="search"
                                        title="Web Search Error"
                                        subtitle={part.errorText}
                                        icon={<AlertCircle />}
                                        expandedTools={expandedTools}
                                        toggleToolExpansion={toggleToolExpansion}
                                      />
                                    </div>
                                  );
                                }

                                const webResults = hasResults ? extractSearchResults(part.output) : [];
                                const query = part.input?.query || "";

                                // Create favicon stack subtitle when complete
                                let subtitleContent: React.ReactNode = query;
                                if (!isStreaming && webResults.length > 0) {
                                  const displayResults = webResults.slice(0, 5);
                                  subtitleContent = (
                                    <div className="flex flex-col gap-1">
                                      <div className="text-xs text-muted-foreground">{query}</div>
                                      <div className="flex items-center gap-2">
                                        <div className="flex -space-x-2">
                                          {displayResults.map((result: any, idx: number) => (
                                            <div
                                              key={idx}
                                              className="w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center overflow-hidden"
                                              style={{ zIndex: 5 - idx }}
                                            >
                                              <Favicon url={result.url} size={12} className="w-3 h-3" />
                                            </div>
                                          ))}
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                          {webResults.length} results
                                        </span>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <div key={callId}>
                                    <TimelineStep
                                      part={part}
                                      messageId={message.id}
                                      index={index}
                                      status={isStreaming ? "streaming" : "complete"}
                                      type="search"
                                      title="Web Search"
                                      subtitle={subtitleContent}
                                      icon={<Globe />}
                                      expandedTools={expandedTools}
                                      toggleToolExpansion={toggleToolExpansion}
                                    >
                                      {hasResults && webResults.length > 0 && (
                                        <SearchResultsCarousel
                                          results={webResults}
                                          type="web"
                                        />
                                      )}
                                    </TimelineStep>
                                  </div>
                                );
                              }

                              // Patent Search Tool
                              case "tool-patentSearch": {
                                const callId = part.toolCallId;
                                const isStreaming = part.state === "input-streaming" || part.state === "input-available";
                                const hasResults = part.state === "output-available";
                                const hasError = part.state === "output-error";

                                if (hasError) {
                                  const errorMessage = part.errorText?.includes('JSON parsing failed')
                                    ? 'Search request was interrupted. Please try your query again.'
                                    : part.errorText;

                                  return (
                                    <div key={callId} className="my-1">
                                      <TimelineStep
                                        part={part}
                                        messageId={message.id}
                                        index={index}
                                        status="error"
                                        type="search"
                                        title="Patent Search Error"
                                        subtitle={errorMessage}
                                        icon={<AlertCircle />}
                                        expandedTools={expandedTools}
                                        toggleToolExpansion={toggleToolExpansion}
                                      />
                                    </div>
                                  );
                                }

                                const patentResults = hasResults ? extractSearchResults(part.output) : [];
                                const query = part.input?.query || "";

                                // Create USPTO logo stack subtitle when complete
                                let subtitleContent: React.ReactNode = query;
                                if (!isStreaming) {
                                  if (patentResults.length > 0) {
                                    const displayResults = patentResults.slice(0, 5);
                                    subtitleContent = (
                                      <div className="flex flex-col gap-1">
                                        <div className="text-xs text-muted-foreground">{query}</div>
                                        <div className="flex items-center gap-2">
                                          <div className="flex -space-x-2">
                                            {displayResults.map((result: any, idx: number) => (
                                              <div
                                                key={idx}
                                                className="w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center overflow-hidden p-0.5"
                                                style={{ zIndex: 5 - idx }}
                                              >
                                                <img
                                                  src="/assets/banner/uspto.png"
                                                  alt="USPTO"
                                                  className="w-full h-full object-contain"
                                                />
                                              </div>
                                            ))}
                                          </div>
                                          <span className="text-xs text-muted-foreground">
                                            {patentResults.length} results
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    // Show 0 results when complete but no results found
                                    subtitleContent = (
                                      <div className="flex flex-col gap-1">
                                        <div className="text-xs text-muted-foreground">{query}</div>
                                        <div className="text-xs text-muted-foreground">0 results</div>
                                      </div>
                                    );
                                  }
                                }

                                return (
                                  <div key={callId}>
                                    <TimelineStep
                                      part={part}
                                      messageId={message.id}
                                      index={index}
                                      status={isStreaming ? "streaming" : "complete"}
                                      type="search"
                                      title="Patent Search"
                                      subtitle={subtitleContent}
                                      icon={<Search />}
                                      expandedTools={expandedTools}
                                      toggleToolExpansion={toggleToolExpansion}
                                    >
                                      {hasResults && patentResults.length > 0 && (
                                        <SearchResultsCarousel
                                          results={patentResults}
                                          type="patent"
                                        />
                                      )}
                                    </TimelineStep>
                                  </div>
                                );
                              }

                              // Chart Creation Tool
                              case "tool-createChart": {
                                const callId = part.toolCallId;
                                const isStreaming = part.state === "input-streaming" || part.state === "input-available";
                                const hasOutput = part.state === "output-available";
                                const hasError = part.state === "output-error";

                                if (hasError) {
                                  return (
                                    <div key={callId}>
                                      <TimelineStep
                                        part={part}
                                        messageId={message.id}
                                        index={index}
                                        status="error"
                                        type="tool"
                                        title="Chart Creation Error"
                                        subtitle={part.errorText}
                                        icon={<AlertCircle />}
                                        expandedTools={expandedTools}
                                        toggleToolExpansion={toggleToolExpansion}
                                      />
                                    </div>
                                  );
                                }

                                const title = hasOutput && part.output?.title ? part.output.title : "Chart";

                                return (
                                  <div key={callId}>
                                    <TimelineStep
                                      part={part}
                                      messageId={message.id}
                                      index={index}
                                      status={isStreaming ? "streaming" : "complete"}
                                      type="tool"
                                      title={title}
                                      subtitle={hasOutput && part.output?.metadata ? `${part.output.metadata.totalSeries} series · ${part.output.metadata.totalDataPoints} points` : undefined}
                                      icon={<BarChart3 />}
                                      expandedTools={expandedTools}
                                      toggleToolExpansion={toggleToolExpansion}
                                    >
                                      {hasOutput && (
                                        <MemoizedChartResult
                                          chartData={part.output}
                                          actionId={callId}
                                          expandedTools={expandedTools}
                                          toggleToolExpansion={toggleToolExpansion}
                                        />
                                      )}
                                    </TimelineStep>
                                  </div>
                                );
                              }

                              // CSV Creation Tool
                              case "tool-createCSV": {
                                const callId = part.toolCallId;
                                const isStreaming = part.state === "input-streaming" || part.state === "input-available";
                                const hasOutput = part.state === "output-available";
                                const hasError = part.state === "output-error" || part.output?.error;

                                if (hasError) {
                                  return (
                                    <div key={callId}>
                                      <TimelineStep
                                        part={part}
                                        messageId={message.id}
                                        index={index}
                                        status="error"
                                        type="tool"
                                        title="CSV Creation Error"
                                        subtitle={part.output?.message || part.errorText}
                                        icon={<AlertCircle />}
                                        expandedTools={expandedTools}
                                        toggleToolExpansion={toggleToolExpansion}
                                      />
                                    </div>
                                  );
                                }

                                const title = hasOutput && part.output?.title ? part.output.title : "CSV Table";
                                const subtitle = hasOutput ? `${part.output.rowCount} rows · ${part.output.columnCount} columns` : undefined;

                                return (
                                  <div key={callId}>
                                    <TimelineStep
                                      part={part}
                                      messageId={message.id}
                                      index={index}
                                      status={isStreaming ? "streaming" : "complete"}
                                      type="tool"
                                      title={title}
                                      subtitle={subtitle}
                                      icon={<Table />}
                                      expandedTools={expandedTools}
                                      toggleToolExpansion={toggleToolExpansion}
                                    >
                                      {hasOutput && !part.output?.error && (
                                        <CSVPreview {...part.output} />
                                      )}
                                    </TimelineStep>
                                  </div>
                                );
                              }

                              // readFullPatent tool
                              case "tool-readFullPatent": {
                                const callId = `${message.id}-${index}`;

                                // Handle both string and object outputs
                                let parsedOutput = part.output;
                                if (typeof part.output === 'string') {
                                  try {
                                    parsedOutput = JSON.parse(part.output);
                                  } catch (e) {
                                    console.error('Failed to parse readFullPatent output:', e);
                                  }
                                }

                                const hasOutput = parsedOutput && typeof parsedOutput === 'object';
                                const isStreaming = part.state === "input-streaming" || part.state === "output-streaming";
                                const isSuccess = hasOutput && parsedOutput?.success === true;
                                const isError = hasOutput && parsedOutput?.error === true;

                                return (
                                  <div key={callId}>
                                    <TimelineStep
                                      part={part}
                                      messageId={message.id}
                                      index={index}
                                      status={isStreaming ? "streaming" : isError ? "error" : "complete"}
                                      type="tool"
                                      title="Read Full Patent"
                                      subtitle={isSuccess ? `Patent ${parsedOutput?.patentNumber || part.input?.patentIndex}` : undefined}
                                      icon={<FileText />}
                                      expandedTools={expandedTools}
                                      toggleToolExpansion={toggleToolExpansion}
                                    >
                                      {isError && (
                                        <div className="text-sm text-destructive p-3 bg-destructive/10 rounded">
                                          {parsedOutput.message || "Failed to retrieve patent"}
                                        </div>
                                      )}
                                      {isSuccess && (
                                        <div className="text-xs space-y-3">
                                          <div
                                            className="p-3 bg-muted/50 rounded cursor-pointer hover:bg-muted transition-colors border border-transparent hover:border-primary/30"
                                            onClick={() => {
                                              // Create patent object with full content from sections
                                              const fullContent = parsedOutput.sections
                                                ? Object.entries(parsedOutput.sections).map(([key, value]) => {
                                                    return `## ${key.charAt(0).toUpperCase() + key.slice(1)}\n\n${value}`;
                                                  }).join('\n\n')
                                                : '';

                                              setSelectedPatentFromTool({
                                                id: parsedOutput.patentNumber || parsedOutput.patentIndex,
                                                title: parsedOutput.title,
                                                url: parsedOutput.url,
                                                content: fullContent,
                                                fullContent: fullContent,
                                                metadata: parsedOutput.metadata,
                                                patentNumber: parsedOutput.patentNumber,
                                              });
                                            }}
                                          >
                                            <div className="font-semibold mb-2 text-foreground flex items-center gap-2">
                                              {parsedOutput.title || "Patent Details"}
                                              <span className="text-[10px] text-muted-foreground">(click to view)</span>
                                            </div>
                                            <div className="space-y-1 text-muted-foreground">
                                              {parsedOutput.patentNumber && (
                                                <div><span className="font-medium">Patent #:</span> {parsedOutput.patentNumber}</div>
                                              )}
                                              {parsedOutput.url && (
                                                <div><span className="font-medium">URL:</span> <a href={parsedOutput.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{parsedOutput.url}</a></div>
                                              )}
                                              {parsedOutput.sections && (
                                                <div><span className="font-medium">Sections Retrieved:</span> {Object.keys(parsedOutput.sections).join(', ')}</div>
                                              )}
                                            </div>
                                          </div>
                                          {parsedOutput.note && (
                                            <div className="text-[10px] text-muted-foreground italic p-2 bg-primary/5 rounded border border-primary/10">
                                              💡 {parsedOutput.note}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      {!isError && !isSuccess && hasOutput && (
                                        <div className="text-xs p-3 bg-muted/50 rounded">
                                          <div className="font-medium mb-2">Debug Output:</div>
                                          <pre className="text-[10px] overflow-x-auto whitespace-pre-wrap">
                                            {JSON.stringify(parsedOutput, null, 2)}
                                          </pre>
                                        </div>
                                      )}
                                    </TimelineStep>
                                  </div>
                                );
                              }

                              // Generic dynamic tool fallback (for future tools)
                              case "dynamic-tool":
                                return (
                                  <div
                                    key={index}
                                    className="mt-2 bg-primary/10 border border-primary/30 rounded p-2 sm:p-3"
                                  >
                                    <div className="flex items-center gap-2 text-primary mb-2">
                                      <Wrench className="h-4 w-4" />
                                      <span className="font-medium">
                                        Tool: {part.toolName}
                                      </span>
                                    </div>
                                    <div className="text-sm text-primary">
                                      {part.state === "input-streaming" && (
                                        <pre className="bg-primary/10 p-2 rounded text-xs">
                                          {JSON.stringify(part.input, null, 2)}
                                        </pre>
                                      )}
                                      {part.state === "output-available" && (
                                        <pre className="bg-primary/10 p-2 rounded text-xs">
                                          {JSON.stringify(part.output, null, 2)}
                                        </pre>
                                      )}
                                      {part.state === "output-error" && (
                                        <div className="text-destructive">
                                          Error: {part.errorText}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );

                              default:
                                // Show all other tools with generic display
                                if (part.type?.startsWith("tool-")) {
                                  const callId = `${message.id}-${index}`;
                                  return (
                                    <div key={callId}>
                                      <TimelineStep
                                        part={part}
                                        messageId={message.id}
                                        index={index}
                                        status={part.state === "output-error" ? "error" : "complete"}
                                        type="tool"
                                        title={part.toolName || "Tool"}
                                        icon={<Wrench />}
                                        expandedTools={expandedTools}
                                        toggleToolExpansion={toggleToolExpansion}
                                      >
                                        {part.state === "output-available" && part.output && (
                                          <pre className="text-xs bg-muted/50 p-3 rounded overflow-x-auto">
                                            {JSON.stringify(part.output, null, 2)}
                                          </pre>
                                        )}
                                        {part.state === "output-error" && (
                                          <div className="text-sm text-destructive p-3 bg-destructive/10 rounded">
                                            {part.errorText || "Tool execution failed"}
                                          </div>
                                        )}
                                      </TimelineStep>
                                    </div>
                                  );
                                }
                                return null;
                            }
                          }
                        })}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Message Actions - Professional Action Bar */}
                  {message.role === "assistant" && !isLoading && (
                    <div className="flex justify-end gap-2 mt-6 pt-4 mb-8 border-t border-border">
                      <button
                        onClick={() => copyToClipboard(getMessageText(message))}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </button>

                      {/* Show download button only for last message when session exists */}
                      {deferredMessages[deferredMessages.length - 1]?.id === message.id &&
                       sessionIdRef.current && (
                        subscription.canDownloadReports ? (
                          <button
                            onClick={handleDownloadPDF}
                            disabled={isDownloadingPDF}
                            className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-foreground bg-muted hover:bg-muted rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Download full report as PDF"
                          >
                            {isDownloadingPDF ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Generating...</span>
                              </>
                            ) : (
                              <>
                                <Download className="h-3.5 w-3.5" />
                                <span>Download Report</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => setShowAuthModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 border border-border rounded-lg transition-all hover:border-border hover:text-foreground group"
                            title="Sign in to download reports"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Download Report</span>
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded group-hover:bg-primary/15 transition-colors">
                              Sign in
                            </span>
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {virtualizationEnabled && (
          <>
            <div
              style={{ height: Math.max(0, visibleRange.start * avgRowHeight) }}
            />
            <div
              style={{
                height: Math.max(
                  0,
                  (deferredMessages.length - visibleRange.end) * avgRowHeight
                ),
              }}
            />
          </>
        )}

        {/* Coffee Loading Message */}
        <AnimatePresence>
          {status === "submitted" &&
            deferredMessages.length > 0 &&
            deferredMessages[deferredMessages.length - 1]?.role === "user" && (
              <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="flex items-start gap-2">
                  <div className="text-primary text-lg mt-0.5">
                    ☕
                  </div>
                  <div className="bg-primary/10 border border-primary/30 rounded-xl px-3 py-2 max-w-xs">
                    <div className="text-primary text-sm">
                      Just grabbing a coffee and contemplating the meaning of
                      life... ☕️
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
        <div ref={bottomAnchorRef} className="h-px w-full" />
      </div>

      {/* Gradient fade above input form */}
      <AnimatePresence>
        {(isFormAtBottom || isMobile) && (
          <>
            <motion.div
              className="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-3xl h-36 pointer-events-none z-45 bg-gradient-to-t from-background via-background/80 to-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </>
        )}
      </AnimatePresence>
      
      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">
              {error.message?.includes('PAYMENT_REQUIRED') ? 'Payment Setup Required' : 'Something went wrong'}
            </span>
          </div>
          <p className="text-destructive text-sm mt-1">
            {error.message?.includes('PAYMENT_REQUIRED') 
              ? 'You need to set up a payment method to use the pay-per-use plan. You only pay for what you use.'
              : 'Please check your API keys and try again.'
            }
          </p>
          <Button
            onClick={() => {
              if (error.message?.includes('PAYMENT_REQUIRED')) {
                // Redirect to subscription setup
                const url = `/api/checkout?plan=pay_per_use&redirect=${encodeURIComponent(window.location.href)}`;
                window.location.href = url;
              } else {
                window.location.reload();
              }
            }}
            variant="outline"
            size="sm"
            className="mt-2 text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            {error.message?.includes('PAYMENT_REQUIRED') ? (
              <>
                <span className="mr-1">💳</span>
                Setup Payment
              </>
            ) : (
              <>
                <RotateCcw className="h-3 w-3 mr-1" />
                Retry
              </>
            )}
          </Button>
        </div>
      )}

      {/* Input Form at bottom */}
      <AnimatePresence>
        {(isFormAtBottom || isMobile) && (
          <motion.div
            className="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-3xl px-3 sm:px-6 pt-4 pb-5 sm:pb-6 z-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Metrics Pills - connected to input box */}
            {messages.length > 0 && (
              <div className="mb-2">
                <MetricsPills metrics={cumulativeMetrics} />
              </div>
            )}

            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
              <div className="bg-card rounded-2xl shadow-sm border border-border px-4 py-2.5 relative flex items-center">
                <Textarea
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask a question..."
                  className="w-full resize-none border-0 px-0 py-2 pr-12 min-h-[36px] max-h-24 focus:ring-0 focus-visible:ring-0 bg-transparent overflow-y-auto text-base placeholder:text-muted-foreground shadow-none scrollbar-hide"
                  disabled={status === "error" || isLoading}
                  rows={1}
                  style={{ lineHeight: "1.5", paddingTop: "0.5rem", paddingBottom: "0.5rem" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <Button
                  type={canStop ? "button" : "submit"}
                  onClick={canStop ? handleStop : undefined}
                  disabled={
                    !canStop &&
                    (isLoading || !input.trim() || status === "error")
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl h-8 w-8 p-0 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors"
                >
                    {canStop ? (
                      <Square className="h-4 w-4" />
                    ) : isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 12l14 0m-7-7l7 7-7 7"
                        />
                      </svg>
                    )}
                  </Button>
                </div>
              </form>

            {/* Mobile Bottom Bar - Social links and disclaimer below input */}
            <motion.div 
              className="block sm:hidden mt-4 pt-3 border-t border-border"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              <div className="flex flex-col items-center space-y-3">
                <div className="flex items-center justify-center space-x-4">
                  <SocialLinks />
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  Not financial advice.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rate Limit Banner */}
      <RateLimitBanner />

      {/* Auth Modal for Paywalls */}
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Signup Prompt Dialog for non-authenticated users */}
      <Dialog open={showSignupPrompt} onOpenChange={setShowSignupPrompt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">
              Sign up to save your chat
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              Create a free account to save your chat history and access it anytime.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-6">
            <button
              onClick={() => {
                setShowSignupPrompt(false);
                setShowAuthModal(true);
              }}
              className="w-full px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-all"
            >
              Sign up (free)
            </button>
            <button
              onClick={(e) => {
                setShowSignupPrompt(false);
                // Submit with skip flag to bypass the signup prompt
                handleSubmit(e as any, true);
              }}
              className="w-full px-4 py-2.5 bg-transparent border border-border text-foreground font-medium rounded-lg hover:bg-muted transition-all"
            >
              Continue without account
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Model Compatibility Dialog */}
      <ModelCompatibilityDialog
        open={!!modelCompatibilityError}
        onClose={() => {
          setModelCompatibilityError(null);
          setPendingMessage(null);
        }}
        onContinue={() => {
          // TODO: Implement retry without tools
          setModelCompatibilityError(null);
          setPendingMessage(null);
        }}
        error={modelCompatibilityError?.message || ''}
        modelName={selectedModel || undefined}
      />

      {/* Patent Details Panel - Shows when a patent from readFullPatent tool is clicked */}
      {selectedPatentFromTool && (
        <div className="fixed inset-y-0 right-0 w-[500px] bg-card border-l border-border shadow-2xl z-50 animate-in slide-in-from-right duration-300">
          <PatentDetailsPanel
            patent={{
              id: selectedPatentFromTool.id,
              title: selectedPatentFromTool.title,
              url: selectedPatentFromTool.url,
              content: selectedPatentFromTool.fullContent || selectedPatentFromTool.content || '',
              publication_date: selectedPatentFromTool.publication_date || selectedPatentFromTool.publicationDate,
              metadata: selectedPatentFromTool.metadata,
              relevance_score: selectedPatentFromTool.relevance_score,
              abstract: selectedPatentFromTool.abstract,
              patentNumber: selectedPatentFromTool.patentNumber,
              patentIndex: selectedPatentFromTool.patentIndex,
              assignees: selectedPatentFromTool.assignees,
              filingDate: selectedPatentFromTool.filingDate,
              publicationDate: selectedPatentFromTool.publicationDate,
              claimsCount: selectedPatentFromTool.claimsCount,
              fullContentCached: selectedPatentFromTool.fullContentCached,
            }}
            onClose={() => setSelectedPatentFromTool(null)}
          />
        </div>
      )}
    </div>
  );
}
