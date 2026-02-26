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
// Shared AudioContext for iOS silent mode support
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_audioCtx.state === "suspended") _audioCtx.resume();
  return _audioCtx;
}

// Custom sound synthesizers
const CUSTOM_SYNTHS = {
  bubble(ctx, now) {
    // Three rising bubbles: sine with pitch bend + filtered noise
    [0, 0.12, 0.26].forEach((offset, i) => {
      const t = now + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const baseFreq = 250 + i * 80;
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.5, t + 0.08);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  },

  laser(ctx, now) {
    // Retro laser: descending sine sweep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.35);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(4000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.35);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  },

  kalimba(ctx, now) {
    // Metallic plucked tines: pairs of harmonically-related sines
    [0, 0.11, 0.22].forEach((offset, i) => {
      const t = now + offset;
      const freqs = [[523, 1568], [659, 1976], [784, 2349]][i];
      freqs.forEach((f) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(f > 1000 ? 0.06 : 0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.55);
      });
    });
  },

  coin(ctx, now) {
    // Video game coin collect: bright rising arpeggio
    [0, 0.06].forEach((offset, i) => {
      const t = now + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(i === 0 ? 988 : 1319, t);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.setValueAtTime(0.1, t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (i === 0 ? 0.12 : 0.4));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  },
};

export function playSound(soundKey) {
  try {
    const ctx = getAudioCtx();
    const sound = SOUNDS[soundKey];
    if (!sound) return;
    const now = ctx.currentTime;

    if (sound.type === "file") {
      // Play audio file through AudioContext (works with iOS silent mode)
      fetch(sound.src)
        .then((r) => r.arrayBuffer())
        .then((buf) => ctx.decodeAudioData(buf))
        .then((decoded) => {
          const src = ctx.createBufferSource();
          src.buffer = decoded;
          src.connect(ctx.destination);
          src.start(0);
        }).catch(() => {});
      return;
    } else if (sound.type === "custom") {
      const synth = CUSTOM_SYNTHS[sound.synth];
      if (synth) synth(ctx, now);
    } else if (sound.type === "noise") {
      // White noise buffer
      const len = ctx.sampleRate * sound.dur;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;

      if (sound.style === "pop") {
        // Short filtered pop
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.setValueAtTime(800, now);
        bp.Q.value = 2;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + sound.dur);
        src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
      } else {
        // Whoosh: swept bandpass filter
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.setValueAtTime(300, now);
        bp.frequency.exponentialRampToValueAtTime(3000, now + sound.dur * 0.4);
        bp.frequency.exponentialRampToValueAtTime(600, now + sound.dur);
        bp.Q.value = 1.5;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.18, now + sound.dur * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + sound.dur);
        src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
      }
      src.start(now);
      src.stop(now + sound.dur);
    } else {
      // Tonal sounds
      const spacing = sound.spacing || 0.1;
      sound.freq.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = sound.wave || "sine";
        const t0 = now + i * spacing;
        osc.frequency.setValueAtTime(f, t0);
        gain.gain.setValueAtTime(0.12, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + sound.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + sound.dur);
      });
    }
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
    case "yearly":
      matches = viewDate.getMonth() === origin.getMonth() &&
        viewDate.getDate() === origin.getDate() &&
        viewDate.getFullYear() > origin.getFullYear();
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
