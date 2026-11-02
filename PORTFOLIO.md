# JARVIS-Study — Portfolio Case Study

## Project summary

**JARVIS-Study is a local-first AI study workspace that combines personal learning tools with a permission-aware AI assistant.**

Instead of building another chat-only chatbot, the project organises the complete study loop: decide what to learn, focus on one task, capture useful knowledge, practise retrieval, and inspect progress. An AI assistant supports explanations and research while keeping browser and GitHub capabilities deliberately narrow.

**Project type:** Full-stack AI productivity application  
**Status:** Local portfolio prototype  
**Runtime:** Node.js 20+  
**Backend:** Express 5  
**Frontend:** HTML, CSS, vanilla JavaScript modules  
**AI layer:** OpenAI Responses API  
**Storage:** Browser localStorage  
**Quality:** Node built-in test runner and GitHub Actions checks

## The problem

Students often spread their workflow across unrelated tools: task lists, timers, notes, flashcards, and an AI chat window. This creates friction between planning, doing, and remembering.

JARVIS-Study explores a unified experience with three connected stages:

1. **Plan:** translate a learning goal into a manageable task.
2. **Focus and capture:** complete a timed session and save useful notes.
3. **Retain and reflect:** practise active recall, review due flashcards, and inspect study history.

The AI assistant is a supporting capability rather than the entire product.

## Product modules

### 1. Study Command Center
A central dashboard displays open tasks, focus minutes, study streak, completed tasks, and the next actions. The goal is to make the next useful action obvious.

### 2. Study planner
Tasks can have a subject, target date, estimated duration, and priority. Users can filter the list, mark work complete, and remove tasks. The overview reuses the same task data.

### 3. Focus room
The timer supports focus, short-break, and long-break modes. It stores an end timestamp so a running session can be reconstructed after a page refresh. Completed focus sessions contribute to progress analytics.

### 4. Progress analytics
The progress view aggregates completed focus sessions into a seven-day chart, subject totals, streak, and a recent-session list. The interface derives its metrics from saved records rather than hardcoded demo numbers.

### 5. Knowledge Vault
The vault stores searchable notes and editable note records. Flashcards support front/back active recall and a lightweight interval schedule:

| Rating | Scheduling behaviour |
|---|---|
| Again | Return in 1 day and reset the interval |
| Good | Advance to the next interval |
| Easy | Advance by two intervals |
| Available intervals | 1, 3, 7, 14, 30, 60 days |

This is intentionally a transparent, simple scheduler. It is not presented as a validated cognitive-science model.

### 6. Workspace portability
A versioned JSON backup includes planner tasks, focus sessions, notes, flashcards, and the weekly goal. Import validates the basic schema and asks before replacing local data.

### 7. JARVIS assistant
The assistant uses the OpenAI Responses API. Its available capabilities include web search, a restricted read-only browser reader, read-only GitHub repository/file inspection, and a separately confirmed GitHub issue-publishing flow.

### 8. Installable offline shell
A web app manifest and service worker provide an installable app shell and cache static assets after the first successful load. API requests are not cached; AI functions still require the server and network.

## Engineering decisions

### Local-first persistence
The study workspace uses browser localStorage to avoid introducing a database, account service, or hosting dependency for a single-user portfolio prototype. The notes and planner are not sent to the AI server during normal operation.

**Trade-off:** browser storage is device-specific and can be cleared. The JSON backup provides portability, but not automatic cloud synchronisation.

### Separation of concerns
The application separates the main workspace and the Knowledge Vault into distinct browser modules and storage keys. Reusable review-scheduling and focus-aggregation functions live in public/study-core.js, which makes important logic testable without a browser.

### Narrow AI tools
The assistant is not given arbitrary shell or desktop access. Browser reading and GitHub operations are implemented as named, constrained server tools. Publishing an issue requires a separate user-facing review and confirmation.

### Server-side secrets
API credentials are read from .env on the server. They are not included in client-side code. .env is ignored by Git and .env.example documents the expected configuration.

