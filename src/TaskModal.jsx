import { useState } from "react";
import { THEMES, PRIORITY_CONFIG } from "./themes";
import { parseDate, dateKey, generateId } from "./utils";

export default function TaskModal({ task, onSave, onRequestDelete, onClose, categories, theme }) {
  const t = THEMES[theme];
  const [title, setTitle] = useState(task?.title || "");
  const [category, setCategory] = useState(task?.category || (categories[0]?.name || ""));
  const [priority, setPriority] = useState(task?.priority || "none");
  const [recurrence, setRecurrence] = useState(task?.recurrence || "none");
  const [recurrenceMode, setRecurrenceMode] = useState(task?.recurrenceEnd ? "limited" : "forever");
  const [recurrenceCount, setRecurrenceCount] = useState(String(task?.recurrenceCount || ""));
  const [subtaskMode, setSubtaskMode] = useState(false);
  const [subtasks, setSubtasks] = useState(task?.subtasks || []);
  const [newSubtask, setNewSubtask] = useState("");
  const [newSubDate, setNewSubDate] = useState(task?.date || dateKey(new Date()));

  const isEdit = !!task?.id && !task?.isNew;

  function handleSave() {
    if (!title.trim()) return;
    let recurrenceEnd = null;
    const rec = recurrence === "none" ? null : recurrence;
    if (rec && recurrenceMode === "limited") {
      const origin = parseDate(task?.date || dateKey(new Date()));
      const endDate = new Date(origin);
      // recurrenceCount = total occurrences including the origin, so subtract 1
      const count = Math.max(1, Math.min(365, parseInt(recurrenceCount) || 1));
      const extra = count - 1;
      switch (rec) {
        case "daily": endDate.setDate(endDate.getDate() + extra); break;
        case "weekly": endDate.setDate(endDate.getDate() + extra * 7); break;
        case "biweekly": endDate.setDate(endDate.getDate() + extra * 14); break;
        case "monthly": endDate.setMonth(endDate.getMonth() + extra); break;
        case "yearly": endDate.setFullYear(endDate.getFullYear() + extra); break;
      }
      recurrenceEnd = dateKey(endDate);
    }
    onSave({
      ...task,
      title: title.trim(), category, priority,
      recurrence: rec, recurrenceEnd,
      recurrenceCount: recurrenceMode === "limited" ? (Math.max(1, Math.min(365, parseInt(recurrenceCount) || 1))) : null,
      subtasks,
    });
  }

  function addSubtask() {
    if (!newSubtask.trim()) return;
    setSubtasks([...subtasks, { id: generateId(), title: newSubtask.trim(), date: newSubDate, completed: false }]);
    setNewSubtask("");
  }

  const labelStyle = {
    color: t.textMuted, fontSize: 12, fontWeight: 600, display: "block",
    marginBottom: 6, fontFamily: "'Nunito', sans-serif",
    textTransform: "uppercase", letterSpacing: "0.05em",
  };
  const inputStyle = {
    width: "100%", padding: "8px 12px", background: t.bg,
    border: `1px solid ${t.border}`, borderRadius: 8, color: t.text,
    fontSize: 14, fontFamily: "'Nunito', sans-serif",
  };
  const pill = (active) => ({
    padding: "6px 14px", borderRadius: 20, cursor: "pointer",
    fontFamily: "'Nunito', sans-serif", transition: "all 0.15s ease",
    border: active ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
    background: active ? `${t.accent}22` : t.bg,
    color: active ? t.accent : t.textMuted,
    fontSize: 13, fontWeight: active ? 700 : 500,
  });

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
        <h3 style={{ color: t.text, margin: "0 0 20px", fontFamily: "'Nunito', sans-serif", fontSize: 20, fontWeight: 700 }}>
          {isEdit ? "Edit Task" : "New Task"}
        </h3>

        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?" onKeyDown={(e) => e.key === "Enter" && handleSave()}
          style={{ ...inputStyle, padding: "12px 16px", fontSize: 16, outline: "none", boxSizing: "border-box", marginBottom: 16 }}
        />

        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={labelStyle}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
              {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={labelStyle}>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} style={inputStyle}>
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Recurrence */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Repeat</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["none", "daily", "weekly", "biweekly", "monthly", "yearly"].map((r) => (
              <button key={r} onClick={() => setRecurrence(r)} style={pill(recurrence === r)}>
                {r === "none" ? "Once" : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
          {recurrence !== "none" && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setRecurrenceMode("forever")}
                style={{ ...pill(recurrenceMode === "forever"), padding: "5px 12px", fontSize: 12 }}>Forever</button>
              <button onClick={() => setRecurrenceMode("limited")}
                style={{ ...pill(recurrenceMode === "limited"), padding: "5px 12px", fontSize: 12 }}>For…</button>
              {recurrenceMode === "limited" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="text" inputMode="numeric" value={recurrenceCount}
                    onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setRecurrenceCount(v); }}
                    placeholder="#"
                    style={{
                      width: 54, padding: "5px 8px", textAlign: "center",
                      background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8,
                      color: t.text, fontSize: 13, fontFamily: "'Nunito', sans-serif", outline: "none",
                    }}
                  />
                  <span style={{ color: t.textMuted, fontSize: 12 }}>
                    {{ daily: "days", weekly: "weeks", biweekly: "fortnights", monthly: "months", yearly: "years" }[recurrence]}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Subtasks */}
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setSubtaskMode(!subtaskMode)} style={{
            background: "none", border: "none", color: t.accent, cursor: "pointer",
            fontSize: 13, fontFamily: "'Nunito', sans-serif", fontWeight: 600, padding: 0,
          }}>{subtaskMode ? "▾ Hide subtasks" : "▸ Break into subtasks"}</button>
          {subtaskMode && (
            <div style={{ marginTop: 10, padding: 12, background: t.bg, borderRadius: 10, border: `1px solid ${t.border}` }}>
              {subtasks.map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ color: t.text, fontSize: 14, flex: 1, fontFamily: "'Nunito', sans-serif" }}>{s.title}</span>
                  <span style={{ color: t.textMuted, fontSize: 12 }}>{s.date}</span>
                  <button onClick={() => setSubtasks(subtasks.filter((x) => x.id !== s.id))}
                    style={{ background: "none", border: "none", color: t.textMuted, cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} placeholder="Subtask name"
                  onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                  style={{ ...inputStyle, flex: 1, padding: "8px 12px", fontSize: 13, outline: "none", background: t.surface, width: "auto" }}
                />
                <input type="date" value={newSubDate} onChange={(e) => setNewSubDate(e.target.value)}
                  style={{ ...inputStyle, padding: "8px 10px", fontSize: 13, background: t.surface, width: "auto" }}
                />
                <button onClick={addSubtask} style={{
                  padding: "8px 14px", background: t.accent, border: "none", borderRadius: 8,
                  color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 700, fontFamily: "'Nunito', sans-serif",
                }}>+</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          {isEdit && (
            <button onClick={() => onRequestDelete(task)} style={{
              padding: "10px 18px", background: "#ff4d4f22", border: "1px solid #ff4d4f44",
              borderRadius: 10, color: "#ff6b6b", fontSize: 14, cursor: "pointer",
              fontFamily: "'Nunito', sans-serif", fontWeight: 600, marginRight: "auto",
            }}>Delete</button>
          )}
          <button onClick={onClose} style={{
            padding: "10px 20px", background: t.bg, border: `1px solid ${t.border}`,
            borderRadius: 10, color: t.textMuted, fontSize: 14, cursor: "pointer",
            fontFamily: "'Nunito', sans-serif", fontWeight: 600,
          }}>Cancel</button>
          <button onClick={handleSave} style={{
            padding: "10px 24px", background: t.accent, border: "none", borderRadius: 10,
            color: "#fff", fontSize: 14, cursor: "pointer", fontFamily: "'Nunito', sans-serif",
            fontWeight: 700, boxShadow: `0 4px 15px ${t.accent}44`,
          }}>{isEdit ? "Save" : "Add Task"}</button>
        </div>
      </div>
    </div>
  );
}
