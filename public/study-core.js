export const REVIEW_INTERVALS = Object.freeze([1, 3, 7, 14, 30, 60]);

export function nextReviewAt(grade, intervalIndex, from = new Date()) {
  if (!["again", "good", "easy"].includes(grade)) {
    throw new TypeError("grade must be again, good, or easy");
  }
  const currentIndex = Number.isInteger(Number(intervalIndex))
    ? Math.max(0, Math.min(REVIEW_INTERVALS.length - 1, Number(intervalIndex)))
    : 0;

  let nextIndex = currentIndex;
  if (grade === "again") nextIndex = 0;
  else if (grade === "good") nextIndex = Math.min(REVIEW_INTERVALS.length - 1, currentIndex + 1);
  else nextIndex = Math.min(REVIEW_INTERVALS.length - 1, currentIndex + 2);

  const days = REVIEW_INTERVALS[grade === "again" ? 0 : nextIndex];
  const due = new Date(from);
  if (Number.isNaN(due.getTime())) throw new TypeError("from must be a valid date");
  due.setDate(due.getDate() + days);

  return { intervalIndex: nextIndex, days, dueAt: due.toISOString() };
}

export function sumFocusMinutes(sessions, start, end) {
  const lower = new Date(start).getTime();
  const upper = new Date(end).getTime();
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower > upper) {
    throw new TypeError("start and end must define a valid date range");
  }
  if (!Array.isArray(sessions)) return 0;

  return sessions.reduce((total, session) => {
    if (!session || session.mode !== "focus") return total;
    const completedAt = new Date(session.completedAt).getTime();
    if (!Number.isFinite(completedAt) || completedAt < lower || completedAt > upper) return total;
    const minutes = Number(session.minutes);
    return total + (Number.isFinite(minutes) ? Math.max(0, minutes) : 0);
  }, 0);
}