### Progressive enhancement
The core study workflow works without an AI request. Browser voice input is optional and depends on support. The service worker caches only static same-origin resources and deliberately skips API requests.

## Architecture

~~~mermaid
flowchart TD
  U[Student] --> UI[Responsive browser workspace]
  UI --> W[Planner and Focus]
  UI --> K[Knowledge Vault]
  W --> LS1[(Workspace localStorage)]
  K --> LS2[(Vault localStorage)]
  UI --> B[Versioned JSON backup]
  UI --> API[Express local server]
  API --> AI[OpenAI Responses API]
  AI --> WS[Web search]
  AI --> BR[Allowlisted read-only browser]
  AI --> GH[Constrained GitHub tools]
  GH --> C[Explicit publish confirmation]
~~~

## Quality and validation

- npm run check runs JavaScript syntax checks for the server and browser modules.
- npm test exercises the review scheduler and focus-time aggregation using Node's built-in test runner.
- GitHub Actions runs the same checks on pushes and pull requests.
- The current automated tests are unit and static checks. They do not establish complete browser, accessibility, provider, or security correctness.

## Security model and honest scope

This repository is a local portfolio prototype, not a production multi-user AI service.

Current design boundaries:
- no arbitrary shell execution;
- no unrestricted desktop automation;
- HTTPS host allowlist for the browser reader;
- read-only GitHub inspection;
- explicit confirmation for GitHub issue publishing;
- server-side environment variables for API credentials;
- local browser storage for personal study data.

A public deployment would require, at minimum, authentication, session controls, HTTPS, CSRF protection, rate limits, secure secrets management, audit logs, hardened outbound network controls, and a review of multi-user authorization boundaries. These are listed as future work rather than claimed as completed.

## Two-minute demo script

**Opening:** “JARVIS-Study is a local-first learning workspace. I designed it around the study lifecycle instead of making it only an AI chat interface.”

**Planner:** create a task with a subject, deadline, and priority. Explain how it appears on the overview.

**Focus:** start a short focus timer and explain how the end timestamp allows the timer to resume after a refresh.

**Knowledge Vault:** create a note, turn a concept into a flashcard, reveal the answer, and schedule the next review.

**Progress:** show the weekly goal and the chart derived from completed focus sessions.

**AI and safety:** ask JARVIS for a concept explanation or research task. Explain that AI requests go through the local server, browser reading is allowlisted, and GitHub publishing requires explicit confirmation.

**Close:** “The project demonstrates product design, browser-side state management, a Node backend, AI tool integration, testable business logic, and deliberate permission boundaries.”

## Resume-ready project entry

**JARVIS-Study | Full-stack AI Learning Workspace**
- Built a local-first study application using Node.js, Express, and vanilla JavaScript, combining planning, focus sessions, progress analytics, notes, and flashcards.
- Implemented a lightweight spaced-review scheduler, local data persistence, and versioned JSON backup/restore.
- Integrated the OpenAI Responses API with web search and narrowly scoped browser/GitHub tools.
- Added a confirmation step for GitHub issue publishing and kept API credentials on the server.
- Extracted reusable study logic, added unit tests, and configured GitHub Actions for repeatable checks.

## Skills demonstrated

- Product scoping and workflow design
- JavaScript modules and browser APIs
- Node.js and Express API development
- AI API integration and tool orchestration
- Local persistence and data migration basics
- Responsive UI and interaction design
- Testable business logic and CI automation
- Permission boundaries and security trade-off analysis

## What I would build next

1. Browser-level end-to-end tests for planner, timer, and vault flows.
2. Authentication and per-user authorisation before hosting.
3. Encrypted sync with export/recovery semantics and explicit retention controls.
4. Calendar integration and recurring goals.
5. Accessible keyboard-first review and focus experiences.

---

**Portfolio positioning:** Describe this as a personal full-stack AI product prototype. Demonstrate the real workflows and explain the trade-offs. Do not present it as a production SaaS or claim security controls that have not been implemented.
