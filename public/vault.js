import { nextReviewAt, sumFocusMinutes } from "./study-core.js";

const VAULT_KEY = "jarvis-study.vault.v1";
const MAIN_KEY = "jarvis-study.workspace.v1";
const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60];
const REVIEW_PRESETS = ["Again", "Good", "Easy"];

const $ = (selector) => document.querySelector(selector);
const makeId = () => window.crypto?.randomUUID?.() || "item-" + Date.now() + "-" + Math.random().toString(16).slice(2);

function loadVault() {
  const defaults = { notes: [], cards: [], weeklyGoal: 300 };
  try {
    const parsed = JSON.parse(localStorage.getItem(VAULT_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return defaults;
    return {
      notes: Array.isArray(parsed.notes) ? parsed.notes.filter((item) => item && typeof item.id === "string" && typeof item.title === "string" && typeof item.body === "string") : [],
      cards: Array.isArray(parsed.cards) ? parsed.cards.filter((item) => item && typeof item.id === "string" && typeof item.question === "string" && typeof item.answer === "string") : [],
      weeklyGoal: [60, 120, 180, 300, 450, 600].includes(Number(parsed.weeklyGoal)) ? Number(parsed.weeklyGoal) : 300,
    };
  } catch {
    return defaults;
  }
}

let vault = loadVault();
let editingNoteId = null;
let activeReviewId = null;
let showingAnswer = false;

function saveVault() {
  try {
    localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
    return true;
  } catch (error) {
    console.warn("Knowledge Vault could not save local data.", error);
    setBackupStatus("This browser could not save more local data. Export a backup or free some storage.", "error");
    return false;
  }
}

function element(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
}

function setBackupStatus(text, kind = "") {
  const label = $("#backupStatus");
  if (!label) return;
  label.textContent = text;
  label.className = "backup-status" + (kind ? " " + kind : "");
}

function dateKey(date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

function safeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function displayDate(value) {
  const date = safeDate(value);
  return date ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date) : "Unknown date";
}

function dueCards() {
  const now = Date.now();
  return vault.cards.filter((card) => !card.dueAt || (safeDate(card.dueAt)?.getTime() ?? 0) <= now)
    .sort((a, b) => (safeDate(a.dueAt)?.getTime() ?? 0) - (safeDate(b.dueAt)?.getTime() ?? 0));
}

function updateNavDueCount() {
  const count = $("#navDueCount");
  if (count) count.textContent = String(dueCards().length);
}

function renderNotes() {
  const list = $("#noteList");
  const empty = $("#notesEmpty");
  const query = $("#noteSearch").value.trim().toLowerCase();
  const filtered = vault.notes
    .filter((note) => (note.title + " " + note.subject + " " + note.body).toLowerCase().includes(query))
    .sort((a, b) => (safeDate(b.updatedAt)?.getTime() ?? 0) - (safeDate(a.updatedAt)?.getTime() ?? 0));
  list.replaceChildren();
  $("#noteCount").textContent = vault.notes.length + (vault.notes.length === 1 ? " note" : " notes");
  empty.hidden = filtered.length > 0;
  if (vault.notes.length && !filtered.length) empty.querySelector("p").textContent = "No notes match that search.";
  else empty.querySelector("p").textContent = "Save a useful explanation or a question you want to remember.";

  filtered.forEach((note) => {
    const card = element("article", "note-item");
    const top = element("div", "note-item-top");
    top.append(element("strong", "note-item-title", note.title));
    if (note.subject) top.append(element("span", "task-priority", note.subject.slice(0, 22)));
    card.append(top);
    card.append(element("div", "note-item-meta", "Updated " + displayDate(note.updatedAt)));
    card.append(element("p", "note-item-preview", note.body));
    const actions = element("div", "note-item-actions");
    const edit = element("button", "mini-action", "Edit");
    edit.type = "button";
    edit.addEventListener("click", () => beginEditNote(note));
    const remove = element("button", "mini-action delete", "Delete");
    remove.type = "button";
    remove.addEventListener("click", () => {
      if (!window.confirm("Delete this note? This cannot be undone unless you have a backup.")) return;
      vault.notes = vault.notes.filter((item) => item.id !== note.id);
      if (editingNoteId === note.id) resetNoteForm();
      saveVault();
      renderNotes();
    });
    actions.append(edit, remove);
    card.append(actions);
    list.append(card);
  });
}

function resetNoteForm() {
  editingNoteId = null;
  $("#noteForm").reset();
  $("#saveNoteButton").textContent = "Save note";
  $("#cancelNoteEdit").hidden = true;
}

function beginEditNote(note) {
  editingNoteId = note.id;
  $("#noteTitle").value = note.title;
  $("#noteSubject").value = note.subject || "";
  $("#noteBody").value = note.body;
  $("#saveNoteButton").textContent = "Save changes";
  $("#cancelNoteEdit").hidden = false;
  $("#noteTitle").focus();
}

$("#noteForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const title = $("#noteTitle").value.trim();
  const body = $("#noteBody").value.trim();
  if (!title || !body) return;
  const now = new Date().toISOString();
  if (editingNoteId) {
    const note = vault.notes.find((item) => item.id === editingNoteId);
    if (note) Object.assign(note, { title: title.slice(0, 90), subject: $("#noteSubject").value.trim().slice(0, 35), body: body.slice(0, 8000), updatedAt: now });
  } else {
    vault.notes.unshift({
      id: makeId(),
      title: title.slice(0, 90),
      subject: $("#noteSubject").value.trim().slice(0, 35),
      body: body.slice(0, 8000),
      createdAt: now,
      updatedAt: now,
    });
  }
  if (saveVault()) {
    resetNoteForm();
    renderNotes();
  }
});

$("#cancelNoteEdit").addEventListener("click", resetNoteForm);
$("#noteSearch").addEventListener("input", renderNotes);

function renderFlashcards() {
  const list = $("#flashcardList");
  const due = dueCards();
  list.replaceChildren();
  $("#cardCount").textContent = vault.cards.length + (vault.cards.length === 1 ? " card" : " cards");
  $("#dueCount").textContent = due.length + " due";
  $("#navDueCount").textContent = String(due.length);
  $("#cardsEmpty").hidden = vault.cards.length > 0;
  if (!activeReviewId || !vault.cards.some((card) => card.id === activeReviewId && due.some((item) => item.id === activeReviewId))) {
    activeReviewId = due[0]?.id || null;
    showingAnswer = false;
  }
  renderReviewCard();

  vault.cards.slice().sort((a, b) => (safeDate(a.dueAt)?.getTime() ?? 0) - (safeDate(b.dueAt)?.getTime() ?? 0)).slice(0, 8).forEach((card) => {
    const row = element("div", "flashcard-item");
    const copy = element("div", "flashcard-item-copy");
    copy.append(element("strong", "flashcard-question", card.question));
    copy.append(element("small", "flashcard-meta", (card.subject || "General") + " · Due " + displayDate(card.dueAt)));
    row.append(copy);
    const remove = element("button", "mini-action delete", "×");
    remove.type = "button";
    remove.title = "Delete flashcard";
    remove.setAttribute("aria-label", "Delete flashcard");
    remove.addEventListener("click", () => {
      if (!window.confirm("Delete this flashcard?")) return;
      vault.cards = vault.cards.filter((item) => item.id !== card.id);
      if (activeReviewId === card.id) activeReviewId = null;
      saveVault();
      renderFlashcards();
    });
    row.append(remove);
    list.append(row);
  });
}

function renderReviewCard() {
  const card = vault.cards.find((item) => item.id === activeReviewId && dueCards().some((due) => due.id === item.id));
  const flip = $("#flipCardButton");
  const actions = $("#reviewActions");
  if (!card) {
    $("#reviewSideLabel").textContent = "REVIEW QUEUE";
    $("#reviewCardText").textContent = vault.cards.length ? "You're all caught up. Check back when your next review is due." : "Create a flashcard to start building your review queue.";
    flip.hidden = true;
    actions.hidden = true;
    return;
  }
  $("#reviewSideLabel").textContent = showingAnswer ? "ANSWER" : "QUESTION";
  $("#reviewCardText").textContent = showingAnswer ? card.answer : card.question;
  flip.hidden = false;
  flip.textContent = showingAnswer ? "Show question" : "Reveal answer";
  actions.hidden = !showingAnswer;
}

$("#flipCardButton").addEventListener("click", () => {
  if (!activeReviewId) return;
  showingAnswer = !showingAnswer;
  renderReviewCard();
});

$("#cardForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const question = $("#cardQuestion").value.trim();
  const answer = $("#cardAnswer").value.trim();
  if (!question || !answer) return;
  const now = new Date().toISOString();
  vault.cards.unshift({
    id: makeId(),
    question: question.slice(0, 180),
    answer: answer.slice(0, 1500),
    subject: $("#cardSubject").value.trim().slice(0, 35),
    createdAt: now,
    dueAt: now,
    intervalIndex: 0,
    reviews: 0,
    lastReviewedAt: null,
  });
  if (saveVault()) {
    event.currentTarget.reset();
    activeReviewId = vault.cards[0].id;
    showingAnswer = false;
    renderFlashcards();
  }
});

