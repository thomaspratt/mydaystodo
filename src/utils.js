import { SOUNDS } from "./themes";

// ── Date Helpers ──
// CRITICAL: Always use "T00:00:00" to force local-time parsing.
// new Date("2026-02-24") parses as UTC midnight, which becomes the
// previous day in US timezones. This caused recurrence instances to
// never match future dates.
export function parseDate(str) {
  return new Date(str + "T00:00:00");
}

export function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isToday(d) {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function daysBetween(a, b) {
  const msPerDay = 86400000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / msPerDay);
}

export function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function getWeekDates(date) {
  const d = new Date(date);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(start);
    dd.setDate(start.getDate() + i);
    return dd;
  });
}

export function getMonthDates(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const dates = [];
  for (let i = -startPad; i < lastDay.getDate() + (6 - lastDay.getDay()); i++) {
    dates.push(new Date(year, month, i + 1));
  }
  return dates;
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Sound Player ──
export function playSound(soundKey) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const sound = SOUNDS[soundKey];
    if (!sound) return;
    sound.freq.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = sound.type;
      osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + sound.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + sound.dur);
    });
  } catch (e) {}
}

// ── Recurrence Engine ──
// Direct-match approach: for a given view date, check if it falls on the
// recurrence pattern from the task's origin date. No iteration needed.
export function getRecurrenceInstances(task, viewDateStr) {
  if (!task.recurrence) return [];
  const origin = parseDate(task.date);
  const viewDate = parseDate(viewDateStr);

  // No instances on or before origin
  if (viewDate.getTime() <= origin.getTime()) return [];
  // No instances past the end date
  if (task.recurrenceEnd && viewDate.getTime() > parseDate(task.recurrenceEnd).getTime()) return [];

  const diffDays = daysBetween(origin, viewDate);
  let matches = false;

  switch (task.recurrence) {
    case "daily":
      matches = diffDays > 0;
      break;
    case "weekly":
      matches = diffDays > 0 && diffDays % 7 === 0;
      break;
    case "biweekly":
      matches = diffDays > 0 && diffDays % 14 === 0;
      break;
    case "monthly":
      matches = viewDate.getDate() === origin.getDate() &&
        (viewDate.getFullYear() > origin.getFullYear() ||
         (viewDate.getFullYear() === origin.getFullYear() && viewDate.getMonth() > origin.getMonth()));
      break;
  }

  if (!matches) return [];

  return [{
    ...task,
    id: `${task.id}_rec_${viewDateStr}`,
    originalId: task.id,
    date: viewDateStr,
    completed: false,
    isRecurrenceInstance: true,
  }];
}
