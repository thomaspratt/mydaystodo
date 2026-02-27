import { useState, useRef, useEffect } from "react";
import { getMonthDates, dateKey, parseDate } from "./utils";
import { MONTH_NAMES } from "./themes";

export default function DatePicker({ value, onChange, theme: t, style, dropUp }) {
  const [open, setOpen] = useState(false);
  const parsed = value ? parseDate(value) : new Date();
  const [viewYear, setViewYear] = useState(parsed.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed.getMonth());
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function handleKey(e) {
      if (e.key === "Escape" && open) { e.preventDefault(); setOpen(false); }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("mousedown", handleClick); document.removeEventListener("keydown", handleKey); };
  }, [open]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  function handleOpen() {
    const d = value ? parseDate(value) : new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setOpen(!open);
  }

  const days = getMonthDates(new Date(viewYear, viewMonth, 1));
  const today = new Date();
  const todayStr = dateKey(today);

  function formatDisplay(val) {
    if (!val) return "";
    const d = parseDate(val);
    return `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
  }

  const navBtn = {
    background: "none", border: "none", color: t.textMuted, cursor: "pointer",
    fontSize: 14, padding: "2px 8px", fontFamily: "'Nunito', sans-serif",
    borderRadius: 6,
  };

  return (
    <div ref={ref} style={{ position: "relative", ...style }}>
      <div
        onClick={handleOpen}
        style={{
          width: "100%", padding: "8px 12px", background: t.bg,
          border: `1px solid ${t.border}`, borderRadius: 8, color: t.text,
          fontSize: 14, fontFamily: "'Nunito', sans-serif", cursor: "pointer",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          boxSizing: "border-box",
        }}
      >
        <span>{formatDisplay(value)}</span>
        <span style={{ color: t.textMuted, fontSize: 12, marginLeft: 8 }}>▾</span>
      </div>
      {open && (
        <div style={{
          position: "absolute", left: 0,
          ...(dropUp ? { bottom: "calc(100% + 4px)" } : { top: "calc(100% + 4px)" }),
          width: "min(280px, 100%)", background: t.surface,
          border: `1px solid ${t.border}`, borderRadius: 10,
          zIndex: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          padding: 8, fontFamily: "'Nunito', sans-serif",
        }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <button onClick={prevMonth} style={navBtn}>◂</button>
            <span style={{ color: t.text, fontWeight: 700, fontSize: 13 }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} style={navBtn}>▸</button>
          </div>
          {/* Day-of-week row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", marginBottom: 2 }}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} style={{ color: t.textMuted, fontSize: 10, fontWeight: 600, padding: "1px 0" }}>{d}</div>
            ))}
          </div>
          {/* Day grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
            {days.map((d, i) => {
              const dk = dateKey(d);
              const isCurrentMonth = d.getMonth() === viewMonth;
              const isSelected = dk === value;
              const isToday = dk === todayStr;
              return (
                <div
                  key={i}
                  onClick={() => { if (dk) { onChange(dk); setOpen(false); } }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = isSelected ? t.accent : t.accent + "22"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? t.accent : "transparent"; }}
                  style={{
                    textAlign: "center", borderRadius: 6, cursor: "pointer",
                    fontSize: 12, fontWeight: isSelected ? 700 : 400,
                    color: isSelected ? "#fff" : isCurrentMonth ? t.text : t.textMuted,
                    opacity: isCurrentMonth ? 1 : 0.35,
                    background: isSelected ? t.accent : "transparent",
                    border: isToday && !isSelected ? `1px solid ${t.accent}` : "1px solid transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    aspectRatio: "1",
                  }}
                >
                  {d.getDate()}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
