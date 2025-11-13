import { z } from "zod";
import { tool } from "ai";
import { Valyu } from "valyu-js";
import { track } from "@vercel/analytics/server";
import { PolarEventTracker } from '@/lib/polar-events';
import { Daytona } from '@daytonaio/sdk';
import { createClient } from '@/utils/supabase/server';
import * as db from '@/lib/db';
import { randomUUID } from 'crypto';

export const healthcareTools = {
  // Chart Creation Tool - Create interactive charts for patent analytics and visualization
  createChart: tool({
    description: `Create interactive charts for patent analytics, competitive intelligence, and technology landscape visualization.

    CHART TYPES:
    1. "line" - Time series trends (patent filings over time, citation trends, technology evolution)
    2. "bar" - Categorical comparisons (top assignees, inventor productivity, classification breakdown)
    3. "area" - Cumulative data (patent portfolio growth, market share evolution)
    4. "scatter" - Positioning maps (technology landscapes, patent strength vs market size)
    5. "quadrant" - 2x2 matrices (patent strength vs commercial value, FTO risk assessment)

    TIME SERIES CHARTS (line, bar, area):
    {
      "title": "Google vs Microsoft AI Patent Filings 2020-2024",
      "type": "line",
      "xAxisLabel": "Year",
      "yAxisLabel": "Number of Patents Filed",
      "dataSeries": [
        {
          "name": "Google",
          "data": [
            {"x": "2020", "y": 245},
            {"x": "2021", "y": 312},
            {"x": "2022", "y": 398},
            {"x": "2023", "y": 456},
            {"x": "2024", "y": 521}
          ]
        },
        {
          "name": "Microsoft",
          "data": [
            {"x": "2020", "y": 198},
            {"x": "2021", "y": 267},
            {"x": "2022", "y": 334},
            {"x": "2023", "y": 401},
            {"x": "2024", "y": 467}
          ]
        }
      ]
    }

    SCATTER/BUBBLE CHARTS (for positioning, correlation):
    Each SERIES represents a CATEGORY (for color coding).
    Each DATA POINT represents an individual entity with x, y, size, and label.
    {
      "title": "Battery Technology Patents: Innovation vs Market Impact",
      "type": "scatter",
      "xAxisLabel": "Citation Count (Innovation Impact)",
      "yAxisLabel": "Forward Citations (Market Relevance)",
      "dataSeries": [
        {
          "name": "Solid-State Batteries",
          "data": [
            {"x": 85, "y": 142, "size": 5000, "label": "US 11,234,567 (QuantumScape)"},
            {"x": 67, "y": 98, "size": 4500, "label": "US 11,123,456 (Samsung)"}
          ]
        },
        {
          "name": "Lithium-Ion",
          "data": [
            {"x": 124, "y": 203, "size": 8000, "label": "US 10,555,123 (Tesla)"}
          ]
        }
      ]
    }

    QUADRANT CHARTS (2x2 clinical matrix):
    Same as scatter, but with reference lines dividing chart into 4 quadrants.
    Use for: Risk stratification, treatment selection, drug prioritization.

    CRITICAL: ALL REQUIRED FIELDS MUST BE PROVIDED.`,
    inputSchema: z.object({
      title: z
        .string()
        .describe('Chart title (e.g., "Pembrolizumab vs Nivolumab Response Rates")'),
      type: z
        .enum(["line", "bar", "area", "scatter", "quadrant"])
        .describe(
          'Chart type: "line" (time series), "bar" (comparisons), "area" (cumulative), "scatter" (positioning/correlation), "quadrant" (2x2 matrix)'
        ),
      xAxisLabel: z
        .string()
        .describe('X-axis label (e.g., "Weeks", "Response Rate (%)", "Risk Score (1-10)")'),
      yAxisLabel: z
        .string()
        .describe(
          'Y-axis label (e.g., "Survival Probability", "Adverse Events (%)", "Efficacy Score (1-10)")'
        ),
      dataSeries: z
        .array(
          z.object({
            name: z
              .string()
              .describe(
                'Series name - For time series: drug/treatment name. For scatter/quadrant: category name for color coding (e.g., "Checkpoint Inhibitors", "Chemotherapy")'
              ),
            data: z
              .array(
                z.object({
                  x: z
                    .union([z.string(), z.number()])
                    .describe(
                      'X-axis value - Date/time string for time series, numeric value for scatter/quadrant'
                    ),
                  y: z
                    .number()
                    .describe(
                      "Y-axis numeric value - response rate, survival %, score, etc. REQUIRED for all chart types."
                    ),
                  size: z
                    .number()
                    .optional()
                    .describe(
                      'Bubble size for scatter/quadrant charts (e.g., patient count, trial size, market size). Larger = bigger bubble.'
                    ),
                  label: z
                    .string()
                    .optional()
                    .describe(
                      'Individual entity name for scatter/quadrant charts (e.g., "Pembrolizumab", "Patient Cohort A"). Displayed on/near bubble.'
                    ),
                })
              )
              .describe(
                "Array of data points. For time series: {x: date, y: value}. For scatter/quadrant: {x, y, size, label}."
              ),
          })
        )
        .describe(
          "REQUIRED: Array of data series. For scatter/quadrant: each series = category for color coding, each point = individual entity"
        ),
      description: z
        .string()
        .optional()
        .describe("Optional description explaining what the chart shows"),
    }),
    execute: async ({
      title,
      type,
      xAxisLabel,
      yAxisLabel,
      dataSeries,
      description,
    }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;

      // Calculate metadata based on chart type
      let dateRange = null;
      if (type === 'scatter' || type === 'quadrant') {
        // For scatter/quadrant charts, show x and y axis ranges
        const allXValues = dataSeries.flatMap(s => s.data.map(d => Number(d.x)));
        const allYValues = dataSeries.flatMap(s => s.data.map(d => d.y ?? 0));
        if (allXValues.length > 0 && allYValues.length > 0) {
          dateRange = {
            start: `X: ${Math.min(...allXValues).toFixed(1)}-${Math.max(...allXValues).toFixed(1)}`,
            end: `Y: ${Math.min(...allYValues).toFixed(1)}-${Math.max(...allYValues).toFixed(1)}`,
          };
        }
      } else {
        // For time series charts, show date/label range
        if (dataSeries.length > 0 && dataSeries[0].data.length > 0) {
          dateRange = {
            start: dataSeries[0].data[0].x,
            end: dataSeries[0].data[dataSeries[0].data.length - 1].x,
          };
        }
      }

      await track('Chart Created', {
        chartType: type,
        title: title,
        seriesCount: dataSeries.length,
        totalDataPoints: dataSeries.reduce((sum, series) => sum + series.data.length, 0),
        hasDescription: !!description,
        hasScatterData: dataSeries.some(s => s.data.some(d => d.size || d.label)),
      });

      const chartData = {
        chartType: type,
        title,
        xAxisLabel,
        yAxisLabel,
        dataSeries,
        description,
        metadata: {
          totalSeries: dataSeries.length,
          totalDataPoints: dataSeries.reduce((sum, series) => sum + series.data.length, 0),
          dateRange,
        },
      };

      // Save chart to database
      let chartId: string | null = null;
      try {
        chartId = randomUUID();
        const insertData: any = {
          id: chartId,
          session_id: sessionId || null,
          chart_data: chartData,
        };

        if (userId) {
          insertData.user_id = userId;
        } else {
          insertData.anonymous_id = 'anonymous';
        }

        await db.createChart(insertData);
      } catch (error) {
        console.error('[createChart] Error saving chart:', error);
        chartId = null;
      }

      return {
        ...chartData,
        chartId: chartId || undefined,
        imageUrl: chartId ? `/api/charts/${chartId}/image` : undefined,
      };
    },
  }),

  // CSV Creation Tool - Generate downloadable CSV files for patent data and analysis
  createCSV: tool({
    description: `Create downloadable CSV files for patent search results, competitive analysis, and portfolio reports.

    USE CASES:
    - Export patent search results (prior art, FTO analysis)
    - Create competitive comparison tables (patent portfolios, filing trends)
    - Generate technology landscape data (classification breakdown, assignee analysis)
    - Build citation analysis tables (forward/backward citations, impact metrics)
    - Create custom patent reports (portfolio valuation, litigation analysis, licensing targets)

    REFERENCING CSVs IN MARKDOWN:
    After creating a CSV, you MUST reference it in your markdown response to display it as an inline table.

    CRITICAL - Use this EXACT format:
    ![csv](csv:csvId)

    Where csvId is the ID returned in the tool response.

    Example:
    - Tool returns: { csvId: "abc-123-def-456", ... }
    - In your response: "Here is the data:\n\n![csv](csv:abc-123-def-456)\n\n"

    The CSV will automatically render as a formatted markdown table. Do NOT use link syntax [text](csv:id), ONLY use image syntax ![csv](csv:id).

    IMPORTANT GUIDELINES:
    - Use descriptive column headers
    - Include units in headers when applicable (e.g., "Concentration (mg/L)", "Response Rate (%)")
    - Format numbers appropriately (use consistent decimal places)
    - Add a title/description to explain the data
    - Organize data logically (chronological, by treatment group, or by significance)

    EXAMPLE - Patent Portfolio Comparison:
    {
      "title": "AI Patents - Top Tech Companies 2020-2024",
      "description": "Patent filing activity and portfolio strength metrics",
      "headers": ["Company", "Total Patents", "Avg Citations", "Grant Rate (%)", "Top CPC Class", "Portfolio Value Est."],
      "rows": [
        ["Google", "2,456", "18.7", "82", "G06N3/08", "$850M"],
        ["Microsoft", "2,103", "15.2", "79", "G06N5/00", "$720M"],
        ["IBM", "1,987", "22.3", "85", "G06N20/00", "$680M"],
        ["Amazon", "1,654", "14.8", "76", "G06N3/04", "$590M"]
      ]
    }

    EXAMPLE - Prior Art Search Results:
    {
      "title": "Prior Art Search - Transformer Neural Networks",
      "description": "Most relevant patents identified for patentability assessment",
      "headers": ["Patent Number", "Title", "Assignee", "Filing Date", "Relevance", "Status"],
      "rows": [
        ["US 11,234,567", "Attention-based sequence processing", "Google", "2019-03-15", "95%", "Active"],
        ["US 10,987,654", "Neural machine translation system", "Microsoft", "2018-11-22", "88%", "Active"],
        ["US 11,456,789", "Self-attention mechanism for NLP", "Meta", "2020-01-08", "82%", "Active"]
      ]
    }

    EXAMPLE - Technology Landscape Analysis:
    {
      "title": "CRISPR Gene Editing Patents - Filing Trends",
      "description": "Annual patent filings by top assignees (2018-2024)",
      "headers": ["Year", "Broad Institute", "UC Berkeley", "Editas Medicine", "CRISPR Therapeutics", "Total"],
      "rows": [
        ["2018", "42", "38", "27", "31", "138"],
        ["2019", "51", "45", "34", "39", "169"],
        ["2020", "68", "52", "41", "48", "209"],
        ["2021", "79", "61", "53", "57", "250"],
        ["2022", "87", "69", "62", "64", "282"],
        ["2023", "94", "74", "71", "73", "312"],
        ["2024", "103", "81", "79", "82", "345"]
      ]
    }

    The CSV will be rendered as an interactive table with download capability.`,
    inputSchema: z.object({
      title: z.string().describe("Title for the CSV file (will be used as filename)"),
      description: z.string().optional().describe("Optional description of the data"),
      headers: z.array(z.string()).describe("Column headers for the CSV"),
      rows: z.array(z.array(z.string())).describe("Data rows - each row is an array matching the headers"),
    }),
    execute: async ({ title, description, headers, rows }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;

      try {
        // Validate that all rows have the same number of columns as headers
        const headerCount = headers.length;
        const invalidRows = rows.filter(row => row.length !== headerCount);

        if (invalidRows.length > 0) {
          return {
            error: true,
            message: `❌ **CSV Validation Error**: All rows must have ${headerCount} columns to match headers. Found ${invalidRows.length} invalid row(s). Please regenerate the CSV with matching column counts.`,
            title,
            headers,
            expectedColumns: headerCount,
            invalidRowCount: invalidRows.length,
          };
        }

        // Generate CSV content
        const csvContent = [
          headers.join(','),
          ...rows.map(row =>
            row.map(cell => {
              // Escape cells that contain commas, quotes, or newlines
              if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                return `"${cell.replace(/"/g, '""')}"`;
              }
              return cell;
            }).join(',')
          )
        ].join('\n');

        // Save CSV to database
        let csvId: string | null = null;
        try {
          csvId = randomUUID();

          const insertData: any = {
            id: csvId,
            session_id: sessionId || null,
            title,
            description: description || undefined,
            headers,
            rows: rows,
          };

          if (userId) {
            insertData.user_id = userId;
          } else {
            insertData.anonymous_id = 'anonymous';
          }

          await db.createCSV(insertData);
        } catch (error) {
          console.error('[createCSV] Error saving CSV:', error);
          csvId = null;
        }

        // Track CSV creation
        await track('CSV Created', {
          title: title,
          rowCount: rows.length,
          columnCount: headers.length,
          hasDescription: !!description,
          savedToDb: !!csvId,
        });

        const result = {
          title,
          description,
          headers,
          rows,
          csvContent,
          rowCount: rows.length,
          columnCount: headers.length,
          csvId: csvId || undefined,
          csvUrl: csvId ? `/api/csvs/${csvId}` : undefined,
          _instructions: csvId
            ? `IMPORTANT: Include this EXACT line in your markdown response to display the table:\n\n![csv](csv:${csvId})\n\nDo not write [View Table] or any other text - use the image syntax above.`
            : undefined,
        };

        return result;
      } catch (error: any) {
        return {
          error: true,
          message: `❌ **CSV Creation Error**: ${error.message || 'Unknown error occurred'}`,
          title,
        };
      }
    },
  }),

  codeExecution: tool({
    description: `Execute Python code securely in a Daytona Sandbox for patent analytics, statistical analysis, and technology landscape visualization.

    CRITICAL: Always include print() statements to show results. Maximum 10,000 characters.

    USE CASES:
    - Patent filing trend analysis
    - Citation network metrics (centrality, PageRank)
    - Technology clustering and classification
    - Competitive portfolio comparison
    - Patent lifetime and expiration calculations
    - Statistical analysis of patent data

    Example for patent analytics:
    # Calculate patent portfolio strength score
    import statistics
    citation_counts = [15, 23, 8, 42, 19, 31, 12]
    avg_citations = statistics.mean(citation_counts)
    max_citations = max(citation_counts)
    portfolio_strength = (avg_citations * 0.7) + (max_citations * 0.3)
    print(f"Average citations per patent: {avg_citations:.1f}")
    print(f"Portfolio strength score: {portfolio_strength:.1f}")`,
    inputSchema: z.object({
      code: z.string().describe('Python code to execute - MUST include print() statements'),
      description: z.string().optional().describe('Brief description of the calculation'),
    }),
    execute: async ({ code, description }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';

      const startTime = Date.now();

      try {
        if (code.length > 10000) {
          return '🚫 **Error**: Code too long. Please limit your code to 10,000 characters.';
        }

        const daytonaApiKey = process.env.DAYTONA_API_KEY;
        if (!daytonaApiKey) {
          return '❌ **Configuration Error**: Daytona API key is not configured.';
        }

        const daytona = new Daytona({
          apiKey: daytonaApiKey,
          serverUrl: process.env.DAYTONA_API_URL,
          target: (process.env.DAYTONA_TARGET as any) || undefined,
        });

        let sandbox: any | null = null;
        try {
          sandbox = await daytona.create({ language: 'python' });
          const execution = await sandbox.process.codeRun(code);
          const executionTime = Date.now() - startTime;

          await track('Python Code Executed', {
            success: execution.exitCode === 0,
            codeLength: code.length,
            executionTime: executionTime,
            hasDescription: !!description,
          });

          if (userId && sessionId && userTier === 'pay_per_use' && execution.exitCode === 0 && !isDevelopment) {
            try {
              const polarTracker = new PolarEventTracker();
              await polarTracker.trackDaytonaUsage(userId, sessionId, executionTime, {
                codeLength: code.length,
                success: true,
                description: description || 'Code execution'
              });
            } catch (error) {
              console.error('[CodeExecution] Failed to track usage:', error);
            }
          }

          if (execution.exitCode !== 0) {
            return `❌ **Execution Error**: ${execution.result || 'Unknown error'}`;
          }

          return `🐍 **Python Code Execution**
${description ? `**Description**: ${description}\n` : ''}

\`\`\`python
${code}
\`\`\`

**Output:**
\`\`\`
${execution.result || '(No output produced)'}
\`\`\`

⏱️ **Execution Time**: ${executionTime}ms`;

        } finally {
          try {
            if (sandbox) {
              await sandbox.delete();
            }
          } catch (cleanupError) {
            console.error('[CodeExecution] Cleanup error:', cleanupError);
          }
        }
      } catch (error: any) {
        return `❌ **Error**: ${error.message || 'Unknown error occurred'}`;
      }
    },
  }),

  patentSearch: tool({
    description: `Search patent databases using Valyu's specialized, semantic patent search. Use this tool for ALL patent-related queries.

    IMPORTANT: Use simple, natural language queries. The search is extremely powerful and understands context, companies, technologies, and time periods without special syntax.

    EXAMPLE QUERIES (just use natural language!):
    - "Google AI patents 2024"
    - "Microsoft machine learning patents 2020-2024"
    - "Tesla battery technology patents"
    - "OpenAI transformer neural network patents"
    - "Patents similar to neural network classification"
    - "CRISPR gene editing patents"
    - "quantum computing patents filed by IBM"
    - "solid-state battery patents 2015-2024"
    - "drug delivery system patents"

    The search automatically understands:
    - Company names (Google, Microsoft, Tesla, etc.)
    - Technology areas (AI, ML, CRISPR, quantum, batteries, etc.)
    - Time periods (2024, 2020-2024, recent, last 5 years, etc.)
    - Patent types and status
    - Inventors and assignees
    - Technical concepts and classifications

    RESULTS INCLUDE:
    - Patent number, title, abstract
    - Assignee (owner: company/university/individual)
    - Inventors, filing date, grant date, priority date
    - Patent status (active, expired, pending, abandoned)
    - CPC/IPC classification codes
    - Full claims text
    - Citation data (forward and backward citations)`,
    inputSchema: z.object({
      query: z.string().describe('Natural language patent search query (e.g., "Google AI patents 2024", "Tesla battery patents 2020-2024")'),
      maxResults: z.number().min(1).max(20).optional().default(10).describe('Number of results (default: 10, max: 20)'),
    }),
    execute: async ({ query, maxResults }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';

      try {
        const apiKey = process.env.VALYU_API_KEY;
        if (!apiKey) {
          return "❌ Valyu API key not configured.";
        }
        const valyu = new Valyu(apiKey, "https://api.valyu.ai/v1");

        // Ensure maxNumResults is within API limits (1-20)
        const clampedMaxResults = Math.min(Math.max(maxResults || 10, 1), 20);

        const response = await valyu.search(query, {
          maxNumResults: clampedMaxResults,
          includedSources: ["valyu/valyu-patents"]
        });

        console.log("response", response);

        await track("Valyu API Call", {
          toolType: "patentSearch",
          query: query,
          resultCount: response?.results?.length || 0,
        });

        if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
          try {
            const polarTracker = new PolarEventTracker();
            const valyuCostDollars = (response as any)?.total_deduction_dollars || 0;
            await polarTracker.trackValyuAPIUsage(userId, sessionId, "patentSearch", valyuCostDollars, {
              query,
              resultCount: response?.results?.length || 0,
              success: true,
            });
          } catch (error) {
            console.error('[PatentSearch] Failed to track usage:', error);
          }
        }

        // Cache full patent content and return truncated results
        const { extractPatentAbstract, parsePatentMetadata, extractPatentNumber } = await import('./patent-utils');
        const { cachePatent, clearPatentIndices } = await import('./db');

        // CRITICAL: Clear old indices before caching new search results
        // This ensures readFullPatent always retrieves from the MOST RECENT search
        if (sessionId) {
          console.log('[PatentSearch] Clearing old patent indices for session:', sessionId.substring(0, 8));
          await clearPatentIndices(sessionId);
          // Note: Patent cache cleanup is handled by Vercel Cron every hour (see vercel.json)
        }

        const truncatedResults = await Promise.all(
          (response?.results || []).map(async (patent: any, index: number) => {
            // Extract abstract and metadata
            const abstract = extractPatentAbstract(patent.content);
            const metadata = parsePatentMetadata(patent.content);
            const patentNumber = extractPatentNumber(patent.content, patent.title);

            // Cache full patent content if we have a session
            // NOTE: Caches ALL unique patents (by patent_number) across multiple searches
            // If the same patent appears in multiple searches, updates expires_at to extend cache
            if (sessionId) {
              try {
                console.log(`[PatentSearch] Caching patent ${index}: ${patentNumber} for session ${sessionId.substring(0, 8)}...`);
                const result = await cachePatent({
                  session_id: sessionId,
                  patent_number: patentNumber,
                  patent_index: index,
                  title: patent.title,
                  url: patent.url,
                  abstract: abstract,
                  full_content: patent.content,
                  metadata: metadata,
                });
                if (result.error) {
                  console.error(`[PatentSearch] Cache error for patent ${index}:`, result.error);
                } else {
                  console.log(`[PatentSearch] ✓ Cached patent ${index}`);
                }
              } catch (cacheError) {
                console.error('[PatentSearch] Failed to cache patent:', cacheError);
                // Continue even if caching fails
              }
            } else {
              console.warn('[PatentSearch] No sessionId - skipping cache');
            }

            // Return truncated version with just abstract
            return {
              patentIndex: index,
              patentNumber: patentNumber,
              title: patent.title,
              abstract: abstract,
              content: abstract, // For UI compatibility - shows in patent cards
              url: patent.url,
              assignees: metadata.assignees?.map(a => a.name) || [],
              filingDate: metadata.filingDate,
              publicationDate: metadata.publicationDate,
              claimsCount: metadata.claimsCount,
              relevance_score: patent.relevance_score,
              fullContentCached: !!sessionId,
              // Keep original fields for UI compatibility
              source: patent.source,
              data_type: patent.data_type,
            };
          })
        );

        // Debug: Count cache successes/failures
        const cacheStats = {
          sessionId: sessionId ? `${sessionId.substring(0, 8)}...` : 'NONE',
          patentsCached: sessionId ? truncatedResults.length : 0,
        };
        console.log('[PatentSearch] Cache stats:', cacheStats);

        return JSON.stringify({
          type: "patents",
          query: query,
          resultCount: truncatedResults.length,
          results: truncatedResults,
          favicon: 'https://www.uspto.gov/favicon.ico',
          displaySource: 'USPTO / EPO / PCT Patents',
          note: `IMPORTANT: Abstracts only - Full content cached for session ${cacheStats.sessionId} (${cacheStats.patentsCached} patents). To access complete patent details (claims, description, citations), use readFullPatent tool with the patentIndex field from these results. Example: readFullPatent({patentIndex: 0}) for the first patent, readFullPatent({patentIndex: 2}) for the third patent, etc.`,
          _debug: cacheStats,
        }, null, 2);
      } catch (error) {
        return `❌ Error searching patents: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  }),

  readFullPatent: tool({
    description: `Retrieve complete patent details (full claims, description, citations) for patents from your most recent patentSearch.

    WHEN TO USE THIS TOOL:
    - User asks for "full claims" or "detailed claims"
    - User asks for "claim chart" or "claim mapping"
    - User asks for "FTO analysis" or "freedom to operate"
    - User asks for "detailed technical description" or "technical implementation"
    - User asks for "invalidation search" or "prior art mapping"
    - User need specific claim limitations or detailed technical specifications
    - User wants to compare patents at the claim level

    HOW TO USE:
    1. After running patentSearch, each patent result has a "patentIndex" field (0-19)
    2. Use that patentIndex to retrieve the full patent: readFullPatent({patentIndex: 3})
    3. You can call this multiple times for different patents in the same conversation

    EXAMPLE WORKFLOW:
    - patentSearch returns 10 patents with abstracts
    - You identify patents at index 2, 5, and 7 as most relevant
    - Call readFullPatent({patentIndex: 2}), readFullPatent({patentIndex: 5}), readFullPatent({patentIndex: 7})
    - Now you have full claims and descriptions to create detailed analysis

    The abstract from patentSearch is NOT sufficient for:
    - Claim chart creation (need full claim text)
    - FTO analysis (need claim-by-claim review)
    - Technical comparison (need detailed descriptions)
    - Finding specific technical limitations

    Note: Patents are cached for 1 hour after patentSearch. If this tool returns an error,
    run patentSearch again to refresh the cache.`,
    inputSchema: z.object({
      patentIndex: z.number().min(0).max(19).describe('The patentIndex field from the patentSearch results (0-19). Each patent in the search results has this field.'),
      sections: z.array(z.enum(['abstract', 'claims', 'description', 'citations', 'drawings', 'all']))
        .optional()
        .describe('Specific sections to retrieve (default: all sections). Options: "claims" (patent claims only), "description" (detailed technical description), "citations" (prior art citations), "drawings" (description of figures), "all" (everything)')
    }),
    execute: async ({ patentIndex, sections }, options) => {
      const sessionId = (options as any)?.experimental_context?.sessionId;

      console.log('[ReadFullPatent] Called with:', { patentIndex, sections, sessionId });

      if (!sessionId) {
        console.error('[ReadFullPatent] No sessionId provided');
        return JSON.stringify({
          error: true,
          message: 'No active session. Cannot retrieve cached patent.'
        });
      }

      try {
        const { getFullPatent } = await import('./db');
        const { parsePatentSections } = await import('./patent-utils');

        console.log('[ReadFullPatent] Fetching patent from cache:', { sessionId, patentIndex });

        // Retrieve cached patent
        const { data: cachedPatent, error } = await getFullPatent(sessionId, patentIndex);

        console.log('[ReadFullPatent] Cache result:', {
          found: !!cachedPatent,
          error: error,
          patentNumber: cachedPatent?.patentNumber || cachedPatent?.patent_number,
          patentIndex: cachedPatent?.patentIndex || cachedPatent?.patent_index,
        });

        if (error) {
          console.error('[ReadFullPatent] Database error:', error);
          return JSON.stringify({
            error: true,
            message: `Database error: ${JSON.stringify(error)}`
          });
        }

        if (!cachedPatent) {
          console.warn('[ReadFullPatent] Patent not found at index', patentIndex);
          return JSON.stringify({
            error: true,
            message: `Patent at index ${patentIndex} not found in cache. This usually means:\n1. The cache expired (lasts 1 hour)\n2. No patent was found at this index in your MOST RECENT search\n3. You're trying to access results from an old search\n\nSolution: Run a NEW patentSearch to refresh the cache, then try again.`
          });
        }

        // Parse the requested sections
        const parsedSections = parsePatentSections(
          cachedPatent.fullContent || cachedPatent.full_content,
          sections
        );

        // Parse metadata if it's a string
        let metadata = cachedPatent.metadata;
        if (typeof metadata === 'string') {
          try {
            metadata = JSON.parse(metadata);
          } catch (e) {
            metadata = {};
          }
        }

        return JSON.stringify({
          success: true,
          patentIndex: patentIndex,
          patentNumber: cachedPatent.patentNumber || cachedPatent.patent_number,
          title: cachedPatent.title,
          url: cachedPatent.url,
          metadata: metadata,
          sections: parsedSections,
          note: 'Use this detailed information to create claim charts, perform FTO analysis, or conduct deep technical comparison.'
        }, null, 2);

      } catch (error) {
        return JSON.stringify({
          error: true,
          message: `Failed to retrieve patent: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    },
  }),

  webSearch: tool({
    description: "Search the web for general information on any topic",
    inputSchema: z.object({
      query: z.string().describe('Search query for any topic'),
      maxResults: z.number().min(1).max(20).optional().default(5).describe('Maximum number of results'),
    }),
    execute: async ({ query, maxResults }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';

      try {
        const valyu = new Valyu(process.env.VALYU_API_KEY, "https://api.valyu.ai/v1");

        const response = await valyu.search(query, {
          searchType: "all" as const,
          maxNumResults: maxResults || 5,
          isToolCall: true,
        });

        await track("Valyu API Call", {
          toolType: "webSearch",
          query: query,
          resultCount: response?.results?.length || 0,
        });

        if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
          try {
            const polarTracker = new PolarEventTracker();
            const valyuCostDollars = (response as any)?.total_deduction_dollars || 0;
            await polarTracker.trackValyuAPIUsage(userId, sessionId, "webSearch", valyuCostDollars, {
              query,
              resultCount: response?.results?.length || 0,
              success: true,
            });
          } catch (error) {
            console.error('[WebSearch] Failed to track usage:', error);
          }
        }

        return JSON.stringify({
          type: "web_search",
          query: query,
          resultCount: response?.results?.length || 0,
          results: response?.results || [],
        }, null, 2);
      } catch (error) {
        return `❌ Error performing web search: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  }),
};

// Export with both names for compatibility
export const biomedicalTools = healthcareTools;
