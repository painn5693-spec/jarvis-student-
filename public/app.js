const messagesEl = document.querySelector("#messages");
const promptEl = document.querySelector("#prompt");
const composer = document.querySelector("#composer");
const statusEl = document.querySelector("#status");
const micButton = document.querySelector("#mic");
const messages = [];

function addMessage(role, content) {
  messages.push({ role, content });
  const article = document.createElement("article");
  article.className = `message ${role}`;
  article.innerHTML = `<div class="message-label">${role === "user" ? "YOU" : "JARVIS"}</div><div class="message-body"></div>`;
  article.querySelector(".message-body").textContent = content;
  messagesEl.append(article);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setStatus(text, kind = "") {
  statusEl.textContent = text;
  statusEl.className = `status ${kind}`;
}

function addConfirmation(pending) {
  const card = document.createElement("div");
  card.className = "confirmation";
  card.innerHTML = `<strong>Approve GitHub publish?</strong><p>${pending.message}</p><pre></pre><div><button class="primary confirm">Publish issue</button><button class="secondary cancel">Cancel</button></div>`;
  card.querySelector("pre").textContent = `${pending.preview.title}\n\n${pending.preview.body}`;
  card.querySelector(".cancel").addEventListener("click", () => card.remove());
  card.querySelector(".confirm").addEventListener("click", async () => {
    card.querySelector(".confirm").disabled = true;
    const response = await fetch("/api/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation_id: pending.confirmation_id }) });
    const data = await response.json();
    card.remove();
    addMessage("assistant", data.ok ? `Published: ${data.issue.title} (#${data.issue.number})\n${data.issue.url}` : `I could not publish it: ${data.error || "unknown error"}`);
  });
  messagesEl.append(card);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function health() {
  const response = await fetch("/api/health");
  const data = await response.json();
  if (!data.openai_configured) setStatus("Needs OPENAI_API_KEY", "warn");
  else if (!data.github_configured) setStatus("Online · GitHub read-only", "warn");
  else setStatus("Online · guarded access", "ok");
}

async function sendMessage(text) {
  const content = text.trim();
  if (!content) return;
  addMessage("user", content);
  promptEl.value = "";
  setStatus("Thinking…");
  const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages }) });
  const data = await response.json();
  if (!response.ok) addMessage("assistant", data.error || "Something went wrong.");
  else {
    addMessage("assistant", data.reply);
    if (data.pending) addConfirmation(data.pending);
  }
  await health();
}

composer.addEventListener("submit", (event) => { event.preventDefault(); void sendMessage(promptEl.value); });
document.querySelectorAll("[data-prompt]").forEach((button) => button.addEventListener("click", () => { promptEl.value = button.dataset.prompt; promptEl.focus(); }));

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  micButton.addEventListener("click", () => { recognition.start(); micButton.textContent = "🎙 Listening…"; });
  recognition.addEventListener("result", (event) => { promptEl.value = event.results[0][0].transcript; });
  recognition.addEventListener("end", () => { micButton.textContent = "🎙 Voice"; });
} else {
  micButton.disabled = true;
  micButton.title = "Voice input is not supported in this browser.";
}

addMessage("assistant", "Good day. I’m JARVIS-Study. Ask me to explain a topic, research a question, or inspect an approved GitHub repository.");
void health();

