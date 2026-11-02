const messagesEl = document.querySelector("#messages");
const promptEl = document.querySelector("#prompt");
const composer = document.querySelector("#composer");
const statusEl = document.querySelector("#status");
const micButton = document.querySelector("#mic");
const sendButton = document.querySelector("#sendButton");
const messages = [];

const STORAGE_KEY = "jarvis-study.workspace.v1";
const TIMER_MODES = {
  focus: { label: "FOCUS SESSION", duration: 25 * 60, subLabel: "TIME TO FOCUS" },
  short: { label: "SHORT BREAK", duration: 5 * 60, subLabel: "TAKE A BREATHER" },
  long: { label: "LONG BREAK", duration: 15 * 60, subLabel: "RESET YOUR ENERGY" },
};
const PAGE_META = {
  overview: ["YOUR PERSONAL LEARNING SPACE", "Good to see you.", "A little progress every day adds up. What will you work on?"],
  planner: ["MAKE YOUR NEXT MOVE", "Study planner", "Turn large goals into small, manageable steps."],
  focus: ["PROTECT YOUR ATTENTION", "Focus room", "Give one important task your undivided attention."],
  progress: ["CONSISTENCY OVER PERFECTION", "Your progress", "A clear view of the work you have put in."],
  vault: ["YOUR PERSONAL KNOWLEDGE BASE", "Knowledge vault", "Capture ideas, practise active recall, and protect your study data."],
  assistant: ["YOUR AI LEARNING PARTNER", "JARVIS assistant", "Ask questions, explore ideas, and learn something new."],
};

function createDefaultWorkspace() {
  return {
    tasks: [],
    sessions: [],
    focus: { mode: "focus", duration: TIMER_MODES.focus.duration, remaining: TIMER_MODES.focus.duration, endsAt: null, running: false, subject: "" },
  };
}

function loadWorkspace() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultWorkspace();
    const parsed = JSON.parse(raw);
    const defaults = createDefaultWorkspace();
    const focus = { ...defaults.focus, ...(parsed.focus || {}) };
    if (!TIMER_MODES[focus.mode]) focus.mode = "focus";
    focus.duration = Math.max(1, Number(focus.duration) || TIMER_MODES[focus.mode].duration);
    focus.remaining = Math.max(0, Math.min(focus.duration, Number(focus.remaining) || 0));
    focus.running = Boolean(focus.running && Number(focus.endsAt) > Date.now());
    if (focus.running) focus.remaining = Math.max(0, Math.ceil((focus.endsAt - Date.now()) / 1000));
    else focus.endsAt = null;
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks.filter((task) => task && typeof task.id === "string" && typeof task.title === "string") : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions.filter((session) => session && typeof session.completedAt === "string") : [],
      focus,
    };
  } catch {
    return createDefaultWorkspace();
  }
}

let workspace = loadWorkspace();
let activeView = "overview";
let taskFilter = "all";
let timerInterval = null;

function saveWorkspace() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  } catch (error) {
    console.warn("JARVIS-Study could not save local workspace data.", error);
    setStatus("Local storage unavailable", "warn");
  }
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
  return "task-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function setStatus(label, kind) {
  if (!statusEl) return;
  statusEl.className = "system-status" + (kind ? " " + kind : "");
  const span = statusEl.querySelector("span");
  if (span) span.textContent = label;
}

function node(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function addMessage(role, content) {
  const safeContent = String(content == null ? "" : content);
  messages.push({ role, content: safeContent });
  if (!messagesEl) return;
  const article = node("article", "message " + role);
  article.append(node("div", "message-label", role === "user" ? "YOU" : "JARVIS"));
  article.append(node("div", "message-body", safeContent));
  messagesEl.append(article);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showView(viewName) {
  if (!PAGE_META[viewName]) return;
  activeView = viewName;
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === "view-" + viewName));
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName && button.classList.contains("nav-item")));
  const meta = PAGE_META[viewName];
  document.querySelector("#pageEyebrow").textContent = meta[0];
  document.querySelector("#pageTitle").textContent = meta[1];
  document.querySelector("#pageDescription").textContent = meta[2];
  if (viewName === "progress") renderProgress();
  if (viewName === "planner") renderTasks();
  if (viewName === "focus") renderTimer();
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function formatDate(value, options) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return new Intl.DateTimeFormat(undefined, options || { month: "short", day: "numeric" }).format(date);
}

