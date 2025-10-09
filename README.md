# Patents

> **The world's most comprehensive open-source patents AI assistant** — Search and analyze the entire USPTO corpus, track innovation trends, link patents to federal spending and grants data, and uncover emerging technologies — all through natural conversation.

🚀 **[Try the live demo at patents.valyu.ai](https://patents.valyu.ai)**

![Patents by Valyu](public/patents.png)

## Why Patents?

Traditional patent research is fragmented across disconnected databases and complex search interfaces. Patents changes everything by providing:

- **📜 Complete USPTO Coverage** - Search and analyze the entire United States Patent and Trademark Office corpus
- **🔍 One Unified Search** - Powered by Valyu's comprehensive patents data API
- **🐍 Advanced Analytics** - Execute Python code in secure Daytona sandboxes for patent analysis, trend visualization, and competitive intelligence
- **📊 Interactive Visualizations** - Beautiful charts for innovation trends, technology landscapes, and patent portfolios
- **💰 Federal Spending Links** - Connect patents to government grants and federal R&D spending data
- **🚀 Emerging Tech Detection** - Identify breakthrough technologies and innovation patterns
- **🌐 Real-Time Intelligence** - Web search integration for latest patent filings and IP news
- **🏠 Local AI Models** - Run with Ollama for unlimited, private queries using your own hardware
- **🎯 Natural Language** - Just ask questions like you would to a colleague

## Key Features

### 🔥 Powerful Patent Intelligence Tools

- **USPTO Search** - Search and analyze patents from the complete USPTO database with full-text and classification data
- **Innovation Tracking** - Monitor technology trends, patent filing patterns, and emerging innovations
- **Federal Funding Analysis** - Link patents to federal grants, SBIR/STTR awards, and government R&D spending
- **Technology Mapping** - Visualize technology landscapes and competitive positioning
- **Patent Analytics** - Analyze patent portfolios, citation networks, and prior art
- **Comprehensive Search** - Cross-reference patents, grants, and research publications in one query

### 🛠️ Advanced Tool Calling

- **Python Code Execution** - Run patent analytics, ML models for classification, and custom data processing
- **Interactive Charts** - Create publication-ready visualizations of patent trends and landscapes
- **Multi-Source Research** - Automatically aggregates data from patents, grants, and literature
- **Export & Share** - Download results, share analyses, and collaborate

## 🚀 Quick Start

### Prerequisites

**For Cloud Usage:**
- Node.js 18+
- npm or yarn
- OpenAI API key
- Valyu API key (get one at [platform.valyu.ai](https://platform.valyu.ai))
- Daytona API key (for code execution)

**For Local AI Models:**
- All of the above, plus:
- [Ollama](https://ollama.com) installed and running
- At least one model installed (qwen2.5:7b recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yorkeccak/patents.git
   cd patents
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:
   ```env
   # OpenAI Configuration
   OPENAI_API_KEY=your-openai-api-key

   # Valyu API Configuration
   VALYU_API_KEY=your-valyu-api-key

   # Daytona Configuration (for Python execution)
   DAYTONA_API_KEY=your-daytona-api-key
   DAYTONA_API_URL=https://api.daytona.io  # Optional
   DAYTONA_TARGET=latest  # Optional

   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000  # Your deployment URL in production

   # Ollama Configuration (Optional - for local models)
   # By default, Ollama support is DISABLED for production mode
   # To enable Ollama support, uncomment the line below:
   # NEXT_PUBLIC_APP_MODE=development  # Enable local model support (use "development" or "production")
   OLLAMA_BASE_URL=http://localhost:11434  # Default Ollama URL
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Check your configuration (optional)**
   ```bash
   npm run check-config
   ```
   This will show you whether Ollama support is enabled or disabled.

6. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

### 🏠 Local Model Setup (Optional)

**Note**: By default, Ollama support is **disabled** for production mode. The app will use OpenAI/Vercel AI Gateway with rate limiting (5 queries/day).

For unlimited, private queries using your own hardware:

1. **Install Ollama**
   ```bash
   # macOS
   brew install ollama

   # Or download from https://ollama.com
   ```

2. **Start Ollama service**
   ```bash
   ollama serve
   ```

3. **Install recommended models**
   ```bash
   # Best for tool calling (recommended)
   ollama pull qwen2.5:7b

   # Alternative options
   ollama pull qwen2.5:14b    # Better but slower
   ollama pull llama3.1:7b    # Good general performance
   ```

4. **Switch to local model**

   Click the "Local Models" indicator in the top-right corner of the app to select your model.

**Model Recommendations:**
- **Qwen2.5:7B+** - Excellent for tool calling and patent analysis
- **Llama 3.1:7B+** - Good general performance with tools
- **Avoid smaller models** - Many struggle with complex function calling

## 💡 Example Queries

Try these powerful queries to see what Patents can do:

- "Search for recent AI patents filed by Google and analyze their technology focus"
- "What are the emerging trends in quantum computing patents over the last 5 years?"
- "Find patents related to CRISPR gene editing that received SBIR funding"
- "Analyze Tesla's battery technology patent portfolio and citation network"
- "Compare patent filing rates in renewable energy across major tech companies"
- "Show me breakthrough biotechnology patents linked to NIH grants"

**With Local Models (Ollama):**
- Run unlimited queries without API costs
- Keep all your patent research completely private
- Perfect for competitive intelligence and proprietary research

## 🏗️ Architecture

- **Frontend**: Next.js 15 with App Router, Tailwind CSS, shadcn/ui
- **AI**: OpenAI GPT-4 with function calling + Ollama for local models
- **Data**: Valyu API for comprehensive patent data (USPTO, federal grants, R&D spending)
- **Code Execution**: Daytona sandboxes for secure Python execution
- **Visualizations**: Recharts for interactive charts
- **Real-time**: Streaming responses with Vercel AI SDK
- **Local Models**: Ollama integration for private, unlimited queries

## 🔒 Security

- Secure API key management
- Sandboxed code execution via Daytona
- No storage of sensitive research data
- HTTPS encryption for all API calls
- Privacy-focused architecture for competitive intelligence

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgments

- Built with [Valyu](https://platform.valyu.ai) - The unified patents and innovation data API
- Powered by [Daytona](https://daytona.io) - Secure code execution
- UI components from [shadcn/ui](https://ui.shadcn.com)

---

<p align="center">
  Made with ❤️ by the Valyu team
</p>

<p align="center">
  <a href="https://twitter.com/ValyuNetwork">Twitter</a> •
  <a href="https://www.linkedin.com/company/valyu-network">LinkedIn</a> •
  <a href="https://github.com/yorkeccak/patents">GitHub</a>
</p>
