# PatentAI

> **The world's first conversational patent search** - Access USPTO, EPO, PCT patents through natural language. Powered by Valyu's specialized patent data infrastructure.

🚀 **[Try the live demo](https://patents.valyu.ai)**

![PatentAI](public/valyu.png)

## Why PatentAI?

Traditional patent search tools cost $10,000-$50,000/year, require specialized training, and take hours per search. PatentAI changes everything:

- **🔍 Conversational Search** - Ask questions in natural language, no Boolean syntax or CPC codes required
- **⚡ 95% Faster** - What takes 4-8 hours with traditional tools takes 5 minutes with PatentAI
- **💰 10x Cheaper** - Professional-grade patent search at a fraction of the cost
- **🌐 Comprehensive Coverage** - USPTO, EPO, PCT, and international patents with English abstracts
- **🐍 Advanced Analytics** - Execute Python code for citation analysis, portfolio metrics, technology landscapes
- **📊 Interactive Visualizations** - Beautiful charts for competitive intelligence and trend analysis
- **🏠 Local AI Models** - Run with Ollama or LM Studio for unlimited, private searches
- **🎯 Multiple Search Modes** - Prior art, FTO analysis, competitive intelligence, citation analysis

## Key Features

### 🔥 Powerful Patent Search Tools

- **Patent Search** - Semantic search across millions of patents (USPTO, EPO, PCT)
- **Prior Art Search** - Find anticipating references for patentability assessment
- **Competitive Intelligence** - Analyze competitor patent portfolios and technology strategies
- **Freedom-to-Operate** - Identify blocking patents and infringement risks
- **Citation Analysis** - Map forward/backward citations and identify influential patents
- **Technology Landscapes** - Visualize patent activity across technology domains
- **Interactive Charts** - Create filing trends, portfolio comparisons, technology matrices
- **Python Analytics** - Statistical analysis, network metrics, portfolio valuation

### 🛠️ Advanced Tool Calling

- **Python Code Execution** - Patent analytics, citation metrics, portfolio strength calculations
- **Interactive Charts** - Filing trends, competitive landscapes, citation networks
- **Multi-Search Modes** - Prior art, FTO, competitive intelligence, invalidation research
- **Export & Share** - Download results, generate reports, create claim charts

## 🚀 Quick Start

### Two Modes: Production vs Development

PatentAI supports two distinct operating modes:

**🌐 Production Mode** (Default)
- Uses Supabase for authentication and database
- OpenAI/Vercel AI Gateway for LLM
- Rate limiting (5 queries/day for free tier)
- Billing and usage tracking via Polar
- Full authentication required

**💻 Development Mode** (Recommended for Local Development)
- **No Supabase required** - Uses local SQLite database
- **No authentication needed** - Auto-login as dev user
- **Unlimited queries** - No rate limits
- **No billing/tracking** - Polar integration disabled
- **Works offline** - Complete local development
- **Ollama/LM Studio integration** - Use local LLMs for privacy and unlimited usage

### Prerequisites

**For Production Mode:**
- Node.js 18+
- npm or pnpm
- OpenAI API key
- Valyu API key (get one at [platform.valyu.ai](https://platform.valyu.ai))
- Daytona API key (for code execution)
- Supabase account and project
- Polar account (for billing)

**For Development Mode (Recommended for getting started):**
- Node.js 18+
- npm or pnpm
- Valyu API key (get one at [platform.valyu.ai](https://platform.valyu.ai))
- Daytona API key (for code execution)
- [Ollama](https://ollama.com) or [LM Studio](https://lmstudio.ai) installed (optional but recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/patentai.git
   cd patentai
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:

   **For Development Mode (Easy Setup):**
   ```env
   # Enable Development Mode (No Supabase, No Auth, No Billing)
   NEXT_PUBLIC_APP_MODE=development

   # Valyu API Configuration (Required - powers all patent search)
   VALYU_API_KEY=your-valyu-api-key

   # Daytona Configuration (Required for Python execution)
   DAYTONA_API_KEY=your-daytona-api-key
   DAYTONA_API_URL=https://api.daytona.io  # Optional
   DAYTONA_TARGET=latest  # Optional

   # Local LLM Configuration (Optional - for unlimited, private queries)
   OLLAMA_BASE_URL=http://localhost:11434   # Default Ollama URL
   LMSTUDIO_BASE_URL=http://localhost:1234  # Default LM Studio URL

   # OpenAI Configuration (Optional - fallback if local models unavailable)
   OPENAI_API_KEY=your-openai-api-key
   ```

   **For Production Mode:**
   ```env
   # OpenAI Configuration (Required)
   OPENAI_API_KEY=your-openai-api-key

   # Valyu API Configuration (Required)
   VALYU_API_KEY=your-valyu-api-key

   # Daytona Configuration (Required)
   DAYTONA_API_KEY=your-daytona-api-key

   # Supabase Configuration (Required)
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # Polar Billing (Required)
   POLAR_WEBHOOK_SECRET=your-polar-webhook-secret
   POLAR_UNLIMITED_PRODUCT_ID=your-product-id

   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

   - **Development Mode**: You'll be automatically logged in as `dev@localhost`
   - **Production Mode**: You'll need to sign up/sign in

## 🏠 Development Mode Guide

### What is Development Mode?

Development mode provides a complete local development environment without any external dependencies beyond the core APIs (Valyu, Daytona). It's perfect for:

- **Local Development** - No Supabase setup required
- **Offline Work** - All data stored locally in SQLite
- **Testing Features** - Unlimited queries without billing
- **Privacy** - Use local Ollama/LM Studio models, no cloud LLM needed
- **Quick Prototyping** - No authentication or rate limits

### Setting Up Ollama (Recommended)

Ollama provides unlimited, private LLM inference on your local machine - completely free and runs offline!

**🚀 Quick Setup (No Terminal Required):**

1. **Download Ollama App**
   - Visit [ollama.com](https://ollama.com) and download the app for your OS
   - Install and open the Ollama app
   - It runs in your menu bar (macOS) or system tray (Windows/Linux)

2. **Download a Model**
   - Open Ollama app and browse available models
   - Download `qwen2.5:7b` (recommended - best for patent search with tool support)
   - Or choose from: `llama3.1`, `mistral`, `deepseek-r1`
   - That's it! PatentAI will automatically detect and use it

3. **Use in PatentAI**
   - Start the app in development mode
   - Ollama status indicator appears in top-right corner
   - Shows your available models
   - Click to select which model to use
   - Icons show capabilities: 🔧 (tools) and 🧠 (reasoning)

**⚡ Advanced Setup (Terminal):**

```bash
# Install Ollama
brew install ollama              # macOS
# OR
curl -fsSL https://ollama.com/install.sh | sh  # Linux

# Start Ollama service
ollama serve

# Download recommended models
ollama pull qwen2.5:7b          # Recommended - excellent tool support
ollama pull llama3.1:8b         # Alternative - good performance
ollama pull deepseek-r1:7b      # For reasoning/thinking mode
```

### Setting Up LM Studio (Alternative)

LM Studio provides a beautiful GUI for running local LLMs - perfect if you prefer visual interfaces!

1. **Download LM Studio**
   - Visit [lmstudio.ai](https://lmstudio.ai) and download for your OS
   - Install and open LM Studio

2. **Download Models**
   - Click 🔍 Search icon in LM Studio
   - Search for: `qwen/qwen3-14b`, `openai/gpt-oss-20b`, or `google/gemma-3-12b`
   - Click download and wait for completion

3. **Start the Server**
   - Click LM Studio menu bar icon (top-right on macOS)
   - Select **"Start Server on Port 1234..."**
   - Server starts immediately

4. **⚠️ CRITICAL: Configure Context Window**
   - Set **Context Length** to **at least 8192 tokens** (16384+ recommended)
   - PatentAI uses extensive tool descriptions that require adequate context length
   - Without sufficient context, you'll get errors when AI tries to use tools

## 💡 Example Queries

Try these powerful queries to see what PatentAI can do:

### Prior Art Search
- "Find patents similar to a neural network system that predicts protein structures using attention mechanisms"
- "Search for prior art on collapsible camping chairs with integrated solar panels"
- "Is there prior art for a machine learning algorithm that optimizes drug delivery schedules?"

### Freedom-to-Operate Analysis
- "Find patents that would block manufacturing transformer-based language models"
- "Check FTO for CRISPR gene editing in therapeutic applications"
- "What patents cover lithium-sulfur battery technology with graphene cathodes?"

### Competitive Intelligence
- "Show all AI patents filed by Google in 2023-2024"
- "Compare patent portfolios of Tesla vs BYD in battery technology"
- "Find recent patent activity by Moderna in mRNA vaccine delivery"
- "Identify white space opportunities in quantum computing patents"

### Technology Landscapes
- "Create a chart showing patent filing trends in solid-state batteries 2018-2024"
- "Analyze the competitive landscape for CRISPR gene editing patents"
- "Show top assignees in autonomous vehicle perception patents"

### Citation Analysis
- "Find patents that cite US Patent 11,234,567"
- "Map the citation network for key transformer architecture patents"
- "Identify the most influential patents in reinforcement learning"

### Portfolio Analysis
- "Calculate portfolio strength metrics for OpenAI's patent portfolio"
- "Compare average citation counts for Google vs Microsoft AI patents"
- "Generate a CSV of Stanford University CRISPR patents with filing dates"

**With Local Models (Ollama/LM Studio):**
- Run unlimited queries without API costs
- Keep all your patent research completely private
- Perfect for confidential invention disclosures
- Choose your preferred interface: terminal (Ollama) or GUI (LM Studio)

## 🏗️ Architecture

- **Frontend**: Next.js 15 with App Router, Tailwind CSS, shadcn/ui
- **AI**: OpenAI GPT-4 with function calling + Ollama/LM Studio for local models
- **Data**: Valyu API for comprehensive patent data (USPTO, EPO, PCT)
- **Code Execution**: Daytona sandboxes for secure Python execution
- **Visualizations**: Recharts for interactive charts
- **Real-time**: Streaming responses with Vercel AI SDK
- **Local Models**: Ollama and LM Studio integration for private, unlimited queries
- **Database**: Supabase (production) or SQLite (development)

## 🎯 Use Cases

### For Patent Attorneys
- **Prior Art Search**: 95% time reduction (4-8 hours → 5 minutes)
- **Office Action Responses**: Find supporting references instantly
- **FTO Analysis**: Identify blocking patents in minutes, not days
- **Portfolio Management**: Track competitor filings and technology trends

### For R&D Teams
- **Patentability Assessment**: Validate ideas before investing in development
- **Technology Scouting**: Identify licensing opportunities and expired patents
- **Competitive Analysis**: Monitor competitor innovation strategies
- **White Space Identification**: Find unpatented technology opportunities

### For Startups & Inventors
- **Novelty Checks**: Assess patentability without $2,000+ attorney fees
- **FTO Screening**: Identify infringement risks before product launch
- **Strategic IP**: Understand competitive landscape for investor pitches
- **Cost-Effective**: Access professional-grade search at startup-friendly prices

### For Corporate Legal Teams
- **Portfolio Valuation**: Assess patent strength for M&A due diligence
- **Litigation Support**: Find invalidating prior art for defense
- **Licensing Analysis**: Identify potential licensing targets
- **Risk Management**: Ongoing FTO monitoring for product pipelines

### For Researchers & Universities
- **Publication Planning**: Check if invention is already patented
- **Tech Transfer**: Identify commercialization opportunities
- **Grant Applications**: Prior art searches for NIH/NSF proposals
- **Collaboration Discovery**: Find companies working in your area

## 💰 Value Proposition

### Time Savings
- Traditional search: 4-8 hours @ $400/hr = $1,600-$3,200
- PatentAI search: 5 minutes = **95% time reduction**
- ROI for law firms: $322,400/year additional billable capacity per associate

### Cost Savings
- Traditional tools: $10,000-$50,000/year per user
- PatentAI: $49-$299/month = **90%+ cost reduction**
- Startup ROI: $500K product investment protected with $50 search

### Risk Reduction
- One avoided invalid patent: $100,000+ savings
- One avoided infringement case: $1M-$10M+ savings
- Better search quality through AI semantic matching

## 🔒 Security

- Secure API key management
- Sandboxed code execution via Daytona
- No storage of sensitive patent strategies
- HTTPS encryption for all API calls
- Local model support for confidential work (Ollama/LM Studio)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgments

- Built with [Valyu](https://platform.valyu.ai) - The unified patent data API
- Powered by [Daytona](https://daytona.io) - Secure code execution
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Local models via [Ollama](https://ollama.com) and [LM Studio](https://lmstudio.ai)

---

<p align="center">
  Made with ❤️ for patent professionals, inventors, and innovators
</p>

<p align="center">
  <a href="https://twitter.com/ValyuNetwork">Twitter</a> •
  <a href="https://www.linkedin.com/company/valyu-ai">LinkedIn</a> •
  <a href="https://github.com/yourusername/patentai">GitHub</a>
</p>
