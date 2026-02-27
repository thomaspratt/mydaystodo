import { useState, useRef, useEffect } from "react";

export default function CustomSelect({ value, onChange, options, theme: t, style, dropUp }) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(-1);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find((o) => o.value === value);

  function handleKey(e) {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
        setFocused(options.findIndex((o) => o.value === value));
      }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setFocused((f) => Math.min(f + 1, options.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setFocused((f) => Math.max(f - 1, 0)); }
    if ((e.key === "Enter" || e.key === " ") && focused >= 0) {
      e.preventDefault();
      onChange(options[focused].value);
      setOpen(false);
    }
  }

  return (
    <div ref={ref} style={{ position: "relative", ...style }}>
      <div
        tabIndex={0}
        role="listbox"
        onKeyDown={handleKey}
        onClick={() => { setOpen(!open); setFocused(options.findIndex((o) => o.value === value)); }}
        style={{
          width: "100%", padding: "8px 12px", background: t.bg,
          border: `1px solid ${t.border}`, borderRadius: 8, color: t.text,
          fontSize: 14, fontFamily: "'Nunito', sans-serif", cursor: "pointer",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          boxSizing: "border-box", outline: "none",
        }}
      >
        <span>{selected ? selected.label : ""}</span>
        <span style={{ color: t.textMuted, fontSize: 12, marginLeft: 8 }}>▾</span>
      </div>
      {open && (
        <div style={{
          position: "absolute", left: 0, right: 0,
          ...(dropUp ? { bottom: "calc(100% + 4px)" } : { top: "calc(100% + 4px)" }),
          background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10,
          zIndex: 600, maxHeight: 220, overflowY: "auto",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}>
          {options.map((o, i) => (
            <div
              key={o.value}
              onMouseEnter={() => setFocused(i)}
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{
                padding: "8px 14px", cursor: "pointer",
                fontFamily: "'Nunito', sans-serif", fontSize: 14,
                background: focused === i ? t.accent + "33" : "transparent",
                color: focused === i || o.value === value ? t.accent : t.text,
                fontWeight: o.value === value ? 700 : 400,
                borderRadius: i === 0 ? "10px 10px 0 0" : i === options.length - 1 ? "0 0 10px 10px" : 0,
              }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
