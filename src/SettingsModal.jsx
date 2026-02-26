import { useState, useRef, useEffect, useCallback } from "react";
import { THEMES, SOUNDS, generateTheme } from "./themes";
import { playSound } from "./utils";

// ── Custom Color Picker ──
function ColorPicker({ value, onChange, theme: t }) {
  const [open, setOpen] = useState(false);
  const [hue, setHue] = useState(0);
  const [sat, setSat] = useState(100);
  const [light, setLight] = useState(50);
  const popRef = useRef(null);
  const canvasRef = useRef(null);
  const initialized = useRef(false);

  // Parse incoming hex into HSL on first open
  useEffect(() => {
    if (open && !initialized.current) {
      const [h, s, l] = hexToHsl(value);
      setHue(h);
      setSat(s);
      setLight(l);
      initialized.current = true;
    }
    if (!open) initialized.current = false;
  }, [open, value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (popRef.current && !popRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Draw the sat/light gradient canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const s = (x / w) * 100;
        const l = 100 - (y / h) * 100;
        ctx.fillStyle = `hsl(${hue}, ${s}%, ${l}%)`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, [hue]);

  useEffect(() => { if (open) drawCanvas(); }, [open, drawCanvas]);

  function emitColor(h, s, l) {
    onChange(hslToHexColor(h, s, l));
  }

  function handleCanvasInteraction(e) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    const newSat = Math.round((x / rect.width) * 100);
    const newLight = Math.round(100 - (y / rect.height) * 100);
    setSat(newSat);
    setLight(newLight);
    emitColor(hue, newSat, newLight);
  }

  function handleCanvasDown(e) {
    e.preventDefault();
    handleCanvasInteraction(e);
    function onMove(ev) { handleCanvasInteraction(ev); }
    function onUp() { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function handleHueChange(e) {
    const h = Number(e.target.value);
    setHue(h);
    emitColor(h, sat, light);
  }

  // Marker position on canvas
  const markerX = `${sat}%`;
  const markerY = `${100 - light}%`;

  // Compute fixed position for popover so it stays within viewport
  const btnRef = useRef(null);
  const [popPos, setPopPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const popW = 220;
      let left = rect.left + rect.width / 2 - popW / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - popW - 8));
      const top = rect.top - 8;
      setPopPos({ top, left });
    }
  }, [open]);

  // Touch support for canvas
  function handleCanvasTouchInteraction(e) {
    const touch = e.touches[0];
    if (!touch) return;
    handleCanvasInteraction(touch);
  }

  function handleCanvasTouchStart(e) {
    e.preventDefault();
    handleCanvasTouchInteraction(e);
    function onMove(ev) { ev.preventDefault(); handleCanvasTouchInteraction(ev); }
    function onEnd() { document.removeEventListener("touchmove", onMove); document.removeEventListener("touchend", onEnd); }
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
  }

  return (
    <div ref={popRef} style={{ position: "relative" }}>
      <button ref={btnRef} onClick={() => setOpen(!open)} style={{
        width: 36, height: 36, borderRadius: 10, cursor: "pointer",
        background: value, border: `2px solid ${t.border}`,
        boxShadow: `0 0 0 1px ${t.bg}`,
      }} />
      {open && (
        <div style={{
          position: "fixed", bottom: "auto", top: popPos.top, left: popPos.left,
          transform: "translateY(-100%)",
          background: t.bg, border: `1px solid ${t.border}`, borderRadius: 14,
          padding: 14, zIndex: 600, boxShadow: `0 12px 32px rgba(0,0,0,0.5)`,
          width: 220, animation: "fadeIn 0.15s ease",
        }}>
          {/* Sat/Light canvas */}
          <div style={{ position: "relative", marginBottom: 10, borderRadius: 8, overflow: "hidden", cursor: "crosshair" }}>
            <canvas ref={canvasRef} width={192} height={120} style={{ display: "block", width: "100%", height: 120, borderRadius: 8, touchAction: "none" }}
              onMouseDown={handleCanvasDown}
              onTouchStart={handleCanvasTouchStart}
            />
            <div style={{
              position: "absolute", left: markerX, top: markerY, width: 12, height: 12,
              borderRadius: "50%", border: "2px solid #fff", boxShadow: "0 0 3px rgba(0,0,0,0.5)",
              transform: "translate(-50%, -50%)", pointerEvents: "none",
              background: value,
            }} />
          </div>
          {/* Hue slider */}
          <div style={{ marginBottom: 10 }}>
            <input type="range" min="0" max="360" value={hue} onChange={handleHueChange}
              className="hue-slider"
              style={{
                width: "100%", height: 14, borderRadius: 7, appearance: "none", cursor: "pointer",
                background: "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
              }}
            />
          </div>
          <style>{`
            .hue-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #fff; border: 2px solid rgba(0,0,0,0.3); box-shadow: 0 1px 4px rgba(0,0,0,0.4); cursor: pointer; }
            .hue-slider::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: #fff; border: 2px solid rgba(0,0,0,0.3); box-shadow: 0 1px 4px rgba(0,0,0,0.4); cursor: pointer; }
            .hue-slider::-moz-range-track { height: 14px; border-radius: 7px; border: none; }
          `}</style>
          {/* Hex display */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6, background: value,
              border: `1px solid ${t.border}`, flexShrink: 0,
            }} />
            <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 600, color: t.text, letterSpacing: "0.02em" }}>
              {value.toUpperCase()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Hex ↔ HSL helpers ──
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

function hslToHexColor(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// ── Settings Modal ──
export default function SettingsModal({ theme, setTheme, sound, setSound, categories, setCategories, customThemes, setCustomThemes, allThemes, onClose, onSignOut }) {
  const t = allThemes[theme] || allThemes.sunset;
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(t.categories[categories.length % t.categories.length]);
  const [creatingTheme, setCreatingTheme] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");
  const [newThemeColor, setNewThemeColor] = useState("#ff6b8a");
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  function addCategory() {
    if (!newCatName.trim() || categories.find((c) => c.name === newCatName.trim())) return;
    setCategories([...categories, { name: newCatName.trim(), color: newCatColor }]);
    setNewCatName("");
  }

  function createCustomTheme() {
    if (!newThemeName.trim()) return;
    const key = `custom_${Date.now()}`;
    const themeObj = generateTheme(newThemeName.trim(), newThemeColor);
    setCustomThemes({ ...customThemes, [key]: themeObj });
    setTheme(key, themeObj.categories);
    setNewThemeName("");
    setCreatingTheme(false);
  }

  function deleteCustomTheme(key) {
    const next = { ...customThemes };
    delete next[key];
    setCustomThemes(next);
    if (theme === key) setTheme("sunset");
  }

  const labelStyle = { color: t.textMuted, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 10, fontFamily: "'Nunito', sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 500, backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease",
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: t.surface, borderRadius: 16, padding: 28,
        width: "min(440px, 92vw)", maxHeight: "85vh", overflowY: "auto", overflowX: "hidden",
        border: `1px solid ${t.border}`, boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        animation: "slideUp 0.25s ease",
      }}>
        <h3 style={{ color: t.text, margin: "0 0 24px", fontFamily: "'Nunito', sans-serif", fontSize: 20, fontWeight: 700 }}>Settings</h3>

        {/* Built-in Themes */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Themes</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(THEMES).map(([key, th]) => (
              <button key={key} onClick={() => setTheme(key)} style={{
                padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                border: theme === key ? `2px solid ${th.accent}` : `1px solid ${t.border}`,
                background: theme === key ? th.bg : t.bg,
                color: theme === key ? th.accent : t.textMuted,
                fontSize: 13, fontWeight: theme === key ? 700 : 500,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: th.accent, display: "inline-block" }} />
                {th.name}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Themes */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Custom Themes</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {Object.entries(customThemes).map(([key, th]) => {
              const active = theme === key;
              const bg = active ? th.bg : t.bg;
              const bdr = active ? `2px solid ${th.accent}` : `1px solid ${t.border}`;
              return (
                <button key={key} onClick={() => setTheme(key)} style={{
                  padding: "8px 10px 8px 16px", borderRadius: 20, cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                  border: bdr, background: bg,
                  color: active ? th.accent : t.textMuted,
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: th.accent, display: "inline-block" }} />
                  {th.name}
                  <span onClick={(e) => { e.stopPropagation(); deleteCustomTheme(key); }}
                    style={{ marginLeft: 2, color: t.textMuted, fontSize: 14, lineHeight: 1, cursor: "pointer", padding: "0 2px" }}>×</span>
                </button>
              );
            })}
            {!creatingTheme && (
              <button onClick={() => setCreatingTheme(true)} style={{
                width: 36, height: 36, borderRadius: 20, cursor: "pointer",
                border: `1px solid ${t.border}`, background: t.bg, color: t.textMuted,
                fontSize: 18, fontWeight: 300, display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Nunito', sans-serif",
              }}>+</button>
            )}
          </div>
          {creatingTheme && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input value={newThemeName} onChange={(e) => setNewThemeName(e.target.value)} placeholder="Theme name"
                onKeyDown={(e) => e.key === "Enter" && createCustomTheme()}
                style={{ flex: 1, padding: "8px 12px", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 13, outline: "none", fontFamily: "'Nunito', sans-serif" }}
              />
              <ColorPicker value={newThemeColor} onChange={setNewThemeColor} theme={t} />
              <button onClick={createCustomTheme} style={{
                padding: "8px 14px", background: t.accent, border: "none", borderRadius: 8,
                color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 700, fontFamily: "'Nunito', sans-serif",
              }}>Create</button>
              <button onClick={() => setCreatingTheme(false)} style={{
                padding: "8px 10px", background: "none", border: `1px solid ${t.border}`, borderRadius: 8,
                color: t.textMuted, fontSize: 13, cursor: "pointer", fontFamily: "'Nunito', sans-serif",
              }}>Cancel</button>
            </div>
          )}
        </div>

        {/* Sounds */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Completion Sound</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(SOUNDS).map(([key, s]) => (
              <button key={key} onClick={() => { setSound(key); playSound(key); }} style={{
                padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                border: sound === key ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                background: sound === key ? `${t.accent}22` : t.bg,
                color: sound === key ? t.accent : t.textMuted,
                fontSize: 13, fontWeight: sound === key ? 700 : 500,
              }}>{s.name}</button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Categories</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
            {categories.map((c) => (
              <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", background: t.bg, borderRadius: 8 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: c.color, flexShrink: 0 }} />
                <span style={{ color: t.text, fontSize: 14, flex: 1, fontFamily: "'Nunito', sans-serif" }}>{c.name}</span>
                {categories.length > 1 && (
                  <button onClick={() => setCategories(categories.filter((x) => x.name !== c.name))}
                    style={{ background: "none", border: "none", color: t.textMuted, cursor: "pointer", fontSize: 16 }}>×</button>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="New category"
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              style={{ flex: 1, padding: "8px 12px", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 13, outline: "none", fontFamily: "'Nunito', sans-serif" }}
            />
            <button onClick={() => {
              const idx = categories.length;
              if (idx < t.categories.length) {
                setNewCatColor(t.categories[idx]);
              } else {
                const h = Math.floor(Math.random() * 360);
                setNewCatColor(hslToHexColor(h, 55 + Math.random() * 20, 55 + Math.random() * 15));
              }
            }} style={{
              padding: "6px 10px", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8,
              color: t.textMuted, fontSize: 11, cursor: "pointer", fontWeight: 700, fontFamily: "'Nunito', sans-serif",
              whiteSpace: "nowrap",
            }}>Theme</button>
            <ColorPicker value={newCatColor} onChange={setNewCatColor} theme={t} />
            <button onClick={addCategory} style={{
              padding: "8px 14px", background: t.accent, border: "none", borderRadius: 8,
              color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 700, fontFamily: "'Nunito', sans-serif",
            }}>+</button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => setConfirmSignOut(true)} style={{
            padding: "10px 20px", background: "none", border: `1px solid ${t.border}`, borderRadius: 10,
            color: t.textMuted, fontSize: 13, cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontWeight: 600,
          }}>Sign Out</button>
          <button onClick={onClose} style={{
            padding: "10px 24px", background: t.accent, border: "none", borderRadius: 10,
            color: "#fff", fontSize: 14, cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontWeight: 700,
          }}>Done</button>
        </div>

        {confirmSignOut && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 600,
          }} onClick={() => setConfirmSignOut(false)}>
            <div onClick={(e) => e.stopPropagation()} style={{
              background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14,
              padding: 24, width: "min(320px, 85vw)", boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
              animation: "slideUp 0.2s ease",
            }}>
              <p style={{ color: t.text, fontSize: 15, fontWeight: 600, fontFamily: "'Nunito', sans-serif", marginBottom: 6 }}>Sign out?</p>
              <p style={{ color: t.textMuted, fontSize: 13, fontFamily: "'Nunito', sans-serif", marginBottom: 20 }}>Your data is saved and will sync when you sign back in.</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setConfirmSignOut(false)} style={{
                  padding: "8px 18px", background: "none", border: `1px solid ${t.border}`, borderRadius: 8,
                  color: t.textMuted, fontSize: 13, cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontWeight: 600,
                }}>Cancel</button>
                <button onClick={onSignOut} style={{
                  padding: "8px 18px", background: t.accent, border: "none", borderRadius: 8,
                  color: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontWeight: 700,
                }}>Sign Out</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
