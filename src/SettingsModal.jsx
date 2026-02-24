import { useState } from "react";
import { THEMES, SOUNDS } from "./themes";
import { playSound } from "./utils";

export default function SettingsModal({ theme, setTheme, sound, setSound, categories, setCategories, onClose }) {
  const t = THEMES[theme];
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(t.categories[categories.length % t.categories.length]);

  function addCategory() {
    if (!newCatName.trim() || categories.find((c) => c.name === newCatName.trim())) return;
    setCategories([...categories, { name: newCatName.trim(), color: newCatColor }]);
    setNewCatName("");
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 500, backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease",
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: t.surface, borderRadius: 16, padding: 28,
        width: "min(440px, 92vw)", maxHeight: "85vh", overflowY: "auto",
        border: `1px solid ${t.border}`, boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        animation: "slideUp 0.25s ease",
      }}>
        <h3 style={{ color: t.text, margin: "0 0 24px", fontFamily: "'Nunito', sans-serif", fontSize: 20, fontWeight: 700 }}>Settings</h3>

        {/* Themes */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: t.textMuted, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 10, fontFamily: "'Nunito', sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>Theme</label>
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

        {/* Sounds */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: t.textMuted, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 10, fontFamily: "'Nunito', sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>Completion Sound</label>
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
          <label style={{ color: t.textMuted, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 10, fontFamily: "'Nunito', sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>Categories</label>
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
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="New category"
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              style={{ flex: 1, padding: "8px 12px", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 13, outline: "none", fontFamily: "'Nunito', sans-serif" }}
            />
            <input type="color" value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)}
              style={{ width: 36, height: 36, border: "none", borderRadius: 8, cursor: "pointer", background: "none" }}
            />
            <button onClick={addCategory} style={{
              padding: "8px 14px", background: t.accent, border: "none", borderRadius: 8,
              color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 700, fontFamily: "'Nunito', sans-serif",
            }}>+</button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "10px 24px", background: t.accent, border: "none", borderRadius: 10,
            color: "#fff", fontSize: 14, cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontWeight: 700,
          }}>Done</button>
        </div>
      </div>
    </div>
  );
}
