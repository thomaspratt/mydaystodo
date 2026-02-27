// ── Hex → HSL conversion ──
function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function generateTheme(name, accentHex) {
  const [h] = hexToHsl(accentHex);
  return {
    name,
    bg: hslToHex(h, 20, 8),
    surface: hslToHex(h, 20, 13),
    surfaceHover: hslToHex(h, 18, 18),
    text: hslToHex(h, 15, 95),
    textMuted: hslToHex(h, 15, 55),
    accent: accentHex,
    border: hslToHex(h, 15, 25),
    calBg: hslToHex(h, 18, 10),
    today: hslToHex(h, 25, 18),
    categories: [
      accentHex,
      hslToHex(h + 72, 65, 65),
      hslToHex(h + 144, 65, 65),
      hslToHex(h + 216, 65, 65),
      hslToHex(h + 288, 65, 65),
    ],
  };
}

// ── Theme Definitions ──
export const THEMES = {
  sunset: {
    name: "Sunset",
    bg: "#1a1216", surface: "#2a1f24", surfaceHover: "#3a2c32",
    text: "#f5e6eb", textMuted: "#b89aa5", accent: "#ff6b8a",
    border: "#4a3540", calBg: "#221a1e", today: "#3d2530",
    categories: ["#e8807a", "#d4976b", "#c7a85e", "#d68cb2", "#b87878"],
  },
  forest: {
    name: "Forest",
    bg: "#0f1a14", surface: "#1a2b20", surfaceHover: "#243828",
    text: "#e0f0e4", textMuted: "#8aab94", accent: "#5fd68c",
    border: "#2e4a36", calBg: "#152218", today: "#1e3826",
    categories: ["#5aad6e", "#c4a24e", "#3d9e8a", "#8db85a", "#d48a5c"],
  },
  ocean: {
    name: "Ocean",
    bg: "#0c1520", surface: "#152233", surfaceHover: "#1e3048",
    text: "#dce8f5", textMuted: "#7a9aba", accent: "#4fc3f7",
    border: "#2a3f5c", calBg: "#111c2c", today: "#1a3050",
    categories: ["#4fb8d4", "#7a8ec4", "#5cc4a0", "#c49a6e", "#a07ebc"],
  },
  berry: {
    name: "Berry",
    bg: "#18101e", surface: "#261a30", surfaceHover: "#352440",
    text: "#f0e4f5", textMuted: "#a98abd", accent: "#d17bea",
    border: "#402e50", calBg: "#1e1528", today: "#30203e",
    categories: ["#c470e0", "#e87aaa", "#7a8ee0", "#d4a05c", "#5cc4b8"],
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
  none: { label: "None", glow: "none", border: 1, icon: "", iconSize: 1 },
  low: { label: "Low", glow: "0 0 4px", border: 1.5, icon: "○", iconSize: 1 },
  medium: { label: "Medium", glow: "0 0 8px", border: 2, icon: "●", iconSize: 1.15 },
  high: { label: "High", glow: "0 0 14px", border: 3, icon: "★", iconSize: 1 },
};

export const SOUNDS = {
  chime: { name: "Chime", type: "tonal", freq: [523, 659, 784], wave: "sine", dur: 0.4, spacing: 0.1 },
  windchime: { name: "Cheer", type: "tonal", freq: [1047, 1319, 1568, 1760], wave: "sine", dur: 0.7, spacing: 0.15 },
  whoosh: { name: "Whoosh", type: "noise", dur: 0.4 },
  pop: { name: "Pop", type: "noise", dur: 0.08, style: "pop" },
  quack: { name: "Quack", type: "file", src: "/sounds/quack.mp3" },
  whistle: { name: "Whistle", type: "file", src: "/sounds/whistle.mp3" },
  bubble: { name: "Bubble", type: "custom", synth: "bubble" },
  laser: { name: "Laser", type: "custom", synth: "laser" },
  kalimba: { name: "Kalimba", type: "custom", synth: "kalimba" },
  coin: { name: "Coin", type: "custom", synth: "coin" },
};

export const ENCOURAGEMENTS = [
  "You're soooo smart","I can't believe you did that! Just kidding. I knew you would",
  "Click it again. Just for fun. You won't","Congratulations. We love you","Phew! We were about to have an intervention about that one",
  "Amazing news!","Good job! Now take two minutes to dance","You're soooo cute","I love when you click me!",
  "Nice! We've just paid you 5 dollars","Please don't spam click just to see all the messages :(",
  "Delicious","Extravagant","That went swimmingly","Wow... you're amazing", "I'm speechless",
  "You seem like a really cool person","It's so admirable how much you care about people and things",
  "I just told everyone you did that","That task never stood a chance.","The other tasks must be so scared",
  "That was so satisfying I felt it too",
  "Very skillful click! You're getting this!",
  "All the other todo list apps are getting really jealous of your productivity. It's a problem",
  "Quack","I bet that was pretty easy for you","Now that you finished that, do you have time to be my friend?",
  "Hey. You. I'm really proud of you", "That task had a family", "Wait don't go yet. Just stay here for a second. Ok you can go",
  "Some of the other messages have an annoying tone. This one is just a pure, no-frills congratulations. I bet nobody orders black coffee anymore",
  "I've seen a lot of task in my life, and that one is arguably the most complete of all",
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
