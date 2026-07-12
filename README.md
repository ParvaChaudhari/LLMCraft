# ??? LLMCraft

LLMCraft is an interactive, visually-driven workflow builder for chaining Large Language Models (LLMs) and APIs. Instead of a traditional drab node editor, LLMCraft visualizes your logic as a bustling **isometric city** (with a classic "pipeline" mode available, too!). Build pipelines that connect Gemini, ChatGPT, Claude, and custom HTTP endpoints with conditional logic and rate limiting.

## ? Features

- **Isometric City Canvas**: A unique, playful UI powered by React Flow that renders your workflow as a city connected by roads.
- **Multi-Model Support**: Native nodes for **Gemini**, **ChatGPT**, and **Claude**.
- **Secure Secret Manager**: Store and manage your API keys locally using secure encryption.
- **Standalone Execution & Pinning**: Run individual nodes in isolation, and "pin" (cache) their outputs to avoid repeating expensive API calls.
- **Robust Background Processing**: Uses **BullMQ** and **Redis** for reliable, asynchronous queue execution.
- **Real-time Feedback**: Server-Sent Events (SSE) provide live updates and animations on the canvas as your workflow executes.

## ?? Getting Started

### Prerequisites

To run LLMCraft locally, you'll need:
1. **Node.js** (v18+ recommended)
2. **Redis**: A running Redis instance (either locally or via a cloud provider like Upstash) for the BullMQ job queue.

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd LLMCraft
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory and add your Redis URL (and optionally any local API keys if you prefer not to use the UI Secret Manager).
   ```env
   # Required for BullMQ execution queue
   REDIS_URL=redis://127.0.0.1:6379

   # Optional: Encryption key for the Secret Manager (32-character string)
   ENCRYPTION_KEY=your-secure-32-character-encryption-key-here
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open the app:**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser to start building!

## ??? Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, React Flow
- **Backend**: Next.js API Routes (Node.js)
- **Queueing**: BullMQ & ioredis
- **Database/Storage**: Prisma (SQLite/PostgreSQL)

## ?? How to use the Workflow Builder

1. **Add Nodes**: Open the toolbox on the left side of the screen to drag and drop elements into your city.
2. **Connect Roads**: Drag connections from the output handle (right) of one node to the input handle (left) of another.
3. **Configure Nodes**: Click on any node to open the right-hand **Side Panel**. Here you can set prompts, configure limits, select API models, and map variables using `{{node_id}}` syntax.
4. **Manage Secrets**: Click the key icon in the toolbox to open the Secret Manager and securely store your API keys.
5. **Run Workflow**: 
   - Click the global **Run** button (top right) to execute the entire graph from the Webhook trigger.
   - Or, select a specific node and use the **? Execute Node** button in the side panel for a standalone run. Use the **?? Pin** button to cache its output!

---

*Built with ?? for prompt engineers and automation enthusiasts.*
