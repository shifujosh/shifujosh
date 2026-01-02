# JACQ: The Cognitive Operating System

> *"Stop Fraying. Start Finishing."*

**Status:** Active Development (Beta)  
**Role:** Product Architect  
**Stack:** Next.js 16 (App Router), Tailwind 4, DuckDB (WASM), Gemini 2.5 Pro

---

## 🛑 The Problem: "Context Amnesia"

Modern work is fragmented. We shift between Slack, Jira, Notion, and VS Code. AI tools (ChatGPT, Claude) are powerful but ephemeral—they have "Context Amnesia." They don't know who you are, what you did yesterday, or what your long-term goals are.

I wanted an OS that:
1.  **Remembers** everything (Entity-Graph Memory).
2.  **Lives** where I work (Integrated into the IDE/Browser).
3.  **Learns** my preferences over time.

---

## ⚡ The Solution: A "Cyborg" Workflow

JACQ (Just Another Cognitive Query) is a **Local-First** cognitive layer that sits on top of your existing tools. It uses a graph database to map connections between your Projects, People, and Ideas.

### Key Architectural Patterns
-   **[Memory Sync Engine](../architecture-patterns/memory_sync_engine.ts)**: A "Glacial Drift" architecture that moves active session data (Hot) into long-term vector storage (Cold) automatically.
-   **Universal Graph**: Every interaction is stored as a node (Subject -> Predicate -> Object). "Joshua (Entity) -> isworkingOn (Predicate) -> Specter (Entity)."
-   **Local-First AI**: Uses **DuckDB WASM** to run the entire SQL/Vector database in the browser/client, ensuring zero latency and total privacy.

---

## 🛠️ Tech Stack & Implementation

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 | React Server Components for maximum performance. |
| **Logic** | TypeScript / Zod | Strong typing for all AI interactions. |
| **Database** | DuckDB (Local) + Firebase (Sync) | Hybrid storage for speed and flexibility. |
| **AI** | Vertex AI (Gemini) | Long-context understanding (1M+ tokens). |

### The "Self-Healing" Parser
To make JACQ reliable enough for code generation, I built the **[Structured LLM Parser](../architecture-patterns/structured_llm_parser.ts)**. It wraps every LLM call in a "Zod Harness," automatically retrying and sanitizing outputs if the models stray from the strict JSON schema.

---

## 🚀 Impact

*   **10x Velocity**: Used JACQ to build *itself* and the Specter bot.
*   **Zero Context Switching**: The "Chat with Codebase" feature allows me to query my entire repo history without leaving the editor.
*   **Cost Efficiency**: By using local embeddings and caching, I reduced API costs by 90% compared to standard RAG implementations.

---

[⬅️ Back to Portfolio](../README.md)
