// ── Theme Definitions ──
export const THEMES = {
  sunset: {
    name: "Sunset",
    bg: "#1a1216", surface: "#2a1f24", surfaceHover: "#3a2c32",
    text: "#f5e6eb", textMuted: "#b89aa5", accent: "#ff6b8a",
    border: "#4a3540", calBg: "#221a1e", today: "#3d2530",
    categories: ["#ff6b8a", "#ffb347", "#87ceeb", "#dda0dd", "#98d4a2"],
  },
  forest: {
    name: "Forest",
    bg: "#0f1a14", surface: "#1a2b20", surfaceHover: "#243828",
    text: "#e0f0e4", textMuted: "#8aab94", accent: "#5fd68c",
    border: "#2e4a36", calBg: "#152218", today: "#1e3826",
    categories: ["#5fd68c", "#f0c040", "#6bb5e0", "#c49bdb", "#e88a73"],
  },
  ocean: {
    name: "Ocean",
    bg: "#0c1520", surface: "#152233", surfaceHover: "#1e3048",
    text: "#dce8f5", textMuted: "#7a9aba", accent: "#4fc3f7",
    border: "#2a3f5c", calBg: "#111c2c", today: "#1a3050",
    categories: ["#4fc3f7", "#ffcc80", "#ef9a9a", "#ce93d8", "#a5d6a7"],
  },
  berry: {
    name: "Berry",
    bg: "#18101e", surface: "#261a30", surfaceHover: "#352440",
    text: "#f0e4f5", textMuted: "#a98abd", accent: "#d17bea",
    border: "#402e50", calBg: "#1e1528", today: "#30203e",
    categories: ["#d17bea", "#ffb74d", "#4dd0e1", "#f48fb1", "#aed581"],
  },
  lisafrank: {
    name: "Lisa Frank",
    bg: "#1a0a2e", surface: "#2a1445", surfaceHover: "#3a1e5a",
    text: "#f5e6ff", textMuted: "#c9a0e8", accent: "#ff44cc",
    border: "#5a2e80", calBg: "#220e3a", today: "#3a1858",
    categories: ["#ff44cc", "#00ffcc", "#ffee00", "#ff6644", "#44aaff"],
  },
};

export const PRIORITY_CONFIG = {
  none: { label: "None", glow: "none", border: 1, icon: "" },
  low: { label: "Low", glow: "0 0 4px", border: 1.5, icon: "○" },
  medium: { label: "Medium", glow: "0 0 8px", border: 2, icon: "◉" },
  high: { label: "High", glow: "0 0 14px", border: 3, icon: "★" },
};

export const SOUNDS = {
  chime: { name: "Chime", type: "tonal", freq: [523, 659, 784], wave: "sine", dur: 0.4, spacing: 0.1 },
  bell: { name: "Bell", type: "tonal", freq: [880, 1109], wave: "sine", dur: 0.6, spacing: 0.12 },
  harp: { name: "Harp", type: "tonal", freq: [392, 494, 587, 784], wave: "sine", dur: 0.5, spacing: 0.07 },
  marimba: { name: "Marimba", type: "tonal", freq: [523, 784], wave: "triangle", dur: 0.25, spacing: 0.1 },
  windchime: { name: "Wind Chime", type: "tonal", freq: [1047, 1319, 1568, 1760], wave: "sine", dur: 0.7, spacing: 0.15 },
  raindrop: { name: "Raindrop", type: "tonal", freq: [1200, 800], wave: "sine", dur: 0.35, spacing: 0.12 },
  whisper: { name: "Whisper", type: "tonal", freq: [440, 554, 659], wave: "triangle", dur: 0.45, spacing: 0.09 },
  bloom: { name: "Bloom", type: "tonal", freq: [330, 440, 554, 659], wave: "sine", dur: 0.55, spacing: 0.12 },
  whoosh: { name: "Whoosh", type: "noise", dur: 0.4 },
  pop: { name: "Pop", type: "noise", dur: 0.08, style: "pop" },
};

export const ENCOURAGEMENTS = [
  "you're seriously so cute","i can't believe you did that! just kidding. i knew you would",
  "click it again. just for fun. you won't","congratulations. we love you","phew! we were about to have an intervention about that one",
  "amazing news!","good job! now take two minutes to dance","you're soooo cute","i love when you click me!",
  "nice! we've just paid you 5 dollars","please don't spam click just to see all the messages :(",
  "delicious","extravagant","that went swimmingly","wow... you're amazing", "i'm speechless",
  "you seem like a really cool person","it's so admirable how much you care about people and things",
  "i just told everyone you did that","that task never stood a chance.","the other tasks are sooo scared",
  "that was so satisfying i felt it too","you're starting the checkmark renaissance",
  "very skillful click! you're getting this!","do you take constructive praise?",
  "all the other todo list apps are getting really jealous. it's a problem"
];

export const DEFAULT_CATEGORIES = [
  { name: "Personal", color: THEMES.sunset.categories[0] },
  { name: "Home", color: THEMES.sunset.categories[1] },
  { name: "School", color: THEMES.sunset.categories[2] },
  { name: "Health", color: THEMES.sunset.categories[3] },
];

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