$("#reviewActions").addEventListener("click", (event) => {
  const button = event.target.closest("[data-grade]");
  if (!button || !activeReviewId) return;
  const card = vault.cards.find((item) => item.id === activeReviewId);
  if (!card) return;
  const grade = button.dataset.grade;
  if (!["again", "good", "easy"].includes(grade)) return;
  const now = new Date();
  const schedule = nextReviewAt(grade, card.intervalIndex, now);
  card.intervalIndex = schedule.intervalIndex;
  card.reviews = (Number(card.reviews) || 0) + 1;
  card.lastReviewedAt = now.toISOString();
  card.dueAt = schedule.dueAt;
  activeReviewId = dueCards().find((item) => item.id !== card.id)?.id || null;
  showingAnswer = false;
  saveVault();
  renderFlashcards();
});

function getMainWorkspace() {
  try {
    const data = JSON.parse(localStorage.getItem(MAIN_KEY) || "null");
    return data && typeof data === "object" ? data : { tasks: [], sessions: [], focus: {} };
  } catch {
    return { tasks: [], sessions: [], focus: {} };
  }
}

function renderWeeklyGoal() {
  const goal = vault.weeklyGoal;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const workspace = getMainWorkspace();
  const sessions = Array.isArray(workspace.sessions) ? workspace.sessions : [];
  const minutes = sumFocusMinutes(sessions, start, new Date());
  $("#weeklyMinutes").innerHTML = minutes + " <small>min</small>";
  $("#weeklyGoalLabel").textContent = "of " + goal + " min";
  $("#weeklyGoalProgress").style.width = Math.min(100, (minutes / goal) * 100) + "%";
  $("#weeklyGoalSelect").value = String(goal);
}

