# Project Build Plan — City-Builder Automation Tool

Working name:Brickflow

## Core principle
Gray boxes before assets. Function before polish. Don't open Midjourney until Phase 1 is clickable.

---

## Phase 0 — Setup (½ day)

- [ ] `npx create-next-app@latest cityflow --typescript --tailwind --app`
- [ ] `cd cityflow && npm install @xyflow/react`
- [ ] Push to a GitHub repo, deploy empty shell to Vercel (so you have a live URL from day one)
- [ ] Set up Supabase project (free tier) — just create it, don't wire it up yet

**Done when:** blank Next.js app is live on a Vercel URL.

---

## Phase 1 — Gray box canvas (1–2 weekends)

Goal: prove the drag/connect interaction feels good. Nothing needs to look good or do anything real yet.

- [ ] Add a full-screen React Flow canvas to the main page
- [ ] Create 3 placeholder node types as plain `<div>`s with a border + label:
  - "GPT Factory"
  - "Anthropic Factory"
  - "Webhook"
- [ ] Make nodes draggable onto the canvas (React Flow gives you this by default)
- [ ] Connect nodes with default straight-line edges
- [ ] Click a node → side panel slides in with a fake form (just inputs, no real config logic yet)
- [ ] Add a "Run" button that does nothing yet except console.log the graph structure

**Done when:** you can drag 3 boxes onto a canvas, connect them with lines, click one to see a panel, and the layout state is visible in the console.

---

## Phase 2 — One real working automation (1–2 weekends)

Goal: make it actually do something, even if ugly.

- [ ] Pick ONE integration: OpenAI API (easiest, you already know the shape)
- [ ] Build a simple sequential execution function (no queue/engine yet):
  - Trigger node → OpenAI node → Output node
  - Each node is just a function call in order
- [ ] Store the OpenAI API key in a `.env.local` file for now (real key management comes later)
- [ ] "Run" button actually calls OpenAI and renders the result in the Output node
- [ ] Add a loading state on the node while it's running (this is your first taste of "trucks moving" — even a simple spinner)

**Done when:** one real workflow runs end to end and shows a real OpenAI response on the canvas.

---

## Phase 3 — Foundation hardening (1 weekend)

Before adding more nodes, make the foundation solid so Phase 5+ doesn't become spaghetti.

- [ ] Move execution logic into a proper API route (`/api/execute`)
- [ ] Add Supabase tables:
  - `workflows` (id, user_id, name, graph_json, created_at)
  - `executions` (id, workflow_id, status, started_at, result_json)
- [ ] Save/load a workflow graph to/from Supabase (JSON column for nodes + edges)
- [ ] Basic auth via Supabase Auth (email magic link is fastest to set up)

**Done when:** you can save a workflow, refresh the page, and load it back.

---

## Phase 4 — Expand node library (ongoing, gray boxes still)

Now that the pattern is proven, add more node types as plain boxes first:

- [ ] HTTP Request node
- [ ] Webhook trigger (real, receives an actual POST)
- [ ] Conditional / if-else node (the "checkpoint" concept)
- [ ] Delay node (the "truck stop" concept)

**Done when:** you have 6–8 working node types, all still gray boxes, all functionally real.

---

## Phase 5 — Execution engine upgrade (as needed)

Only do this once Phase 4 nodes expose real limits in the simple sequential function (e.g. you need retries, parallelism, or long-running waits).

- [ ] Add Redis (Upstash free tier is easiest to start, no server to manage)
- [ ] Add BullMQ for job queueing
- [ ] Move execution from "one function call" to "queued jobs per node"
- [ ] Add retry logic (this is your "repair depot" mechanic)

**Done when:** workflows survive a server restart mid-execution and retries work.

---

## Phase 6 — Assets (now it's time)

You now know exactly which node types survived and what shape they need to be.

- [ ] Decide on style direction using the Midjourney/Leonardo/Gemini prompts already drafted
- [ ] Generate one building + confirm style works as a `--sref` / reference anchor
- [ ] Generate the rest of the building set using that anchor for consistency
- [ ] Generate road tile set (straight, corner, T-junction)
- [ ] Generate 1–2 truck/car sprites

**Done when:** you have a consistent asset set covering every node type from Phase 4.

---

## Phase 7 — Swap gray boxes for assets (1 weekend)

- [ ] Build a custom React Flow node renderer that takes an image prop
- [ ] Swap each `<div>` node for its isometric building image
- [ ] Replace default straight edges with a custom edge component styled as a road
- [ ] Position nodes so roads visually connect to each building's edge (may need fixed "ports" per building image)

**Done when:** the canvas looks like a city instead of a flowchart.

---

## Phase 8 — Trucks moving (polish, the "wow" moment)

- [ ] Animate a small truck/car icon moving along the edge path during execution (CSS `offset-path` or `framer-motion` along an SVG path)
- [ ] Tie animation timing to actual execution status (truck arrives when the node finishes, not on a fixed timer)
- [ ] Add visual states: truck idle at building (waiting), truck moving (running), truck broken down (error → routes to repair depot if you built that node)

**Done when:** running a workflow visually feels like watching traffic move through a city.

---

## What NOT to do early
- Don't reskin n8n's codebase — see earlier reasoning, it fights you at every step
- Don't build a graph database — Postgres JSON columns are enough
- Don't generate final assets before Phase 4 — you will redo them
- Don't build the full execution engine (Temporal-grade) until simple sequential calls actually break

## Stack summary
| Layer | Tool |
|---|---|
| Canvas | React Flow (`@xyflow/react`) |
| Frontend | Next.js + Tailwind |
| DB | Supabase (Postgres) |
| Execution queue | Redis (Upstash) + BullMQ |
| Auth | Supabase Auth |
| Hosting | Vercel |
| Asset generation | Midjourney / Leonardo / Gemini |
