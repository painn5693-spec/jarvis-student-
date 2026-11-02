# JARVIS-Study

> **A local-first AI study workspace for planning, deep focus, knowledge capture, and active recall.**

JARVIS-Study brings a student's daily learning workflow into one focused interface: plan tasks, run timed study sessions, review progress, write notes, practise flashcards, and ask an AI assistant for explanations or research. It is designed as a practical, privacy-conscious portfolio project—not an unrestricted computer-control agent.

[Product overview](PORTFOLIO.md) · [Architecture](#architecture) · [Security boundaries](#security-boundaries) · [Run locally](#run-locally)

## Product capabilities

| Workspace | Capability |
|---|---|
| Overview | Open tasks, completed tasks, focus minutes, study streak, and a daily action panel |
| Study planner | Tasks with subjects, target dates, priorities, duration estimates, completion and filters |
| Focus room | Focus, short-break, and long-break timers with timer recovery after refresh |
| Progress | Seven-day focus activity, subject breakdown, session history, and weekly goal |
| Knowledge Vault | Searchable notes, editable note records, flashcards, active recall, and scheduled reviews |
| Backup | Versioned JSON export/import for tasks, focus history, notes, flashcards, and settings |
| JARVIS assistant | AI chat, web search, browser voice input when supported, and learning-first explanations |
| Developer tools | Read-only GitHub repository/file inspection and separately confirmed issue publishing |

### Knowledge and review workflow

1. Save a concise note with a title, subject, and explanation.
2. Turn important facts into front/back flashcards.
3. Reveal the answer before rating how well you remembered it.
4. Review scheduling uses small intervals (1, 3, 7, 14, 30, and 60 days) and can be inspected in the local flashcard queue.
5. Export a backup to preserve your local study workspace.

The review scheduler is deliberately a lightweight learning aid. It does not claim to measure memory or guarantee retention.

## Technology

- **Runtime:** Node.js 20+
- **Backend:** Express 5
- **AI integration:** OpenAI JavaScript SDK and Responses API
- **Frontend:** semantic HTML, CSS, and modern vanilla JavaScript modules
- **Local persistence:** browser localStorage
- **Offline shell:** service worker and web app manifest
- **Tests:** Node.js built-in test runner
- **Automation:** GitHub Actions

No frontend framework, database, GPU, or separate storage subscription is required for the local portfolio prototype. AI calls still require an OpenAI API key and may incur API charges.

## Run locally

1. Install Node.js 20 or newer.
2. Install the locked dependencies:

   ~~~powershell
   npm ci
   ~~~

3. Create a private environment file:

   ~~~powershell
   Copy-Item .env.example .env
   ~~~

4. Open .env and set your OpenAI API key. Keep this file private and never commit it.
5. Start the server:

   ~~~powershell
   npm start
   ~~~

6. Open <http://localhost:8787>.

For automatic server restarts during development:

~~~powershell
npm run dev
~~~

The app's static workspace shell can be cached for offline browsing after it has been loaded once. AI chat and other server/API operations still require the local server and network access.

## Quality checks

Run JavaScript syntax checks:

~~~powershell
npm run check
~~~

Run the unit tests:

~~~powershell
npm test
~~~

The test suite covers spaced-review scheduling and focus-time aggregation. GitHub Actions runs the checks on pushes and pull requests.

## Environment configuration

| Variable | Purpose | Default |
|---|---|---|
| OPENAI_API_KEY | OpenAI API authentication | Required for AI chat |
| OPENAI_MODEL | Model used by the Responses API | gpt-5.4 |
| PORT | Local Express port | 8787 |
| GITHUB_TOKEN | Optional token for GitHub issue publishing and authorised repository access | Empty |
| BROWSER_ALLOWED_HOSTS | Comma-separated HTTPS hosts allowed by the read-only browser reader | See .env.example |

Do not put credentials in frontend JavaScript, HTML, screenshots, issues, or chat messages. Use a fine-grained GitHub token with only the permissions needed for the repositories you intend to access.

## Architecture

~~~text
Browser
  ├── Overview / Planner / Focus / Progress
  ├── Knowledge Vault
  │     ├── Notes and flashcards
  │     ├── Spaced-review scheduler
  │     └── JSON backup and restore
  ├── localStorage
  │     ├── jarvis-study.workspace.v1
  │     └── jarvis-study.vault.v1
  └── JARVIS chat ───────────────┐
                                 ▼
                         Express API (localhost)
                           ├── OpenAI Responses API
                           │     └── Web search
                           ├── HTTPS allowlisted reader (GET only)
                           └── Narrow GitHub tools
                                 └── Confirmed issue publishing
~~~

### Repository layout

~~~text
.
├── public/
│   ├── app.js
│   ├── index.html
│   ├── styles.css
│   ├── study-core.js
│   ├── vault.js
│   ├── vault.css
│   ├── sw.js
│   ├── manifest.webmanifest
│   └── icon.svg
├── src/
│   └── server.mjs
├── tests/
│   └── study-core.test.mjs
├── .github/
│   └── workflows/
│       └── ci.yml
├── .env.example
├── .gitignore
├── package.json
└── README.md
~~~

### Data ownership

The planner, focus history, notes, flashcards, and weekly target are stored in the current browser profile. They are not sent to the AI server as part of normal workspace operation. The optional JSON backup contains personal study data; store exported backups somewhere private.

AI chat is different: messages are sent from the local server to the configured OpenAI API. Read the provider's current data policies and terms before using real personal or sensitive information.

## Security boundaries and deployment status

- No arbitrary shell execution or unrestricted desktop automation is exposed.
- Browser reading is HTTPS-only and checks the configured hostname allowlist.
- GitHub inspection is read-only; issue publishing uses a separate preview and explicit confirmation.
- API keys are read from server-side environment variables.
- The current application is intended for local development and portfolio demonstration.

**This is not yet a production multi-user service.** Before exposing it publicly, implement authentication, session management, HTTPS, rate limiting, CSRF protection, secure secret management, request and output limits, audit logging, dependency updates, and a deeper server-side network-fetch threat review. Reassess the confirmation flow and permissions under an authenticated multi-user threat model.

## Portfolio demo walkthrough

A clear three-minute demonstration:

1. Open Overview and explain the daily learning workflow.
2. Create a Mathematics task with a deadline and priority.
3. Run a short focus session and show where completed sessions appear in Progress.
4. Add a note and create a flashcard from the note.
5. Reveal the flashcard answer, grade it, and show its next review date.
6. Export a workspace backup and explain which data is local.
7. Ask JARVIS to explain a concept or research a current topic.
8. Explain why the browser and GitHub tools are narrowly scoped and why publishing requires a separate approval.

Use a short timer setting in a real demo; never claim a focus session was completed if the timer was not allowed to finish.

## Limitations

- No account system or cross-device synchronisation.
- Clearing browser site data removes local workspace records unless a backup exists.
- AI features require a valid OpenAI API key and can incur usage charges.
- Voice input depends on browser support and permissions.
- Offline support covers the static app shell; it does not make AI or server APIs available offline.
- The review schedule is a simple interval-based aid, not a personalised scientific memory model.
- Automated tests do not replace manual browser, accessibility, security, and integration testing.

## Future roadmap

- Optional encrypted sync with explicit account, recovery, and data-retention design.
- Calendar integration and recurring study goals.
- Import/export formats for notes and progress reports.
- More robust accessibility and browser-level end-to-end tests.
- Per-user authentication and hardened server isolation before any hosted release.

---

Built as a learning-focused software engineering project to demonstrate product thinking, full-stack integration, browser storage, AI tool orchestration, interface design, and responsible permission boundaries.
