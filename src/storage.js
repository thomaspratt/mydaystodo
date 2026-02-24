export function loadState(key, fallback) {
  try {
    const stored = localStorage.getItem(`mydays_${key}`);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function saveState(key, value) {
  try {
    localStorage.setItem(`mydays_${key}`, JSON.stringify(value));
  } catch {}
}