function formatDuration(seconds) {
  const safe = Math.max(0, Math.ceil(Number(seconds) || 0));
  return String(Math.floor(safe / 60)).padStart(2, "0") + ":" + String(safe % 60).padStart(2, "0");
}

function getFocusSessions() {
  return workspace.sessions.filter((session) => session.mode === "focus");
}

function getTodayFocusMinutes() {
  const today = localDateKey(new Date());
  return getFocusSessions().filter((session) => localDateKey(new Date(session.completedAt)) === today)
    .reduce((sum, session) => sum + (Number(session.minutes) || 0), 0);
}

function getCurrentStreak() {
  const studied = new Set(getFocusSessions().map((session) => localDateKey(new Date(session.completedAt))));
  const cursor = new Date();
  if (!studied.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  if (!studied.has(localDateKey(cursor))) return 0;
  let streak = 0;
  while (studied.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderMetrics() {
  const openCount = workspace.tasks.filter((task) => !task.completedAt).length;
  const completedCount = workspace.tasks.filter((task) => task.completedAt).length;
  document.querySelector("#metricTasks").textContent = String(openCount);
  document.querySelector("#metricFocus").innerHTML = getTodayFocusMinutes() + " <small>min</small>";
  document.querySelector("#metricStreak").innerHTML = getCurrentStreak() + " <small>days</small>";
  document.querySelector("#metricCompleted").textContent = String(completedCount);
  document.querySelector("#navTaskCount").textContent = String(openCount);
  document.querySelector("#todayLabel").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(new Date());
}

function createTaskRow(task) {
  const row = node("div", "task-row");
  const toggle = node("button", "task-toggle" + (task.completedAt ? " done" : ""), task.completedAt ? "✓" : "");
  toggle.type = "button";
  toggle.setAttribute("aria-label", task.completedAt ? "Mark task as incomplete" : "Mark task as complete");
  toggle.addEventListener("click", () => {
    const current = workspace.tasks.find((item) => item.id === task.id);
    if (!current) return;
    current.completedAt = current.completedAt ? null : new Date().toISOString();
    saveWorkspace();
    renderAll();
  });
  row.append(toggle);

  const main = node("div", "task-main");
  main.append(node("div", "task-title" + (task.completedAt ? " completed" : ""), task.title));
  const meta = node("div", "task-meta");
  if (task.subject) meta.append(node("span", "", task.subject));
  if (task.dueDate) meta.append(node("span", "", "Due " + formatDate(task.dueDate + "T12:00:00")));
  if (task.minutes) meta.append(node("span", "", task.minutes + " min"));
  const priority = node("span", "task-priority " + (task.priority || "normal"), task.priority || "normal");
  meta.append(priority);
  main.append(meta);
  row.append(main);

  const remove = node("button", "task-delete", "×");
  remove.type = "button";
  remove.title = "Delete task";
  remove.setAttribute("aria-label", "Delete " + task.title);
  remove.addEventListener("click", () => {
    workspace.tasks = workspace.tasks.filter((item) => item.id !== task.id);
    saveWorkspace();
    renderAll();
  });
  row.append(remove);
  return row;
}

function renderOverviewTasks() {
  const list = document.querySelector("#overviewTasks");
  const empty = document.querySelector("#overviewEmpty");
  list.replaceChildren();
  const openTasks = workspace.tasks.filter((task) => !task.completedAt)
    .sort((a, b) => (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31"))
    .slice(0, 4);
  empty.hidden = openTasks.length > 0;
  openTasks.forEach((task) => list.append(createTaskRow(task)));
}

function renderTasks() {
  const list = document.querySelector("#taskList");
  const empty = document.querySelector("#plannerEmpty");
  const all = workspace.tasks.slice().sort((a, b) => {
    if (Boolean(a.completedAt) !== Boolean(b.completedAt)) return a.completedAt ? 1 : -1;
    return (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31");
  });
  const filtered = all.filter((task) => taskFilter === "all" || (taskFilter === "open" ? !task.completedAt : Boolean(task.completedAt)));
  list.replaceChildren();
  document.querySelector("#plannerCount").textContent = workspace.tasks.length + (workspace.tasks.length === 1 ? " task" : " tasks");
  empty.hidden = filtered.length > 0;
  if (workspace.tasks.length === 0) empty.querySelector("p").textContent = "Add a task and your plan will appear here.";
  else if (filtered.length === 0) empty.querySelector("p").textContent = "Nothing in this filter. Try another view.";
  filtered.forEach((task) => list.append(createTaskRow(task)));
  document.querySelectorAll("[data-filter]").forEach((button) => button.classList.toggle("active", button.dataset.filter === taskFilter));
}

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    taskFilter = button.dataset.filter;
    renderTasks();
  });
});

document.querySelector("#taskForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const title = String(form.get("title") || "").trim();
  if (!title) return;
  workspace.tasks.unshift({
    id: makeId(),
    title: title.slice(0, 100),
    subject: String(form.get("subject") || "").trim().slice(0, 40),
    dueDate: String(form.get("dueDate") || ""),
    minutes: Number(form.get("minutes")) || 25,
    priority: ["low", "normal", "high"].includes(String(form.get("priority"))) ? String(form.get("priority")) : "normal",
    createdAt: new Date().toISOString(),
    completedAt: null,
  });
  saveWorkspace();
  event.currentTarget.reset();
  document.querySelector("#taskDuration").value = "25";
  document.querySelector("#taskPriority").value = "normal";
  taskFilter = "all";
  renderAll();
  document.querySelector("#taskTitle").focus();
});

document.querySelector("#overviewAddTask").addEventListener("click", () => {
  showView("planner");
  document.querySelector("#taskTitle").focus();
});

function setTimerMode(mode) {
  if (!TIMER_MODES[mode]) return;
  pauseTimer(false);
  workspace.focus.mode = mode;
  workspace.focus.duration = TIMER_MODES[mode].duration;
  workspace.focus.remaining = TIMER_MODES[mode].duration;
  workspace.focus.endsAt = null;
  workspace.focus.running = false;
  saveWorkspace();
  renderTimer();
}

function startTimer() {
  const focus = workspace.focus;
  if (focus.running) {
    pauseTimer();
    return;
  }
  if (focus.remaining <= 0) focus.remaining = focus.duration;
  focus.running = true;
  focus.endsAt = Date.now() + focus.remaining * 1000;
  saveWorkspace();
  renderTimer();
  if (!timerInterval) timerInterval = window.setInterval(tickTimer, 500);
}

function pauseTimer(shouldRender) {
  const focus = workspace.focus;
  if (focus.running && focus.endsAt) focus.remaining = Math.max(0, Math.ceil((focus.endsAt - Date.now()) / 1000));
  focus.running = false;
  focus.endsAt = null;
  saveWorkspace();
  if (shouldRender !== false) renderTimer();
}

function resetTimer() {
  const focus = workspace.focus;
  focus.running = false;
  focus.endsAt = null;
  focus.remaining = focus.duration;
  saveWorkspace();
  renderTimer();
}

function tickTimer() {
  const focus = workspace.focus;
  if (!focus.running || !focus.endsAt) return;
  focus.remaining = Math.max(0, Math.ceil((focus.endsAt - Date.now()) / 1000));
  renderTimer();
  if (focus.remaining <= 0) completeTimer();
}

function completeTimer() {
  const focus = workspace.focus;
  focus.running = false;
  focus.endsAt = null;
  focus.remaining = 0;
  if (focus.mode === "focus") {
    workspace.sessions.unshift({
      id: makeId(),
      mode: "focus",
      subject: focus.subject.trim() || "General study",
      minutes: Math.round(focus.duration / 60),
      completedAt: new Date().toISOString(),
    });
  }
  saveWorkspace();
  renderAll();
  renderTimer();
  document.querySelector("#timerHint").textContent = focus.mode === "focus"
    ? "Session complete. Nice work. Take a short break before your next round."
    : "Break complete. Return when you feel ready.";
}

function renderTimer() {
  const focus = workspace.focus;
  const mode = TIMER_MODES[focus.mode] || TIMER_MODES.focus;
  const remaining = focus.running && focus.endsAt ? Math.max(0, Math.ceil((focus.endsAt - Date.now()) / 1000)) : focus.remaining;
  document.querySelector("#timerDisplay").textContent = formatDuration(remaining);
  document.querySelector("#timerModeLabel").textContent = mode.label;
  document.querySelector("#timerSubLabel").textContent = remaining === 0 ? "SESSION COMPLETE" : mode.subLabel;
  document.querySelector("#timerStartPause").textContent = focus.running ? "Pause session" : (remaining === 0 ? "Start again" : "Start " + (focus.mode === "focus" ? "focus" : "break"));
  const progress = focus.duration > 0 ? Math.max(0, Math.min(100, (remaining / focus.duration) * 100)) : 0;
  document.querySelector("#timerRing").style.background = "conic-gradient(var(--cyan) " + progress + "%, rgba(123, 152, 187, .12) " + progress + "%)";
  document.querySelectorAll("[data-mode]").forEach((button) => button.classList.toggle("active", button.dataset.mode === focus.mode));
  document.querySelector("#focusSubject").value = focus.subject;
  if (focus.running) document.querySelector("#timerHint").textContent = "You're in a session. Stay with one task until the timer ends.";
}

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => setTimerMode(button.dataset.mode));
});
document.querySelector("#timerStartPause").addEventListener("click", startTimer);
document.querySelector("#timerReset").addEventListener("click", resetTimer);
document.querySelector("#focusSubject").addEventListener("input", (event) => {
  workspace.focus.subject = event.target.value.slice(0, 60);
  saveWorkspace();
});

