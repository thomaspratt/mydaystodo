import { PRIORITY_CONFIG, THEMES } from "./themes";
import { parseDate } from "./utils";
import { Confetti } from "./Toast";

export default function TaskCard({
  task, inMonthView, disableInteraction, theme, allThemes, categories,
  confettiTask, onToggleComplete, onEdit, onDragStart,
}) {
  const t = (allThemes || THEMES)[theme] || THEMES.sunset;
  const catColor = categories.find((c) => c.name === task.category)?.color || t.accent;
  const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.none;

  if (inMonthView) {
    return (
      <div
        draggable={!disableInteraction}
        onDragStart={disableInteraction ? undefined : (e) => onDragStart(e, task)}
        onClick={disableInteraction ? undefined : (e) => { e.stopPropagation(); onEdit(task); }}
        style={{
          fontSize: 10, padding: "2px 5px", borderRadius: 4,
          background: task.isRecurrenceInstance ? `${catColor}18` : `${catColor}33`,
          color: task.completed ? t.textMuted : t.text,
          textDecoration: task.completed ? "line-through" : "none",
          overflow: "hidden", whiteSpace: "nowrap",
          borderLeft: `2px ${task.isRecurrenceInstance ? "dashed" : "solid"} ${catColor}`,
          opacity: task.completed ? 0.5 : (task.isRecurrenceInstance ? 0.6 : 1),
          cursor: disableInteraction ? "pointer" : "grab", minWidth: 0, flexShrink: 0,
          pointerEvents: disableInteraction ? "none" : undefined,
          maskImage: "linear-gradient(to right, black 60%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, black 60%, transparent 100%)",
        }}
      >
        {task.title}
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      style={{
        position: "relative", padding: "7px 10px", borderRadius: 8,
        background: task.completed
          ? `${catColor}0d`
          : (task.isRecurrenceInstance ? `${catColor}10` : `${catColor}1a`),
        borderLeft: `${pri.border + 1.5}px ${task.isRecurrenceInstance ? "dashed" : "solid"} ${catColor}`,
        boxShadow: task.priority === "high" ? `${pri.glow} ${catColor}66` : "none",
        cursor: "grab", display: "flex", alignItems: "flex-start", gap: 8,
        transition: "all 0.2s ease",
        opacity: task.completed ? 0.5 : (task.isRecurrenceInstance ? 0.55 : 1),
        animation: confettiTask === task.id ? "taskComplete 0.4s ease" : "none",
      }}
    >
      <Confetti active={confettiTask === task.id} color={catColor} />
      <button
        onClick={(e) => { e.stopPropagation(); onToggleComplete(task); }}
        style={{
          width: 18, height: 18, borderRadius: 5, flexShrink: 0,
          border: `2px solid ${task.completed ? catColor : `${catColor}88`}`,
          background: task.completed ? catColor : "transparent",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: 1, animation: task.completed ? "checkPop 0.3s ease" : "none",
          transition: "all 0.15s ease",
        }}
      >
        {task.completed && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800, lineHeight: 1 }}>✓</span>}
      </button>
      <div style={{ flex: 1, minWidth: 0 }} onClick={() => onEdit(task)}>
        <div style={{
          fontSize: 13, fontWeight: 600,
          color: task.completed ? t.textMuted : t.text,
          textDecoration: task.completed ? "line-through" : "none",
          lineHeight: 1.4, overflow: "hidden",
          display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
          wordBreak: "break-word",
          maskImage: "linear-gradient(to right, black 80%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, black 80%, transparent 100%)",
        }}>
          {pri.icon && <span style={{ marginRight: 4, fontSize: `${pri.iconSize}em` }}>{pri.icon}</span>}
          {task.parentTitle && <span style={{ color: t.textMuted, fontWeight: 400 }}>{task.parentTitle} › </span>}
          {task.title}
        </div>
        {task.recurrence && (
          <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>
            ↻ {task.recurrence}
            {task.isRecurrenceInstance ? "" : (task.recurrenceEnd
              ? ` · until ${parseDate(task.recurrenceEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
              : " · ongoing")}
          </div>
        )}
      </div>
    </div>
  );
}