$("#weeklyGoalSelect").addEventListener("change", (event) => {
  const value = Number(event.target.value);
  if (![60, 120, 180, 300, 450, 600].includes(value)) return;
  vault.weeklyGoal = value;
  saveVault();
  renderWeeklyGoal();
});

function validateWorkspaceBackup(data) {
  if (!data || typeof data !== "object" || data.schema !== "jarvis-study-backup" || data.version !== 1 || !data.workspace || !data.vault) {
    throw new Error("This file is not a supported JARVIS-Study backup.");
  }
  if (!Array.isArray(data.workspace.tasks) || !Array.isArray(data.workspace.sessions) ||
      !Array.isArray(data.vault.notes) || !Array.isArray(data.vault.cards)) {
    throw new Error("The backup data is incomplete or invalid.");
  }
  if (data.workspace.tasks.length > 5000 || data.workspace.sessions.length > 20000 ||
      data.vault.notes.length > 5000 || data.vault.cards.length > 10000) {
    throw new Error("The backup contains more items than this version supports.");
  }
  return data;
}

function downloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = element("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

$("#exportBackup").addEventListener("click", () => {
  try {
    const backup = {
      schema: "jarvis-study-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      workspace: getMainWorkspace(),
      vault,
    };
    downloadJson(backup, "jarvis-study-backup-" + dateKey(new Date()) + ".json");
    setBackupStatus("Backup exported. Keep the file somewhere safe; it contains your personal study data.", "success");
  } catch {
    setBackupStatus("The backup could not be created in this browser.", "error");
  }
});

$("#importBackupFile").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error("Choose a backup smaller than 5 MB.");
    const parsed = validateWorkspaceBackup(JSON.parse(await file.text()));
    if (!window.confirm("Import this backup? It will replace the current tasks, focus history, notes, flashcards, and weekly goal on this browser.")) return;
    const main = {
      tasks: parsed.workspace.tasks,
      sessions: parsed.workspace.sessions,
      focus: parsed.workspace.focus && typeof parsed.workspace.focus === "object" ? parsed.workspace.focus : {},
    };
    localStorage.setItem(MAIN_KEY, JSON.stringify(main));
    localStorage.setItem(VAULT_KEY, JSON.stringify({
      notes: parsed.vault.notes,
      cards: parsed.vault.cards,
      weeklyGoal: [60, 120, 180, 300, 450, 600].includes(Number(parsed.vault.weeklyGoal)) ? Number(parsed.vault.weeklyGoal) : 300,
    }));
    setBackupStatus("Backup imported. Reloading your workspace…", "success");
    window.location.reload();
  } catch (error) {
    setBackupStatus(error instanceof Error ? error.message : "This backup could not be imported.", "error");
  } finally {
    event.target.value = "";
  }
});

function initVault() {
  $("#weeklyGoalSelect").value = String(vault.weeklyGoal);
  renderNotes();
  renderFlashcards();
  renderWeeklyGoal();
  updateNavDueCount();
}
initVault();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    renderWeeklyGoal();
    renderFlashcards();
  }
});


if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("JARVIS-Study offline shell could not be registered.", error);
    });
  });
}