function renderProgress() {
  const sessions = getFocusSessions();
  const totalMinutes = sessions.reduce((sum, session) => sum + (Number(session.minutes) || 0), 0);
  document.querySelector("#progressTotal").innerHTML = totalMinutes + " <small>min</small>";
  document.querySelector("#progressSessions").textContent = String(sessions.length);
  document.querySelector("#progressTasks").textContent = String(workspace.tasks.filter((task) => task.completedAt).length);

  const chart = document.querySelector("#weeklyChart");
  chart.replaceChildren();
  const days = [];
  const today = new Date();
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = localDateKey(date);
    const minutes = sessions.filter((session) => localDateKey(new Date(session.completedAt)) === key)
      .reduce((sum, session) => sum + (Number(session.minutes) || 0), 0);
    days.push({ date, minutes });
  }
  const maxMinutes = Math.max(25, ...days.map((day) => day.minutes));
  days.forEach((day) => {
    const column = node("div", "chart-day");
    column.append(node("span", "chart-value", day.minutes ? String(day.minutes) : "—"));
    const track = node("div", "chart-track");
    const bar = node("div", "chart-bar");
    bar.style.height = day.minutes ? Math.max(4, (day.minutes / maxMinutes) * 100) + "%" : "3px";
    track.append(bar);
    column.append(track);
    column.append(node("span", "chart-label", new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(day.date)));
    chart.append(column);
  });

  const subjectMap = new Map();
  sessions.forEach((session) => {
    const subject = String(session.subject || "General study");
    subjectMap.set(subject, (subjectMap.get(subject) || 0) + (Number(session.minutes) || 0));
  });
  const subjects = [...subjectMap.entries()].sort((a, b) => b[1] - a[1]);
  const subjectList = document.querySelector("#subjectBreakdown");
  const subjectEmpty = document.querySelector("#subjectEmpty");
  subjectList.replaceChildren();
  subjectEmpty.hidden = subjects.length > 0;
  const maxSubject = Math.max(1, ...subjects.map((item) => item[1]));
  subjects.slice(0, 6).forEach(([subject, minutes]) => {
    const row = node("div", "subject-row");
    const top = node("div", "subject-row-top");
    top.append(node("span", "", subject));
    top.append(node("small", "", minutes + " min"));
    const track = node("div", "subject-track");
    const bar = node("div", "subject-bar");
    bar.style.width = (minutes / maxSubject * 100) + "%";
    track.append(bar);
    row.append(top, track);
    subjectList.append(row);
  });

  const recent = document.querySelector("#recentSessions");
  const sessionsEmpty = document.querySelector("#sessionsEmpty");
  recent.replaceChildren();
  sessionsEmpty.hidden = sessions.length > 0;
  sessions.slice(0, 6).forEach((session) => {
    const row = node("div", "session-row");
    const left = node("div");
    left.append(node("div", "session-title", session.subject || "General study"));
    left.append(node("div", "session-date", formatDate(session.completedAt, { dateStyle: "medium", timeStyle: "short" })));
    row.append(left, node("span", "session-duration", (Number(session.minutes) || 0) + " min"));
    recent.append(row);
  });
}

