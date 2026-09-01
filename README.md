# 🏙️ LLMCraft

LLMCraft is an interactive, visually-driven AI workflow builder. Instead of a traditional node editor, LLMCraft renders your logic as a bustling **isometric city** — every AI model is a factory, every API call is a road connecting buildings. Build pipelines that chain Gemini, ChatGPT, Claude, custom HTTP endpoints, web search, databases, and code execution, all with a real-time visual feedback loop.

---

## ✨ Features

### 🤖 Multi-Model AI with Agent Mode
- **Native nodes** for **Gemini**, **ChatGPT**, and **Claude**.
- **Agent Mode** — enable multi-step tool-calling loops on any AI node. The model automatically decides which tools to invoke, executes them, and synthesizes a final answer. Configurable with **Max Tool Rounds** and a custom **System Prompt**.
- Built-in support for **Gemini Function Declarations**, **OpenAI tool_choice**, and **Anthropic tool_use** — each model's native API format is used automatically.

### 🔧 Callable Tool Nodes
Any of the following nodes can be registered as an **agent-callable tool** by giving it a Tool Name, Description, and JSON Schema. An AI agent can then invoke these dynamically during execution.

### 🏙️ Isometric City Canvas
- Unique, playful UI powered by **React Flow** — your workflow is a city with roads.
- Drag-and-drop nodes from the **Toolbox** onto the canvas, connect them with roads.
- Real-time **node status animations** (pulsing, success glow, error states) during execution.
- **Billboard node** displays the last output directly on the canvas tile.

### 🔑 Secure Secret Manager
- Store and manage API keys locally using AES-256 encryption.
- Credential providers supported:`openai`, `anthropic`, `tavily`, `supabase`.

### ⚡ Robust Queue Execution
- **BullMQ** + **Redis** power an asynchronous, reliable job queue.
- **Server-Sent Events (SSE)** deliver real-time logs and status updates to the canvas as each node executes.
- **Pin** any node's output to cache it and skip expensive re-runs.
- **Array processing** — if a node receives an array, it fans out and executes once per item.

### 🔀 Workflow Logic Nodes
- **Conditional** — branch the flow based on a JS expression.
- **Delay** — pause execution for a set duration.
- **Rate Limiter (Clocktower)** — cap how many times a flow can run per window.
- **Merge** — combine multiple upstream outputs into one.
- **Variable** — inject static or dynamic values into the context.
- **Checkpoint** — save intermediate results mid-workflow.
- **Sorting Facility** — sort and filter arrays.

---

## 🗺️ Node Glossary

| Node | Description |
|---|---|
| **Gemini Factory** | Google Gemini AI (Flash Lite, Pro, etc.) |
| **ChatGPT Factory** | OpenAI GPT-4o, GPT-4 Turbo, etc. |
| **Claude Factory** | Anthropic Claude 3.5 Sonnet, Haiku, etc. |
| **Watchtower** | Live web search via Tavily API — callable tool |
| **HTTP Request** | Generic HTTP fetch (GET/POST/PUT/DELETE) — callable tool |
| **DB Silo** | PostgreSQL SQL query node — callable tool |
| **Supabase Center** | Supabase vector search and embeddings — callable tool |
| **Custom Workshop** | Run sandboxed JavaScript with custom logic — callable tool |
| **Webhook** | Trigger workflow via inbound HTTP POST |
| **Webhook Response** | Return structured HTTP response with headers & status code |
| **Post Office** | Send emails (SMTP / SendGrid) |
| **Billboard** | Display last output as a canvas tile |
| **Output / Delivery Dock** | Workflow terminal output |
| **Art Studio** | Image generation (DALL-E, Stable Diffusion) |
| **Recording Studio** | Audio/voice generation |
| **Print Shop** | Web scraper / HTML content fetcher |
| **Object Storage** | File / blob storage integration |
| **Text Refinery** | String manipulation & transformation |
| **Library** | Document retrieval / knowledge base lookup |
| **Sawmill** | Structured data parser (JSON, CSV, XML) |
| **GitHub** | GitHub API integration |
| **Google Drive** | Google Drive file read/write |
| **Apify** | Apify scraping actor integration |
| **Airport** | Batch job dispatcher |
| **Merge** | Combine multiple upstream inputs |
| **Conditional** | Branch logic via JS expression |
| **Rate Limiter (Clocktower)** | Execution throttle per time window |
| **Delay** | Pause workflow execution |
| **Checkpoint** | Save intermediate state |
| **Sorting Facility** | Sort / filter arrays |
| **Variable** | Static or dynamic value injection |

---

## 🚀 Getting Started

### Prerequisites

1. **Node.js** v18+
2. **Redis** — a running Redis instance (local or cloud, e.g. [Upstash](https://upstash.com))

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd LLMCraft

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Required — BullMQ job queue
REDIS_URL=redis://127.0.0.1:6379

# Required — AES-256 encryption for the Secret Manager (any 32-char string)
ENCRYPTION_KEY=your-secure-32-character-encryption-key

# Optional — fallback Gemini key (skip if using the Secret Manager UI)
GEMINI_API_KEY=your-gemini-api-key
```

```bash
# 4. Start the dev server
npm run dev

# 5. Open the app
open http://localhost:3000
```

---

## 🛠️ How to Build a Workflow

1. **Add Nodes** — Open the Toolbox (left panel) and drag buildings onto the city canvas.
2. **Connect Roads** — Drag from the **output handle** (right side) of one node to the **input handle** (left side) of another. AI nodes also have an amber **tool input handle** (top-right corner) for connecting callable tool nodes.
3. **Configure Nodes** — Click any node to open the **Side Panel**. Set prompts, models, HTTP configs, SQL queries, or tool parameters.
4. **Use Variables** — Reference any previous node's output using `{{node_id}}` syntax in any text field.
5. **Enable Agent Mode** — On an AI Factory node, toggle **Agent Mode** in the Side Panel. Connect callable tool nodes (Watchtower, HTTP Request, etc.) to the amber tool handle, configure their Tool Name / Description / Schema, and the AI will call them autonomously.
6. **Manage Secrets** — Click the 🔑 key icon in the Toolbox to open the Secret Manager and store your API keys securely.
7. **Run Workflow** — Hit the global **▶ Run** button (top right) to execute from the Webhook trigger, or select a node and click **⚡ Execute Node** in the Side Panel for a standalone run.
8. **Pin Outputs** — Use the **📌 Pin** button to cache a node's result and skip re-running it.

---


## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js (App Router) |
| **Canvas** | React Flow |
| **Queue** | BullMQ + ioredis |
| **Real-time** | Server-Sent Events (SSE) |
| **Database** | Prisma (SQLite / PostgreSQL) |
| **Encryption** | Node.js `crypto` (AES-256-GCM) |
| **AI SDKs** | `@google/generative-ai`, OpenAI REST, Anthropic REST |
| **Styling** | Tailwind CSS + CSS custom properties |

---

*Built with ❤️ for prompt engineers and AI automation enthusiasts.*
