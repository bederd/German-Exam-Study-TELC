# DEUTSCHFIT - TECHNICAL HANDOVER & SYSTEM ARCHITECTURE
**Target Audience:** AI Agents / LLMs (Technical Context)
**Project Status:** Setup & Pipeline Complete, Data Generation Phase

## 1. Project Overview & Architecture
- **Objective:** An offline-first, mobile-friendly PWA for TELC format German language practice (A1+, A2+, B1+).
- **Tech Stack:** Vanilla JavaScript (ES6 Modules), HTML5, Vanilla CSS (Glassmorphism, no external frameworks).
- **Core State Engine:** Global `DeutschFit` object managing state, gamification (XP, streaks, dynamic difficulty scoring), and hash-based SPA routing.
- **Data Layer:** Entirely static, offline JSON files (`app/data/a1.json`, etc.) conforming to a strict schema (id, titel, text, quelle, fragen[typ, frage, optionen, antwort, erklaerung]).

## 2. The Core Problem: Token-Free AI Data Pipeline
The user required parsing massive 200+ page German textbooks (PDFs) to extract "Lesen" (Reading) texts and generate TELC-compliant questions. 
**Constraints:** Zero API budget. Must prevent hallucination. Must prevent context-window overflow and web-model rate limits.

### 2.1 API Proxy Integration (OpenClaw Zero Token)
- **Tool Used:** `linuxhsj/openclaw-zero-token`
- **Methodology:** Hijacks active browser sessions (ChatGPT, Claude, DeepSeek) via CDP (Playwright) to expose a local, token-free OpenAI-compatible API endpoint at `http://127.0.0.1:3001/v1/chat/completions`.
- **Environment Hack:** OpenClaw's build system relied on WSL/Bash. This was bypassed natively on Windows by rewriting the `canvas:a2ui:bundle` script in `package.json` to execute `pnpm exec tsc` and `pnpm dlx rolldown` directly via CMD/PowerShell.

### 2.2 Modular Data Pipeline (The Solution)
Feeding a 200-page visual textbook PDF directly to a Web-tier LLM causes catastrophic failure (hallucination, context overflow, rate limiting). The pipeline was architected into two decoupled stages:

#### Stage 1: Extraction & Human-in-the-loop Filtering (`1_pdf_to_text.py`)
- **Lib:** `PyMuPDF` (fitz)
- **Action:** Dumps the entire PDF into a raw `.txt` file, inserting `=== SAYFA X ===` markers.
- **Purpose:** Allows the user to quickly perform a manual sanity pass via VS Code to delete huge blocks of noise (e.g., 20-page glossaries, table of contents) before hitting the AI.

#### Stage 2: AI Chunking & Generation (`2_text_to_json.py`)
- **Action:** Reads the sanitized `.txt` and splits it into logical chunks (default: 10 pages per chunk) using Regex on the page markers.
- **Batch Processing:** Iterates over chunks and posts to the OpenClaw API sequentially.
- **System Prompting Strategy:** 
  - `temperature: 0.0` (Zero creativity, strictly extraction/formatting).
  - *Hunter & Generator Logic:* Instructed to act as a data-miner. First, scan the noise to extract *only* "Lesen" paragraphs. Ignore grammar tables/exercises.
  - *Micro-learning Constraint:* If an extracted text > 80 words, split it into 60-80 word logical chunks.
  - *Generation Constraint:* Produce exactly 1 TELC-format multiple-choice (`mc`) or True/False (`rfn`) question per chunk.
  - *Formatting:* Enforced strict JSON array `[]` output via negative prompting against markdown blocks or conversational padding.
- **Aggregation:** Parses valid JSON responses from all chunks and aggregates them into a final `taslak_[level].json` payload, ready to be copied into the PWA's data layer.

## 3. Next Steps / Continuation
- The system is fully ready for the user to execute `1_pdf_to_text.py` and `2_text_to_json.py`.
- Any subsequent AI agent modifying this project must adhere strictly to the Vanilla JS/CSS architecture and maintain the token-free OpenClaw paradigm for dynamic generations.
