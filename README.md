# JARVIS-Study

**A local-first AI learning workspace with a study planner, focus room, progress tracking, and a permission-aware assistant.**

JARVIS-Study is designed to make learning more organised without turning the assistant into an unrestricted computer-control agent. It combines a practical student workspace with an AI assistant for explanations, research, and carefully scoped developer workflows.

## Product features

### Study Command Center
- **Overview:** at-a-glance tasks, focus minutes, study streak, and completed work.
- **Study planner:** create tasks with a subject, target date, estimated time, and priority. Filter tasks and mark them complete.
- **Focus room:** focus, short-break, and long-break timers. A completed focus session is recorded in the progress history.
- **Progress:** seven-day focus activity, time by subject, completed sessions, and recent session history.
- **Local-first storage:** planner data and focus history stay in the browser's local storage. They are not sent to the AI server.

### JARVIS AI assistant
- Chat interface with browser voice input where supported.
- OpenAI Responses API with web search for current research.
- Read-only browser reader restricted to configured HTTPS hosts.
- Read-only GitHub repository and file inspection.
- GitHub issue publishing is a separate, previewed action that requires a second explicit confirmation.

### Safety boundaries
- No arbitrary shell execution or unrestricted desktop control.
- Browser reading is read-only and host allowlisted.
- GitHub write access is limited to the issue-publishing workflow and requires a confirmation step.
- API keys are read from environment variables; never put secrets in frontend code or commit a real .env file.

## Technology

- Node.js 20+
- Express 5
- OpenAI JavaScript SDK and Responses API
- Vanilla JavaScript, semantic HTML, and responsive CSS
- Browser localStorage for the personal study workspace
- Browser Speech Recognition API when supported

No frontend framework, database, GPU, or separate hosted storage service is required for the current local prototype.

## Run locally

1. Install Node.js 20 or newer.
2. Install dependencies:

   ~~~powershell
   npm install
   ~~~

3. Copy .env.example to .env and add your OpenAI API key.
4. Optionally add a fine-grained GitHub token only when you need the guarded issue-publishing feature. Public GitHub reading does not require a token.
5. Start the app:

   ~~~powershell
   npm start
   ~~~

6. Open http://localhost:8787.

For development with automatic server restart:

~~~powershell
npm run dev
~~~

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| OPENAI_API_KEY | OpenAI API authentication | Required for AI chat |
| OPENAI_MODEL | Model used by the Responses API | gpt-5.4 |
| PORT | Local Express server port | 8787 |
| GITHUB_TOKEN | Optional token for GitHub issue publishing and private repository access | Empty |
| BROWSER_ALLOWED_HOSTS | Comma-separated HTTPS host allowlist for the read-only browser tool | See .env.example |

Keep .env private. The repository includes .env.example as a template, not a place for real credentials.

## Architecture

~~~text
jarvis-student/
├── public/
│   ├── app.js          # Navigation, planner, timer, progress, and chat UI
│   ├── index.html      # Product interface
│   └── styles.css      # Responsive visual system
├── src/
│   └── server.mjs      # Express API, OpenAI agent, and guarded tools
├── .env.example
├── .gitignore
├── package.json
└── README.md
~~~

The browser stores planner and focus data locally. AI chat requests are sent to the local Express server, which calls the configured model and executes only the tools explicitly defined by the server.

## Portfolio demo walkthrough

A useful two-minute product demo:

1. Open the Overview and show the workspace metrics.
2. Create a task such as “Revise applications of derivatives” with a subject and target date.
3. Open the Focus room, choose a session, and start the timer.
4. Complete a focus session to create a progress entry.
5. Open Progress to show the weekly activity, subject breakdown, and session history.
6. Open JARVIS assistant and ask it to explain a difficult topic or research a current question.
7. Explain the permission boundaries: local study data stays in the browser, browser reading is allowlisted, and GitHub publishing requires confirmation.

For a short demo, use the timer controls and show how the completed-session data appears in Progress. Do not claim a session was completed unless the timer actually reached zero.

## Current scope and limitations

- This is a local portfolio prototype, not a production multi-user SaaS.
- Planner tasks and progress are stored per browser. They do not sync across devices and are cleared if browser site data is removed.
- AI features require a valid OpenAI API key and may incur API usage charges.
- Voice input depends on browser support and permissions.
- Before any public deployment, add authentication, HTTPS, rate limiting, CSRF protection, secure session handling, operational logging, and a properly managed secrets store. Review all server-side network-fetch and tool permissions before exposing the app to untrusted users.

## Roadmap ideas

- Export a study plan and progress report as a shareable file.
- Add calendar import and recurring study goals.
- Add optional encrypted account sync only after authentication and data-retention rules are designed.
- Add structured quizzes and spaced-repetition review sessions.
- Add automated tests for planner, timer, and permission boundaries.

---

Built as a learning-focused software project. The goal is to demonstrate product thinking, full-stack integration, user experience, and responsible AI tool design.
