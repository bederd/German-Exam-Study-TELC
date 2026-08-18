# AI Data Pipeline & System Architecture

**Target Audience:** AI Agents / LLMs (Technical Context) & Developers  
**Project Status:** Setup & Pipeline Complete, Ready for Data Generation  

## 1. Project Overview & Architecture
- **Objective:** An offline-first, mobile-friendly PWA for TELC format German language practice (A1+, A2+, B1+).
- **Tech Stack:** Vanilla JavaScript (ES6 Modules), HTML5, Vanilla CSS (Glassmorphism, no external frameworks).
- **Core State Engine:** Global `DeutschFit` object managing state, gamification (XP, streaks, dynamic difficulty scoring), and hash-based SPA routing.
- **Data Layer:** Entirely static, offline JSON files (`app/data/[level].json`) conforming to a strict schema.

## 2. The Core Problem: Automated Data Generation
The challenge was parsing massive 200+ page German textbooks (PDFs) to extract reading texts ("Lesen") and generate TELC-compliant multiple-choice questions automatically, without running into hallucination, context window limits, or excessive API costs.

To solve this, the pipeline is architected into a **Multi-Agent** workflow.

## 3. Pipeline Workflow: From PDF to JSON

If you want to generate your own data using your textbooks, follow this multi-step standard operating procedure:

### Stage 1: Extraction & Human-in-the-loop Filtering (`1_pdf_to_text.py`)
- **Objective:** Dump the entire visual PDF into a raw `.txt` file for the AI and Python scripts to read.
- **Action:** Uses `PyMuPDF` to convert the PDF to text, inserting `=== PAGE X ===` markers.
- **Human Step:** The user should quickly perform a manual sanity pass in a text editor to delete huge blocks of noise (e.g., 20-page glossaries, table of contents).

### Stage 2: Heuristic Text & Question Block Detection (`2a_extract_raw_texts.py`)
- **Objective:** Filter out grammar tables and extract only the reading passages with their original textbook questions.
- **Action:** The script searches for keywords like *"Lesen Sie"*, *"Eine E-Mail"*, etc., and pulls the text and the question block beneath it until a new section begins.

### Stage 3: AI Chunking & Generation (`2b_process_with_ai.py` / Agentic Processing)
- **Objective:** Clean the text and generate proper JSON formatted questions (Multiple Choice or True/False).
- **Agentic Workflow:**
  1. **Batch Filtering:** Subagents classify whether a text is a valid "Lesetext".
  2. **Batch Chunking:** Long texts are broken down into 20-80 word micro-learning chunks.
  3. **Batch Question Generation:** 15-20 parallel subagents read the chunks and output a strict JSON array of questions, adhering strictly to the TELC format.
- **Output:** A sanitized `[level]_final.json` payload.

### Stage 4: Database Injection (`3_merge_to_app.py`)
- **Objective:** Inject the JSON payload into the main web application's data layer.
- **Action:** Merges the newly generated data without deleting existing data. It creates a `.bak` backup of the old database for safety.

---

> **AGENT INSTRUCTION:** 
> When requested to process a new level (e.g. "Run the DeutschFit pipeline for A2 data"), **DO NOT** attempt to read the entire PDF in the chat or generate questions manually from memory. **Strictly execute the 4-stage pipeline** documented above using Python scripts and background subagents. Always use `manage_subagents` with `Action: "kill_all"` to clean up memory after generation steps.