function renderAll() {
  renderMetrics();
  renderOverviewTasks();
  renderTasks();
  if (activeView === "progress") renderProgress();
}

async function health() {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error("Health check failed");
    const data = await response.json();
    if (!data.openai_configured) setStatus("Needs API key", "warn");
    else if (!data.github_configured) setStatus("AI online · GitHub read-only", "warn");
    else setStatus("AI online · guarded tools", "online");
  } catch {
    setStatus("Server unavailable", "error");
  }
}

function addConfirmation(pending) {
  const card = node("div", "confirmation");
  card.append(node("strong", "", "Review GitHub publication"));
  card.append(node("p", "", pending.message || "A GitHub issue is ready for your review."));
  const preview = node("pre");
  preview.textContent = String(pending.preview?.title || "") + "\n\n" + String(pending.preview?.body || "");
  card.append(preview);
  const actions = node("div", "confirmation-actions");
  const publish = node("button", "button button-primary", "Publish issue");
  const cancel = node("button", "button button-outline", "Cancel");
  publish.type = "button";
  cancel.type = "button";
  cancel.addEventListener("click", () => card.remove());
  publish.addEventListener("click", async () => {
    publish.disabled = true;
    try {
      const response = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation_id: pending.confirmation_id }),
      });
      const data = await response.json();
      card.remove();
      addMessage("assistant", data.ok
        ? "Published: " + data.issue.title + " (#" + data.issue.number + ")\n" + data.issue.url
        : "I could not publish it: " + (data.error || "unknown error"));
    } catch {
      publish.disabled = false;
      addMessage("assistant", "The confirmation request failed. Check your local server and try again.");
    }
  });
  actions.append(publish, cancel);
  card.append(actions);
  messagesEl.append(card);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function sendMessage(text) {
  const content = String(text || "").trim();
  if (!content || !promptEl || sendButton?.disabled) return;
  addMessage("user", content);
  promptEl.value = "";
  if (sendButton) sendButton.disabled = true;
  setStatus("JARVIS is thinking…", "");
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const data = await response.json();
    if (!response.ok) {
      addMessage("assistant", data.error || "Something went wrong. Please try again.");
    } else {
      addMessage("assistant", data.reply || "I could not produce a response.");
      if (data.pending) addConfirmation(data.pending);
    }
  } catch {
    addMessage("assistant", "I could not reach the local JARVIS server. Check that npm start is running, then try again.");
  } finally {
    if (sendButton) sendButton.disabled = false;
    await health();
    promptEl.focus();
  }
}

