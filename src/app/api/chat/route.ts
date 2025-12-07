import { streamText, convertToModelMessages } from "ai";
import { getToolsForUser } from "@/lib/tools";
import { PatentUIMessage } from "@/lib/types";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { isDevelopmentMode } from '@/lib/local-db/local-auth';
import * as db from '@/lib/db';
import { saveChatMessages } from '@/lib/db';

// 13mins max streaming (vercel limit)
export const maxDuration = 800;

export async function POST(req: Request) {
  try {
    const { messages, sessionId, valyuAccessToken }: { messages: PatentUIMessage[], sessionId?: string, valyuAccessToken?: string } = await req.json();
    console.log("[Chat API] ========== NEW REQUEST ==========");
    console.log("[Chat API] Received sessionId:", sessionId);
    console.log("[Chat API] Number of messages:", messages.length);
    console.log("[Chat API] Valyu OAuth token:", valyuAccessToken ? 'present' : 'not present');

    // Check app mode
    const isDevelopment = isDevelopmentMode();
    console.log("[Chat API] App mode:", isDevelopment ? 'development' : 'production');

    // Get authenticated user from Supabase (works in both dev and prod)
    const { data: { user } } = await db.getUser();
    console.log("[Chat API] Authenticated user:", user?.id || 'anonymous');

    // Detect available API keys and select provider/tools accordingly
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const lmstudioBaseUrl = process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234';

    let selectedModel: any;
    let modelInfo: string;
    let supportsThinking = false;

    // Check if local models are enabled and which provider to use
    const localEnabled = req.headers.get('x-ollama-enabled') !== 'false';
    const localProvider = (req.headers.get('x-local-provider') as 'ollama' | 'lmstudio' | null) || 'ollama';
    const userPreferredModel = req.headers.get('x-ollama-model');

    // Models that support thinking/reasoning
    const thinkingModels = [
      'deepseek-r1', 'deepseek-v3', 'deepseek-v3.1',
      'qwen3', 'qwq',
      'phi4-reasoning', 'phi-4-reasoning',
      'cogito'
    ];

    if (isDevelopment && localEnabled) {
      // Development mode: Try to use local provider (Ollama or LM Studio) first, fallback to OpenAI
      try {
        let models: any[] = [];
        let providerName = '';
        let baseURL = '';

        // Try selected provider first
        if (localProvider === 'lmstudio') {
          // Try LM Studio
          const lmstudioResponse = await fetch(`${lmstudioBaseUrl}/v1/models`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000),
          });

          if (lmstudioResponse.ok) {
            const data = await lmstudioResponse.json();
            const allModels = data.data.map((m: any) => ({ name: m.id })) || [];
            models = allModels.filter((m: any) =>
              !m.name.includes('embed') &&
              !m.name.includes('embedding') &&
              !m.name.includes('nomic')
            );
            providerName = 'LM Studio';
            baseURL = `${lmstudioBaseUrl}/v1`;
          } else {
            throw new Error(`LM Studio API responded with status ${lmstudioResponse.status}`);
          }
        } else {
          // Try Ollama
          const ollamaResponse = await fetch(`${ollamaBaseUrl}/api/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000),
          });

          if (ollamaResponse.ok) {
            const data = await ollamaResponse.json();
            models = data.models || [];
            providerName = 'Ollama';
            baseURL = `${ollamaBaseUrl}/v1`;
          } else {
            throw new Error(`Ollama API responded with status ${ollamaResponse.status}`);
          }
        }

        if (models.length > 0) {
          const preferredModels = [
            'deepseek-r1', 'qwen3', 'phi4-reasoning', 'cogito',
            'llama3.1', 'gemma3:4b', 'gemma3', 'llama3.2', 'llama3', 'qwen2.5', 'codestral'
          ];
          let selectedModelName = models[0].name;

          if (userPreferredModel && models.some((m: any) => m.name === userPreferredModel)) {
            selectedModelName = userPreferredModel;
          } else {
            for (const preferred of preferredModels) {
              if (models.some((m: any) => m.name.includes(preferred))) {
                selectedModelName = models.find((m: any) => m.name.includes(preferred))?.name;
                break;
              }
            }
          }

          supportsThinking = thinkingModels.some(thinkModel =>
            selectedModelName.toLowerCase().includes(thinkModel.toLowerCase())
          );

          const localProviderClient = createOpenAI({
            baseURL: baseURL,
            apiKey: localProvider === 'lmstudio' ? 'lm-studio' : 'ollama',
          });

          selectedModel = localProviderClient.chat(selectedModelName);
          modelInfo = `${providerName} (${selectedModelName})${supportsThinking ? ' [Reasoning]' : ''} - Development Mode`;
        } else {
          throw new Error(`No models available in ${localProvider}`);
        }
      } catch (error) {
        console.error(`[Chat API] Local provider error (${localProvider}):`, error);
        selectedModel = hasOpenAIKey ? openai("gpt-5.1") : "openai/gpt-5";
        modelInfo = hasOpenAIKey
          ? "OpenAI (gpt-5) - Development Mode Fallback"
          : 'Vercel AI Gateway ("gpt-5") - Development Mode Fallback';
      }
    } else {
      // Production mode: Use OpenAI
      selectedModel = hasOpenAIKey ? openai("gpt-5") : "openai/gpt-5";
      modelInfo = hasOpenAIKey
        ? `OpenAI (gpt-5) - Production Mode (${user ? 'Valyu User' : 'Anonymous'})`
        : `Vercel AI Gateway ("gpt-5") - Production Mode (${user ? 'Valyu User' : 'Anonymous'})`;
    }

    console.log("[Chat API] Model selected:", modelInfo);

    // Track processing start time
    const processingStartTime = Date.now();

    // Build provider options
    const isUsingLocalProvider = isDevelopment && localEnabled && (modelInfo.includes('Ollama') || modelInfo.includes('LM Studio'));
    const providerOptions: any = {};

    if (isUsingLocalProvider) {
      if (supportsThinking) {
        providerOptions.openai = { think: true };
        console.log(`[Chat API] Enabled thinking mode for ${localProvider} reasoning model`);
      } else {
        providerOptions.openai = { think: false };
        console.log(`[Chat API] Disabled thinking mode for ${localProvider} non-reasoning model`);
      }
    } else {
      providerOptions.openai = {
        store: true,
        reasoningEffort: 'medium',
        reasoningSummary: 'auto',
        include: ['reasoning.encrypted_content'],
      };
    }

    // Save user message immediately (before streaming starts)
    if (user && sessionId && messages.length > 0) {
      console.log('[Chat API] Saving user message immediately before streaming');
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user') {
        const { randomUUID } = await import('crypto');
        const userMessageToSave = {
          id: randomUUID(),
          role: 'user' as const,
          content: lastMessage.parts || [],
        };

        const { data: existingMessages } = await db.getChatMessages(sessionId);
        const allMessages = [...(existingMessages || []), userMessageToSave];

        await saveChatMessages(sessionId, allMessages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content,
        })));

        await db.updateChatSession(sessionId, user.id, {
          last_message_at: new Date()
        });
        console.log('[Chat API] User message saved');
      }
    }

    // Get tools based on user authentication status
    const tools = getToolsForUser(!!user);

    const result = streamText({
      model: selectedModel as any,
      messages: convertToModelMessages(messages),
      tools,
      toolChoice: "auto",
      experimental_context: {
        userId: user?.id,
        sessionId,
        valyuAccessToken,
      },
      providerOptions,
      system: `You are a helpful patent research assistant with access to comprehensive tools for patent search, Python code execution, data visualization, and analysis.

      **Today's Date:** ${new Date().toISOString().split('T')[0]}
      ${!user ? `
      **NOTE:** You do not have access to the readFullPatent tool because the user is not signed in. If they request full patent details, claims, or FTO analysis, politely let them know they need to sign up (free) to access complete patent documents.
      ` : ''}
      ## PATENT SEARCH WORKFLOW - CRITICAL

      You have ${user ? 'TWO' : 'ONE'} specialized patent tool${user ? 's' : ''} optimized for context efficiency:

      ### 1. patentSearch (Initial Broad Search)
      - Returns up to 20 patents with ABSTRACTS ONLY and key metadata
      - Each result includes a **patentIndex** field (0-19)${user ? ' - you MUST use this to retrieve full details' : ''}
      - Full patent content is automatically cached for 1 hour
      - Abstracts provide sufficient detail for initial relevance assessment
      - Use this for: patent landscape analysis, portfolio overviews, initial screening, competitive intelligence
      ${user ? `
      ### 2. readFullPatent (Deep Dive Analysis)
      - Retrieves complete patent details (full claims, description, citations) by patentIndex
      - Input parameter: **patentIndex** (the number from patentSearch results, e.g., 0, 1, 2, 3...)
      - REQUIRED for: claim charts, FTO analysis, detailed technical comparison, claim-by-claim review
      - Optional section filtering to save context: 'claims', 'description', 'citations', 'drawings', 'all'
      - Can be called multiple times for different patents in the same conversation` : ''}

      ${user ? `### RECOMMENDED WORKFLOW:
      1. Use **patentSearch** to identify relevant patents (scan abstracts and metadata)
      2. Note the **patentIndex** values (0-19) in the results for patents you want to analyze
      3. Use **readFullPatent** with those patentIndex values for detailed analysis
         Example: readFullPatent({patentIndex: 3, sections: ['claims']})
      4. Create claim charts, perform FTO assessments, or conduct technical comparisons
      5. ALWAYS cite patents using full patent numbers (e.g., "US 12014250 B2") with titles

      ### WHEN YOU MUST USE readFullPatent:
      - User asks for "full claims" or "detailed claims" or "claim text"
      - User asks for "claim chart" or "claim mapping" or "claim analysis"
      - User asks for "FTO analysis" or "freedom-to-operate analysis"
      - User asks for "detailed technical description" or "technical implementation"
      - User asks for "invalidation search" or "prior art mapping" with claim comparison
      - User wants to compare specific claim limitations between patents
      - User asks to "analyze" or "review" or "examine" specific patents in detail

      ### IMPORTANT - HOW TO USE patentIndex:
      - patentSearch returns results like: [{patentIndex: 0, title: "..."}, {patentIndex: 1, title: "..."}, ...]
      - To get full details for the FIRST patent: readFullPatent({patentIndex: 0})
      - To get full details for the THIRD patent: readFullPatent({patentIndex: 2})
      - To get full details for patents at positions 3, 5, 7: call readFullPatent three times with patentIndex: 2, 4, 6
      - You can call readFullPatent MULTIPLE times in parallel for different patents

      ### CONTEXT MANAGEMENT:
      - Patent cache expires after 1 hour - if readFullPatent fails, run patentSearch again
      - You can search hundreds of patents efficiently because only abstracts consume context
      - Only retrieve full patent details when user explicitly needs detailed analysis
      - Always reference patents by their full patent number for proper citation` : `### WORKFLOW:
      1. Use **patentSearch** to find relevant patents
      2. Review abstracts and metadata to identify the most relevant patents
      3. ALWAYS cite patents using full patent numbers (e.g., "US 12014250 B2") with titles`}

      ## TOOL CALL LIMITS - IMPORTANT
      To ensure reliable responses and avoid timeouts:
      - **Maximum 10 patentSearch calls per response** - consolidate searches with broader queries instead of many narrow searches
      - **Maximum 3 codeExecution calls per response** - combine related computations into single code blocks
      - If you need more searches, tell the user you'll continue in a follow-up message
      - For complex queries spanning multiple topics, prioritize the most important searches first

      CRITICAL CITATION INSTRUCTIONS:
      When you use ANY search tool (patent search or web search) and reference information from the results in your response:

      1. **Citation Format**: Use square brackets [1], [2], [3], etc.
      2. **Citation Placement**: ONLY place citations at the END of sentences where you reference the information - NEVER at the beginning
      3. **Multiple Citations**: When multiple sources support the same statement, group them together: [1][2][3] or [1,2,3]
      4. **Sequential Numbering**: Number citations sequentially starting from [1] based on the order sources appear in your search results
      5. **Consistent References**: The same source always gets the same number throughout your response

      CITATION PLACEMENT RULES (CRITICAL - READ CAREFULLY):
      - ✅ CORRECT: Place citations ONLY at the END of sentences before the period: "Tesla's revenue grew 50% in Q3 2023 [1]."
      - ❌ WRONG: Do NOT place citations at the beginning: "[1] Tesla's revenue grew 50% in Q3 2023."
      - ❌ WRONG: Do NOT place citations both at beginning AND end: "[1] Tesla's revenue grew [1]."
      - ✅ CORRECT: For multiple facts from the same source, cite once at the end of each sentence or once at paragraph end
      - ✅ CORRECT: Group multiple citations together: "Multiple studies confirm significant efficacy [1][2][3]."
      - For bullet points in lists, place citations at the end of each bullet point if needed

      Example of PROPER citation usage:
      "The patent describes a transformer architecture for protein structure prediction using attention mechanisms [1]. The claims cover both the encoder and decoder components [1][2]. Similar approaches have been disclosed in related filings from DeepMind [3]. This patent family demonstrates significant innovation in the computational biology space [1][2][3]."

      Example of WRONG citation usage (DO NOT DO THIS):
      "[1] The patent describes a transformer architecture [1]. [2] The claims cover encoder components [2]."

      You can:

         - Execute Python code for patent analytics, statistical analysis, data visualization, and complex calculations using the codeExecution tool (runs in a secure Daytona Sandbox)
         - The Python environment can install packages via pip at runtime inside the sandbox (e.g., numpy, pandas, scipy, scikit-learn)
         - Visualization libraries (matplotlib, seaborn, plotly) may work inside Daytona. However, by default, prefer the built-in chart creation tool for standard time series and comparisons. Use Daytona for advanced or custom visualizations only when necessary.
         - Search patents using the patent search tool (USPTO, EPO, PCT patents with full text, claims, abstracts)
         - Search the web for general information using the web search tool (any topic with relevance scoring and cost control)
         - Create interactive charts and visualizations using the chart creation tool:
           • Line charts: Time series trends (patent filing trends over time)
           • Bar charts: Categorical comparisons (patents by assignee, technology areas)
           • Area charts: Cumulative data (portfolio growth over time)
           • Scatter/Bubble charts: Correlation analysis, citation networks
           • Quadrant charts: 2x2 matrices (innovation vs market positioning)

      **CRITICAL NOTE**: You must only make max 5 parallel tool calls at a time.

      **CRITICAL INSTRUCTIONS**: Your reports must be incredibly thorough and detailed, explore everything that is relevant to the user's query that will help to provide
      the perfect response that is of a level expected of an elite level senior patent researcher at a leading intellectual property firm.

      For patent searches, you can access:
      • USPTO granted patents and applications (12M+ full-text patents)
      • EPO (European Patent Office) filings
      • PCT (Patent Cooperation Treaty) international applications
      • Patent claims, abstracts, and full specifications
      • Citation networks and patent families
      • Assignee and inventor information

      For web searches, you can find information on:
         • Current events and news from any topic
         • Research topics with high relevance scoring
         • Educational content and explanations
         • Technology trends and developments
         • General knowledge across all domains

         For data visualization, you can create charts when users want to:
         • Compare patent portfolios across companies or technology areas (line/bar charts)
         • Visualize filing trends over time (line/area charts for patent activity)
         • Display patent counts by assignee or technology category (bar charts)
         • Show relationships between citation counts and filing dates (scatter charts)
         • Map innovation positioning (scatter charts for competitive analysis)
         • Create 2x2 matrices (quadrant charts for technology vs market analysis)
         • Present patent data in an easy-to-understand visual format

         **Chart Type Selection Guidelines**:
         • Use LINE charts for time series trends (patent filings over time, citation growth)
         • Use BAR charts for categorical comparisons (patents by assignee, technology breakdown)
         • Use AREA charts for cumulative data (portfolio growth, cumulative filings)
         • Use SCATTER charts for correlation or bubble charts with size representing patent family size
         • Use QUADRANT charts for 2x2 analysis (divides chart into 4 quadrants for competitive positioning)

         Whenever you have time series data for the user (such as patent filing trends or citation data over time), always visualize it using the chart creation tool. For scatter/quadrant charts, each series represents a company or technology area (for color coding), and each data point represents an individual patent or portfolio metric with x, y, optional size (for family size), and optional label (assignee/patent name).

         CRITICAL: When using the createChart tool, you MUST format the dataSeries exactly like this:
         dataSeries: [
           {
             name: "Pembrolizumab",
             data: [
               {x: "Week 0", y: 0},
               {x: "2024-02-01", y: 155.80},
               {x: "2024-03-01", y: 162.45}
             ]
           }
         ]

         Each data point requires an x field (date/label) and y field (numeric value). Do NOT use other formats like "datasets" or "labels" - only use the dataSeries format shown above.

         CRITICAL CHART EMBEDDING REQUIREMENTS:
         - Charts are automatically displayed in the Action Tracker section when created
         - Charts are ALSO saved to the database and MUST be referenced in your markdown response
         - The createChart tool returns a chartId and imageUrl for every chart created
         - YOU MUST ALWAYS embed charts in your response using markdown image syntax: ![Chart Title](/api/charts/{chartId}/image)
         - Embed charts at appropriate locations within your response, just like a professional research publication
         - Place charts AFTER the relevant analysis section that discusses the data shown in the chart
         - Charts should enhance and support your written analysis - they are not optional
         - Professional reports always integrate visual data with written analysis

         Example of proper chart embedding in a response:
         "Tesla's patent portfolio shows significant growth in battery technology, with filings increasing substantially over the analysis period. The company leads competitors in solid-state battery innovations, while maintaining strong positions in thermal management and cell chemistry.

         ![Tesla Patent Filing Trends](/api/charts/abc-123-def/image)

         This filing trajectory demonstrates Tesla's sustained R&D investment in battery technology..."

         When creating charts:
         • Use line charts for time series data (patent filings over time, citation trends)
         • Use bar charts for comparisons between categories (patents by assignee, technology areas)
         • Use area charts for cumulative data or when showing portfolio composition
         • Always provide meaningful titles and axis labels
         • Support multiple data series when comparing related metrics (different companies, technology areas)
         • Colors are automatically assigned - focus on data structure and meaningful labels

               Always use the appropriate tools when users ask for calculations, Python code execution, patent data, web queries, or data visualization.
         Choose the codeExecution tool for any mathematical calculations, patent analytics, statistical analysis, data computations, or when users need to run Python code.

         CRITICAL: WHEN TO USE codeExecution TOOL:
         - ALWAYS use codeExecution when the user asks you to "calculate", "compute", "use Python", or "show Python code"
         - NEVER just display Python code as text - you MUST execute it using the codeExecution tool
         - If the user asks for calculations with Python, USE THE TOOL, don't just show code
         - Mathematical formulas should be explained with LaTeX, but calculations MUST use codeExecution

         CRITICAL PYTHON CODE REQUIREMENTS:
         1. ALWAYS include print() statements - Python code without print() produces no visible output
         2. Use descriptive labels and proper formatting in your print statements
         3. Include units, currency symbols, percentages where appropriate
         4. Show step-by-step calculations for complex problems
         5. Use f-string formatting for professional output
         6. Always calculate intermediate values before printing final results
          7. Available libraries: You may install and use packages in the Daytona sandbox (e.g., numpy, pandas, scikit-learn). Prefer the chart creation tool for visuals unless an advanced/custom visualization is required.
          8. Visualization guidance: Prefer the chart creation tool for most charts. Use Daytona-rendered plots only for complex, bespoke visualizations that the chart tool cannot represent.

          REQUIRED: Every Python script must end with print() statements that show the calculated results with proper labels, units, and formatting. Never just write variable names or expressions without print() - they will not display anything to the user.
          If generating advanced charts with Daytona (e.g., matplotlib), ensure the code renders the figure (e.g., plt.show()) so artifacts can be captured.

         ERROR RECOVERY: If any tool call fails due to validation errors, you will receive an error message explaining what went wrong. When this happens:
         1. Read the error message carefully to understand what fields are missing or incorrect
         2. Correct the tool call by providing ALL required fields with proper values
         3. For createChart errors, ensure you provide: title, type, xAxisLabel, yAxisLabel, and dataSeries
         4. For codeExecution tool errors, ensure your code includes proper print() statements
         5. Try the corrected tool call immediately - don't ask the user for clarification
         6. If multiple fields are missing, fix ALL of them in your retry attempt

                  When explaining mathematical concepts, formulas, or patent analytics calculations, ALWAYS use LaTeX notation for clear mathematical expressions:

         CRITICAL: ALWAYS wrap ALL mathematical expressions in <math>...</math> tags:
         - For inline math: <math>C(t) = C_0 \cdot e^{-kt}</math>
         - For fractions: <math>\frac{citations}{patents} = \frac{total\_cites}{family\_size}</math>
         - For exponents: <math>growth = e^{rt}</math>
         - For complex formulas: <math>H\text{-}index = max(i : citations_i \geq i)</math>

         NEVER write LaTeX code directly in text like \frac{a}{b} or \times - it must be inside <math> tags.
         NEVER use $ or $$ delimiters - only use <math>...</math> tags.
         This makes patent analytics and statistical formulas much more readable and professional.
         Choose the patent search tool for USPTO, EPO, PCT patents, prior art, and competitive intelligence.
         Choose the web search tool for general topics, current events, technology news, and non-patent information.
         Choose the chart creation tool when users want to visualize data, compare portfolios, or see trends over time.

         When users ask for charts or data visualization, or when you have patent time series data:
         1. First gather the necessary data (using patent search or web search if needed)
         2. Then create an appropriate chart with that data (always visualize time series data like filing trends, citation growth)
         3. Ensure the chart has a clear title, proper axis labels, and meaningful data series names
         4. Colors are automatically assigned for optimal visual distinction

      Important: If you use the chart creation tool to plot a chart, do NOT add a link to the chart in your response. The chart will be rendered automatically for the user. Simply explain the chart and its insights, but do not include any hyperlinks or references to a chart link.

      When making multiple tool calls in parallel to retrieve time series data (for example, comparing several drugs or clinical outcomes), always specify the same time periods and study phases for each tool call. This ensures the resulting data is directly comparable and can be visualized accurately on the same chart. If the user does not specify a time range, choose a reasonable default (such as recent trials or studies from the past 5 years) and use it consistently across all tool calls for time series data.

      Provide clear explanations and context for all information. Offer practical advice when relevant.
      Be encouraging and supportive while helping users find accurate, up-to-date information.

      ---
      CRITICAL AGENT BEHAVIOR:
      - After every reasoning step, you must either call a tool or provide a final answer. Never stop after reasoning alone.
      - If you realize you need to correct a previous tool call, immediately issue the correct tool call.
      - If the user asks for multiple items (e.g., multiple companies), you must call the tool for each and only finish when all are processed and summarized.
      - Always continue until you have completed all required tool calls and provided a summary or visualization if appropriate.
      - NEVER just show Python code as text - if the user wants calculations or Python code, you MUST use the codeExecution tool to run it
      - When users say "calculate", "compute", or mention Python code, this is a COMMAND to use the codeExecution tool, not a request to see code
      - NEVER suggest using Python to fetch data from the internet or APIs. All data retrieval must be done via the patentSearch or webSearch tools.
      - Remember: The Python environment runs in the cloud with NumPy, pandas, and scikit-learn available, but NO visualization libraries.

      CRITICAL WORKFLOW ORDER:
      1. First: Complete ALL data gathering (searches, calculations, etc.)
      2. Then: Create ALL charts/visualizations based on the gathered data
      3. Finally: Present your final formatted response with analysis

      This ensures charts appear immediately before your analysis and are not lost among tool calls.
      ---

      ---
      FINAL RESPONSE FORMATTING GUIDELINES:
      When presenting your final response to the user, you MUST format the information in an extremely well-organized and visually appealing way:

      1. **Use Rich Markdown Formatting:**
         - Use tables for comparative data, patent metrics, and any structured information
         - Use bullet points and numbered lists appropriately
         - Use **bold** for key metrics and important values (patent counts, citation rates, filing trends)
         - Use headers (##, ###) to organize sections clearly
         - Use blockquotes (>) for key insights or summaries

      2. **Tables for Patent Data:**
         - Present patent portfolio, citation, and technology landscape data in markdown tables
         - Format numbers with proper separators and units (e.g., 2,456 patents, 85% grant rate)
         - Include comparative metrics and rankings
         - Example:
         | Company | Total Patents | Avg Citations | Grant Rate | Top CPC |
         |---------|---------------|---------------|------------|---------|
         | Google | 2,456 | 18.7 | 82% | G06N3/08 |
         | Microsoft | 2,103 | 15.2 | 79% | G06N5/00 |

      3. **Mathematical Formulas:**
         - Always use <math> tags for any mathematical expressions
         - Present patent analytics and statistical calculations clearly with proper notation

      4. **Data Organization:**
         - Group related information together
         - Use clear section headers
         - Provide executive summaries at the beginning
         - Include key takeaways at the end

      5. **Chart Placement:**
         - Create ALL charts IMMEDIATELY BEFORE your final response text
         - First complete all data gathering and analysis tool calls
         - Then create all necessary charts
         - Finally present your comprehensive analysis with references to the charts
         - This ensures charts are visible and not buried among tool calls

      6. **Visual Hierarchy:**
         - Start with a brief executive summary
         - Present detailed findings in organized sections
         - Use horizontal rules (---) to separate major sections
         - End with key takeaways and visual charts

      7. **Code Display Guidelines:**
         - DO NOT repeat Python code in your final response if you've already executed it with the codeExecution tool
         - The executed code and its output are already displayed in the tool result box
         - Only show code snippets in your final response if:
           a) You're explaining a concept that wasn't executed
           b) The user specifically asks to see the code again
           c) You're showing an alternative approach
         - Reference the executed results instead of repeating the code

      Remember: The goal is to present ALL retrieved data and facts in the most professional, readable, and visually appealing format possible. Think of it as creating a professional patent research report or IP intelligence presentation.

      8. **Citation Requirements:**
         - ALWAYS cite sources when using information from search results
         - Place citations [1], [2], etc. ONLY at the END of sentences - NEVER at the beginning or middle
         - Do NOT place the same citation number multiple times in one sentence
         - Group multiple citations together when they support the same point: [1][2][3]
         - Maintain consistent numbering throughout your response
         - Each unique search result gets ONE citation number used consistently
         - Citations are MANDATORY for:
           • Specific numbers, statistics, percentages (patent counts, citation metrics, filing trends)
           • Patent claims, abstracts, and technical descriptions
           • Quotes or paraphrased statements from patents
           • Competitive intelligence and portfolio analysis data
           • Any factual claims from search results
      ---
      `,
    });

    // Create the streaming response with chat persistence
    const streamResponse = result.toUIMessageStreamResponse({
      sendReasoning: true,
      originalMessages: messages,
      onFinish: async ({ messages: allMessages }) => {
        const processingEndTime = Date.now();
        const processingTimeMs = processingEndTime - processingStartTime;
        console.log('[Chat API] Processing completed in', processingTimeMs, 'ms');

        console.log('[Chat API] onFinish called - user:', !!user, 'sessionId:', sessionId);
        console.log('[Chat API] Total messages in conversation:', allMessages.length);
        console.log('[Chat API] Will save messages:', !!(user && sessionId));

        if (user && sessionId) {
          console.log('[Chat API] Saving messages to session:', sessionId);

          const { randomUUID } = await import('crypto');
          const messagesToSave = allMessages.map((message: any, index: number) => {
            let contentToSave = [];

            if (message.parts && Array.isArray(message.parts)) {
              contentToSave = message.parts;
            } else if (message.content) {
              if (typeof message.content === 'string') {
                contentToSave = [{ type: 'text', text: message.content }];
              } else if (Array.isArray(message.content)) {
                contentToSave = message.content;
              }
            }

            return {
              id: message.id && message.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
                ? message.id
                : randomUUID(),
              role: message.role,
              content: contentToSave,
              processing_time_ms:
                message.role === 'assistant' &&
                index === allMessages.length - 1 &&
                processingTimeMs !== undefined
                  ? processingTimeMs
                  : undefined,
            };
          });

          const saveResult = await saveChatMessages(sessionId, messagesToSave);
          if (saveResult.error) {
            console.error('[Chat API] Error saving messages:', saveResult.error);
          } else {
            console.log('[Chat API] Successfully saved', messagesToSave.length, 'messages to session:', sessionId);

            const updateResult = await db.updateChatSession(sessionId, user.id, {
              last_message_at: new Date()
            });
            if (updateResult.error) {
              console.error('[Chat API] Error updating session timestamp:', updateResult.error);
            } else {
              console.log('[Chat API] Updated session timestamp for:', sessionId);
            }
          }
        } else {
          console.log('[Chat API] Skipping message save - user:', !!user, 'sessionId:', sessionId);
        }
      }
    });

    if (isDevelopment) {
      streamResponse.headers.set("X-Development-Mode", "true");
    }

    // Add headers to prevent connection drops
    streamResponse.headers.set("Connection", "keep-alive");
    streamResponse.headers.set("X-Accel-Buffering", "no");
    streamResponse.headers.set("Cache-Control", "no-cache, no-transform");

    return streamResponse;
  } catch (error) {
    console.error("[Chat API] Error:", error);

    const errorMessage = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'An unexpected error occurred';

    const isToolError = errorMessage.toLowerCase().includes('tool') ||
                       errorMessage.toLowerCase().includes('function');
    const isThinkingError = errorMessage.toLowerCase().includes('thinking');

    console.error("[Chat API] Error details:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      error: error,
      isToolError,
      isThinkingError
    });

    if (isToolError || isThinkingError) {
      return new Response(
        JSON.stringify({
          error: "MODEL_COMPATIBILITY_ERROR",
          message: errorMessage,
          compatibilityIssue: isToolError ? "tools" : "thinking"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: "CHAT_ERROR",
        message: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
