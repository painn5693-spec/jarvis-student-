# JARVIS-Study

JARVIS-Study is a local, permission-aware Jarvis-style assistant for a teenage student. It provides:

- a dark web interface with text chat and browser voice input;
- OpenAI Responses API agent reasoning;
- current-information research through the built-in web-search tool;
- a read-only browser reader restricted to an HTTPS host allowlist;
- read-only GitHub repository/file inspection;
- a separately confirmed GitHub issue publisher;
- learning-first instructions and no arbitrary shell or unrestricted desktop control.

This is a local sidecar app. It does not modify or inject into the ChatGPT desktop application. That boundary keeps credentials and computer control explicit and revocable.

## Run it

1. Install Node.js 20+.
2. Open a terminal in this folder.
3. Install packages:

   ```powershell
   npm install
   ```

4. Create `.env` from `.env.example` and add your OpenAI API key.
5. Optionally add a fine-grained GitHub token. Public GitHub reading works without one; publishing issues requires a token. Give the token only the repository permissions you actually need. A token is not required for web research.
6. Start the app:

   ```powershell
   npm start
   ```

7. Open <http://localhost:8787>.

## Permissions and safety

The browser reader is GET-only and blocks hosts outside `BROWSER_ALLOWED_HOSTS`. The GitHub write tool never publishes on the model's first request: the server stores a short-lived pending action and the UI must call `/api/confirm` after you review the exact title and body.

Do not enable unrestricted desktop automation for a student account. If you later add computer-use, run it in an isolated browser/VM, keep an allowlist, show screenshots, set time/step limits, and require confirmation before sending data or making irreversible changes.

For a public deployment, add authentication, HTTPS, rate limits, audit logging, CSRF protection, and a real encrypted secret store. This starter intentionally assumes localhost only.