if (composer) {
  composer.addEventListener("submit", (event) => {
    event.preventDefault();
    void sendMessage(promptEl.value);
  });
}
document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    showView("assistant");
    promptEl.value = button.dataset.prompt || "";
    promptEl.focus();
  });
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition && micButton) {
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  micButton.addEventListener("click", () => {
    try {
      recognition.start();
      micButton.textContent = "Listening…";
      micButton.disabled = true;
    } catch {
      addMessage("assistant", "Voice input is already starting. Please try again in a moment.");
    }
  });
  recognition.addEventListener("result", (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript;
    if (transcript) promptEl.value = transcript;
  });
  recognition.addEventListener("error", () => {
    setStatus("Voice input unavailable", "warn");
  });
  recognition.addEventListener("end", () => {
    micButton.textContent = "♩ Voice";
    micButton.disabled = false;
  });
} else if (micButton) {
  micButton.disabled = true;
  micButton.title = "Voice input is not supported in this browser.";
}

document.querySelector("#overviewStartFocus").addEventListener("click", () => {
  setTimerMode("focus");
  showView("focus");
  startTimer();
});
document.querySelector("#overviewFocusButton").addEventListener("click", () => showView("focus"));

addMessage("assistant", "Good day. I’m JARVIS-Study. I can help you understand a topic, research a question, plan your learning, or inspect an approved GitHub repository. What shall we work on?");
renderAll();
renderTimer();
void health();
if (workspace.focus.running && !timerInterval) timerInterval = window.setInterval(tickTimer, 500);
