import { THEMES } from "./themes";

export default function DeleteDialog({ task, onDeleteThis, onDeleteAll, onClose, theme, allThemes }) {
  const t = (allThemes || THEMES)[theme] || THEMES.sunset;
  const isRecurring = !!(task.recurrence || task.isRecurrenceInstance);

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 600, backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: t.surface, borderRadius: 16, padding: 24,
          width: "min(380px, 90vw)", border: `1px solid ${t.border}`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)", animation: "slideUp 0.25s ease",
        }}
      >
        <h3 style={{ color: t.text, margin: "0 0 8px", fontFamily: "'Nunito', sans-serif", fontSize: 18, fontWeight: 700 }}>
          Delete Task
        </h3>
        <p style={{ color: t.textMuted, fontSize: 14, fontFamily: "'Nunito', sans-serif", margin: "0 0 20px", lineHeight: 1.5 }}>
          {isRecurring
            ? `"${task.title}" is a recurring task. What would you like to delete?`
            : `Delete "${task.title}"? This can't be undone.`}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {isRecurring ? (
            <>
              <button onClick={onDeleteThis} style={{
                padding: "10px 16px", borderRadius: 10, border: `1px solid ${t.border}`,
                background: t.bg, color: t.text, fontSize: 14, cursor: "pointer",
                fontFamily: "'Nunito', sans-serif", fontWeight: 600,
              }}>
                🗑 Just this one
              </button>
              <button onClick={onDeleteAll} style={{
                padding: "10px 16px", borderRadius: 10, border: "1px solid #ff4d4f44",
                background: "#ff4d4f15", color: "#ff6b6b", fontSize: 14, cursor: "pointer",
                fontFamily: "'Nunito', sans-serif", fontWeight: 600,
              }}>
                🗑 This and all future
              </button>
            </>
          ) : (
            <button onClick={onDeleteAll} style={{
              padding: "10px 16px", borderRadius: 10, border: "1px solid #ff4d4f44",
              background: "#ff4d4f15", color: "#ff6b6b", fontSize: 14, cursor: "pointer",
              fontFamily: "'Nunito', sans-serif", fontWeight: 600,
            }}>Delete</button>
          )}
          <button onClick={onClose} style={{
            padding: "10px 16px", borderRadius: 10, border: `1px solid ${t.border}`,
            background: t.surface, color: t.textMuted, fontSize: 14, cursor: "pointer",
            fontFamily: "'Nunito', sans-serif", fontWeight: 600,
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
