import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { THEMES, PRIORITY_CONFIG, ENCOURAGEMENTS, DEFAULT_CATEGORIES, DAY_NAMES, MONTH_NAMES, SOUNDS, generateTheme, hslToHex as hslToHexUtil } from "./themes";
import { dateKey, isToday, daysBetween, addDays, parseDate, getWeekDates, getMonthDates, generateId, getRecurrenceInstances, playSound } from "./utils";
import { loadState, saveState } from "./storage";
import { supabase } from "./supabase";
import { useCloudSync } from "./useCloudSync";
import { Toast } from "./Toast";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";
import SettingsModal from "./SettingsModal";
import DeleteDialog from "./DeleteDialog";

function blendHex(a, b, f) {
  const p = (h, o) => parseInt(h.slice(o, o + 2), 16);
  const m = (x, y) => Math.round(x + (y - x) * f).toString(16).padStart(2, "0");
  return `#${m(p(a,1),p(b,1))}${m(p(a,3),p(b,3))}${m(p(a,5),p(b,5))}`;
}

function MonthDayCell({ date, dk, dayTasks, today, isSelected, isCurrentMonth, t, dragOverDate, handleDragOver, setDragOverDate, handleDrop, openNewTask, onDayClick, isMobile, cardProps }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`day-card${dragOverDate === dk ? " drop-target" : ""}`}
      onDragOver={(e) => handleDragOver(e, date)}
      onDragLeave={() => setDragOverDate(null)}
      onDrop={(e) => handleDrop(e, date)}
      onClick={() => onDayClick(date)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: today ? t.today : isSelected ? blendHex(t.calBg, t.today, 0.5) : t.calBg, borderRadius: 8, padding: 6,
        border: today ? `2px solid ${t.accent}44` : isSelected ? `1px solid ${t.accent}30` : `1px solid ${t.border}`,
        opacity: isCurrentMonth ? 1 : 0.35, cursor: "pointer",
        minWidth: 0, minHeight: 0, overflow: "hidden", position: "relative",
        display: "flex", flexDirection: "column",
      }}>
      <div style={{ fontSize: 13, fontWeight: today ? 800 : isSelected ? 700 : 600, color: today ? t.accent : isSelected ? `${t.accent}bb` : t.text, marginBottom: 4 }}>{date.getDate()}</div>
      {hovered && (
        <button className="month-add-btn" onClick={(e) => { e.stopPropagation(); openNewTask(date); }} style={{
          position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 6,
          background: `${t.accent}22`, border: `1px solid ${t.accent}33`, color: t.accent,
          fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          lineHeight: 1, fontWeight: 300, padding: 0,
        }}>+</button>
      )}
      <div className="month-day-tasks" style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1, minHeight: 0, overflowY: "auto" }}>
        {dayTasks.map((task) => <TaskCard key={task.id} task={task} inMonthView={true} disableInteraction={isMobile} {...cardProps} />)}
      </div>
    </div>
  );
}

function MonthGrid({ monthDates, currentDate, t, getTasksForDate, isToday: isTodayFn, selectedDateKey, dragOverDate, handleDragOver, setDragOverDate, handleDrop, openNewTask, onDayClick, isMobile, cardProps }) {
  const numWeeks = Math.ceil(monthDates.length / 7);
  return (
    <div style={{ padding: "0 24px 24px", maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", height: "calc(100vh - 240px)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {DAY_NAMES.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, color: t.textMuted, fontWeight: 600, padding: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{d}</div>
        ))}
      </div>
      <div className="month-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridTemplateRows: `repeat(${numWeeks}, minmax(0, 1fr))`, gap: 2, flex: 1, minHeight: 0, overflow: "hidden" }}>
        {monthDates.map((date) => {
          const dk = dateKey(date);
          const dayTasks = getTasksForDate(date);
          const today = isTodayFn(date);
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const isSelected = !today && dk === selectedDateKey;
          return (
            <MonthDayCell key={dk} date={date} dk={dk} dayTasks={dayTasks} today={today}
              isSelected={isSelected} isCurrentMonth={isCurrentMonth} t={t} dragOverDate={dragOverDate}
              handleDragOver={handleDragOver} setDragOverDate={setDragOverDate}
              handleDrop={handleDrop} openNewTask={openNewTask} onDayClick={onDayClick} isMobile={isMobile} cardProps={cardProps} />
          );
        })}
      </div>
    </div>
  );
}

export default function App({ session }) {
  const [theme, setTheme] = useState(() => loadState("theme", "sunset"));
  const [sound, setSound] = useState(() => { const s = loadState("sound", "chime"); return SOUNDS[s] ? s : "chime"; });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState(() => loadState("view", "week"));
  const [tasks, setTasks] = useState(() => loadState("tasks", []));
  const [categories, setCategories] = useState(() => loadState("categories", DEFAULT_CATEGORIES));
  const [customThemes, setCustomThemes] = useState(() => loadState("customThemes", {}));
  const [categoryColors, setCategoryColors] = useState(() => {
    const stored = loadState("categoryColors", {});
    // Version 2: wipe stale palettes from before bespoke theme colors
    if (stored._v !== 2) return { _v: 2 };
    return stored;
  });
  const [modalTask, setModalTask] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState({ message: "", visible: false });
  const [confettiTask, setConfettiTask] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const [dragTask, setDragTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);
  const lastCategoryRef = useRef(null);
  const [lastNavDate, setLastNavDate] = useState(null);
  const [dayDetailDate, setDayDetailDate] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 768px)").matches);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const allThemes = useMemo(() => ({ ...THEMES, ...customThemes }), [customThemes]);
  const t = allThemes[theme] || allThemes.sunset;

  // Get the palette for a theme (stored overrides > theme defaults)
  const getThemePalette = useCallback((themeKey) => {
    if (categoryColors[themeKey]) return categoryColors[themeKey];
    const th = ({ ...THEMES, ...customThemes })[themeKey];
    return th ? th.categories : THEMES.sunset.categories;
  }, [categoryColors, customThemes]);

  // Generate a random color that's reasonably vibrant
  const randomCatColor = useCallback(() => {
    const h = Math.floor(Math.random() * 360);
    return hslToHexUtil(h, 55 + Math.random() * 20, 55 + Math.random() * 15);
  }, []);

  // Switch theme: save current colors, apply new theme's colors
  // paletteOverride lets callers pass a palette for themes not yet in state
  const setThemeWithColors = useCallback((newTheme, paletteOverride) => {
    // Save current category colors under the current theme
    const currentColors = categories.map((c) => c.color);
    setCategoryColors((prev) => ({ ...prev, _v: 2, [theme]: currentColors }));

    // Get the new theme's palette
    const newPalette = paletteOverride || getThemePalette(newTheme);

    // Apply new colors to categories
    setCategories((prev) => prev.map((cat, i) => ({
      ...cat,
      color: i < newPalette.length ? newPalette[i] : (categoryColors[newTheme]?.[i] || randomCatColor()),
    })));

    setTheme(newTheme);
  }, [theme, categories, categoryColors, getThemePalette, randomCatColor, setCategoryColors, setCategories, setTheme]);

  // Save category colors back to current theme when user manually changes them
  const prevCatsRef = useRef(null);
  const prevThemeRef = useRef(theme);
  useEffect(() => {
    const colors = categories.map((c) => c.color);
    const themeChanged = prevThemeRef.current !== theme;
    prevThemeRef.current = theme;
    // Only save if categories changed WITHOUT a theme switch (i.e. manual edit)
    if (!themeChanged && prevCatsRef.current && JSON.stringify(prevCatsRef.current) !== JSON.stringify(colors)) {
      setCategoryColors((prev) => ({ ...prev, _v: 2, [theme]: colors }));
    }
    prevCatsRef.current = colors;
  }, [categories, theme]);

  // On mount (or after version wipe), apply current theme's palette to categories
  const initialColorApplied = useRef(false);
  useEffect(() => {
    if (initialColorApplied.current) return;
    initialColorApplied.current = true;
    // If no stored overrides for current theme, apply theme defaults
    if (!categoryColors[theme]) {
      const palette = t.categories;
      setCategories((prev) => prev.map((cat, i) => ({
        ...cat,
        color: i < palette.length ? palette[i] : cat.color,
      })));
    }
  }, []);

  // Cloud sync
  useCloudSync(session.user.id, { theme, sound, view, tasks, categories, customThemes, categoryColors }, { setTheme, setSound, setView, setTasks, setCategories, setCustomThemes, setCategoryColors });

  // Persist
  useEffect(() => { saveState("theme", theme); }, [theme]);
  useEffect(() => { saveState("sound", sound); }, [sound]);
  useEffect(() => { saveState("view", view); }, [view]);
  useEffect(() => { saveState("tasks", tasks); }, [tasks]);
  useEffect(() => { saveState("categories", categories); }, [categories]);
  useEffect(() => { saveState("customThemes", customThemes); }, [customThemes]);
  useEffect(() => { saveState("categoryColors", categoryColors); }, [categoryColors]);

  // Auto-clean blank tasks (but keep markers)
  useEffect(() => {
    const timer = setTimeout(() => {
      setTasks((prev) => prev.filter((tt) => tt.completionMarker || tt.skipMarker || (tt.title && tt.title.trim())));
    }, 3000);
    return () => clearTimeout(timer);
  }, [tasks]);

  function showToast(msg) {
    setToast({ message: msg, visible: true });
    setTimeout(() => setToast((p) => ({ ...p, visible: false })), 4000);
  }

  // ── Navigation ──
  function navigateWeek(dir) {
    const d = new Date(currentDate);
    if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  }

  // ── Arrow key navigation ──
  useEffect(() => {
    function handleKeyDown(e) {
      if (modalTask || showSettings) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "Escape") {
        e.preventDefault();
        if (dayDetailDate) { setDayDetailDate(null); }
        else { setCurrentDate(new Date()); setLastNavDate(null); }
        return;
      }

      if (dayDetailDate) {
        if ((e.key === "+" || e.key === "=") && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault(); openNewTask(dayDetailDate);
        }
        return;
      }

      if (e.key === "Tab") { e.preventDefault(); setView((v) => v === "week" ? "month" : "week"); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); navigateWeek(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); navigateWeek(1); }
      else if ((e.key === "+" || e.key === "=") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const wd = getWeekDates(currentDate);
        const md = getMonthDates(currentDate);
        const isInView = (d) => {
          const dk = dateKey(d);
          if (view === "week") return wd.some((w) => dateKey(w) === dk);
          return md.some((m) => dateKey(m) === dk && m.getMonth() === currentDate.getMonth());
        };
        let taskDate = null;
        if (lastNavDate && isInView(lastNavDate)) taskDate = lastNavDate;
        else if (isInView(today)) taskDate = today;
        else taskDate = view === "week" ? wd[0] : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        openNewTask(taskDate);
      }
      else if (e.key.length === 1 && /[a-zA-Z0-9\/]/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  // ── Get tasks for a date ──
  function getTasksForDate(d) {
    const dk = dateKey(d);
    const directTasks = tasks.filter((tt) => tt.date === dk && !tt.completionMarker && !tt.skipMarker);
    const recurringTasks = tasks.filter((tt) => tt.recurrence);
    const instances = [];
    recurringTasks.forEach((tt) => { instances.push(...getRecurrenceInstances(tt, dk)); });

    // Filter skipped instances
    const filteredInstances = instances.filter((inst) => {
      const skipId = `${inst.originalId}_skip_${dk}`;
      return !tasks.find((tt) => tt.id === skipId);
    });

    // Check completed recurrence instances
    const allForDate = [...directTasks, ...filteredInstances].map((task) => {
      if (task.isRecurrenceInstance) {
        const completedKey = `${task.originalId}_done_${task.date}`;
        return { ...task, completed: !!tasks.find((tt) => tt.id === completedKey) };
      }
      return task;
    });

    // Group subtasks under their parent, remove them from top level
    const subtasksByParent = {};
    const topLevel = [];
    for (const task of allForDate) {
      if (task.parentId) {
        (subtasksByParent[task.parentId] ||= []).push(task);
      } else {
        topLevel.push(task);
      }
    }
    return topLevel.map((task) =>
      subtasksByParent[task.id] ? { ...task, childSubtasks: subtasksByParent[task.id] } : task
    );
  }

  // ── Toggle complete ──
  function toggleComplete(task) {
    if (task.isRecurrenceInstance) {
      const key = `${task.originalId}_done_${task.date}`;
      const exists = tasks.find((tt) => tt.id === key);
      if (exists) setTasks(tasks.filter((tt) => tt.id !== key));
      else { setTasks([...tasks, { id: key, completionMarker: true }]); triggerCompletion(task); }
    } else {
      setTasks(tasks.map((tt) => (tt.id === task.id ? { ...tt, completed: !tt.completed } : tt)));
      if (!task.completed) triggerCompletion(task);
    }
  }

  function triggerCompletion(task) {
    playSound(sound);
    setConfettiTask(task.id);
    setTimeout(() => setConfettiTask(null), 700);
    showToast(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
  }

  // ── Task CRUD ──
  function openNewTask(date) {
    const defaultCat = lastCategoryRef.current || categories[0]?.name || "";
    setLastNavDate(date);
    setModalTask({ isNew: true, date: dateKey(date), title: "", category: defaultCat, priority: "none", recurrence: null, subtasks: [] });
  }

  function openEditTask(task) {
    const taskDate = task.isRecurrenceInstance ? task.date : task.date;
    setLastNavDate(parseDate(taskDate));
    let editTask;
    if (task.isRecurrenceInstance) {
      const original = tasks.find((tt) => tt.id === task.originalId);
      if (!original) return;
      editTask = { ...original, _clickedInstanceDate: task.date };
    } else if (task.parentId) {
      // Clicked a subtask — open the parent instead
      const parent = tasks.find((tt) => tt.id === task.parentId);
      if (!parent) return;
      editTask = { ...parent };
    } else {
      editTask = { ...task };
    }
    // Attach existing child subtasks so the modal can display them
    const childSubs = tasks.filter((tt) => tt.parentId === editTask.id);
    editTask.subtasks = childSubs.map((s) => ({ id: s.id, title: s.title, date: s.date, completed: s.completed }));
    setModalTask(editTask);
  }

  function saveTask(taskData) {
    if (taskData.category) lastCategoryRef.current = taskData.category;
    if (taskData.isNew) {
      const newTask = { ...taskData, id: generateId(), completed: false, isNew: undefined, subtasks: undefined };
      const newTasks = [newTask];
      if (taskData.subtasks?.length > 0) {
        taskData.subtasks.forEach((sub) => {
          newTasks.push({
            id: generateId(), title: sub.title, date: taskData.date,
            category: taskData.category, priority: "low", completed: false,
            parentId: newTask.id, parentTitle: taskData.title,
          });
        });
      }
      setTasks([...tasks, ...newTasks]);
    } else {
      // Update parent task and sync subtask records
      const savedSubs = taskData.subtasks || [];
      const existingSubIds = tasks.filter((tt) => tt.parentId === taskData.id).map((tt) => tt.id);
      const keptSubIds = new Set(savedSubs.filter((s) => existingSubIds.includes(s.id)).map((s) => s.id));
      // Remove deleted subtasks, update parent
      let updated = tasks
        .filter((tt) => !(tt.parentId === taskData.id && !keptSubIds.has(tt.id)))
        .map((tt) => {
          if (tt.id === taskData.id) return { ...taskData, subtasks: undefined, _clickedInstanceDate: undefined };
          if (keptSubIds.has(tt.id)) {
            const sub = savedSubs.find((s) => s.id === tt.id);
            return { ...tt, title: sub.title, date: taskData.date, parentTitle: taskData.title };
          }
          return tt;
        });
      // Add new subtasks
      savedSubs.filter((s) => !existingSubIds.includes(s.id)).forEach((sub) => {
        updated.push({
          id: generateId(), title: sub.title, date: taskData.date,
          category: taskData.category, priority: "low", completed: false,
          parentId: taskData.id, parentTitle: taskData.title,
        });
      });
      setTasks(updated);
    }
    setModalTask(null);
  }

  // ── Delete handlers ──
  function requestDelete(task) { setModalTask(null); setDeleteDialog(task); }

  function deleteThisInstance(task) {
    const origId = task.originalId || task.id;
    const skipDate = task._clickedInstanceDate || task.date;
    const skipId = `${origId}_skip_${skipDate}`;
    if (!tasks.find((tt) => tt.id === skipId)) {
      setTasks([...tasks, { id: skipId, skipMarker: true, originalId: origId, date: skipDate }]);
    }
    setDeleteDialog(null);
  }

  function deleteAllFuture(task) {
    const origId = task.originalId || task.id;
    // _clickedInstanceDate is set when editing a recurrence instance (openEditTask
    // resolves to the original task but preserves the clicked date). Use it to
    // detect "delete this and future" from a future occurrence.
    const clickedDate = task._clickedInstanceDate || task.date;
    const isFromFutureInstance = task.isRecurrenceInstance ||
      (task.recurrence && task._clickedInstanceDate && task._clickedInstanceDate !== task.date);

    if (isFromFutureInstance) {
      const cutDate = clickedDate;
      const newEnd = addDays(cutDate, -1);
      setTasks(tasks.map((tt) => {
        if (tt.id === origId) return { ...tt, recurrenceEnd: newEnd };
        return tt;
      }).filter((tt) => {
        if (tt.skipMarker && tt.originalId === origId && tt.date >= cutDate) return false;
        if (tt.completionMarker && tt.id.startsWith(origId + "_done_")) {
          const markerDate = tt.id.slice((origId + "_done_").length);
          if (markerDate >= cutDate) return false;
        }
        return true;
      }));
    } else {
      // Deleting from the origin task itself — remove the whole series
      setTasks(tasks.filter((tt) =>
        tt.id !== origId && tt.parentId !== origId &&
        !(tt.completionMarker && tt.id.startsWith(origId + "_")) &&
        !(tt.skipMarker && tt.originalId === origId)
      ));
    }
    setDeleteDialog(null);
  }

  // ── Drag and Drop ──
  function handleDragStart(e, task) {
    setDragTask(task);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
  }

  function handleDragOver(e, date) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const dk = dateKey(date);
    if (dragOverDate !== dk) setDragOverDate(dk);
  }

  function handleDrop(e, targetDate) {
    e.preventDefault();
    setDragOverDate(null);
    if (!dragTask) return;
    const targetDk = dateKey(targetDate);
    if (targetDk === dragTask.date) { setDragTask(null); return; }

    const diff = daysBetween(parseDate(dragTask.date), targetDate);

    if (dragTask.isRecurrenceInstance) {
      const original = tasks.find((tt) => tt.id === dragTask.originalId);
      if (original) {
        setTasks(tasks.map((tt) => {
          if (tt.id === original.id) {
            return { ...tt, date: addDays(tt.date, diff), recurrenceEnd: tt.recurrenceEnd ? addDays(tt.recurrenceEnd, diff) : null };
          }
          return tt;
        }).filter((tt) => {
          // Clear stale completion/skip markers
          if ((tt.completionMarker || tt.skipMarker) && (tt.id || "").startsWith(original.id + "_")) return false;
          return true;
        }));
        showToast("Recurring series shifted");
      }
    } else {
      setTasks(tasks.map((tt) => {
        if (tt.id === dragTask.id) {
          return { ...tt, date: addDays(tt.date, diff), recurrenceEnd: tt.recurrenceEnd ? addDays(tt.recurrenceEnd, diff) : null };
        }
        if (tt.parentId === dragTask.id) return { ...tt, date: addDays(tt.date, diff) };
        return tt;
      }));
    }
    setDragTask(null);
  }

  // ── Search logic ──
  const MONTH_FULL = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  const MONTH_ABBR = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const DAY_FULL = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const DAY_ABBR = ["sun","mon","tue","wed","thu","fri","sat"];
  const [searchHL, setSearchHL] = useState(-1);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];
    const qLower = q.toLowerCase();

    // 0. "today" / "td" match
    if (qLower === "today" || qLower === "toda" || qLower === "td") {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return [{ type: "date", label: `Go to Today`, date: now }];
    }

    // 1. Month match
    let monthIdx = MONTH_FULL.indexOf(qLower);
    if (monthIdx === -1) monthIdx = MONTH_ABBR.indexOf(qLower);
    if (monthIdx !== -1) {
      const now = new Date();
      let year = now.getFullYear();
      if (monthIdx <= now.getMonth()) year++;
      return [{ type: "month", label: `Go to ${MONTH_NAMES[monthIdx]} ${year}`, monthIdx, year }];
    }

    // 2. Date match: M/D, M/D/YYYY, Mon D, Month D
    const mdSlash = q.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
    if (mdSlash) {
      const m = parseInt(mdSlash[1], 10) - 1;
      const d = parseInt(mdSlash[2], 10);
      const y = mdSlash[3] ? parseInt(mdSlash[3], 10) : new Date().getFullYear();
      if (m >= 0 && m <= 11 && d >= 1 && d <= 31) {
        const date = new Date(y, m, d);
        if (date.getMonth() === m) {
          const label = `Go to ${MONTH_NAMES[m]} ${d}, ${y}`;
          return [{ type: "date", label, date }];
        }
      }
    }
    const mdText = q.match(/^([a-zA-Z]+)\s+(\d{1,2})$/);
    if (mdText) {
      const mName = mdText[1].toLowerCase();
      let mIdx = MONTH_FULL.indexOf(mName);
      if (mIdx === -1) mIdx = MONTH_ABBR.indexOf(mName);
      if (mIdx !== -1) {
        const d = parseInt(mdText[2], 10);
        const y = new Date().getFullYear();
        const date = new Date(y, mIdx, d);
        if (date.getMonth() === mIdx && d >= 1 && d <= 31) {
          const label = `Go to ${MONTH_NAMES[mIdx]} ${d}, ${y}`;
          return [{ type: "date", label, date }];
        }
      }
    }

    // 2b. Day-of-week match: "tue", "tuesday", "next tue", "next tuesday"
    const dayMatch = qLower.match(/^(next\s+)?([a-z]+)$/);
    if (dayMatch) {
      const prefix = dayMatch[1]; // "next " or undefined
      const dayName = dayMatch[2];
      let dayIdx = DAY_FULL.indexOf(dayName);
      if (dayIdx === -1) dayIdx = DAY_ABBR.indexOf(dayName);
      if (dayIdx !== -1) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Find the nearest future occurrence of this weekday
        let diff = (dayIdx - today.getDay() + 7) % 7;
        if (diff === 0) diff = 7; // always go to next occurrence, not today
        if (prefix) diff += 7; // "next" skips one more week
        const results = [];
        for (let i = 0; i < 4; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() + diff + i * 7);
          const dayStr = DAY_FULL[dayIdx].charAt(0).toUpperCase() + DAY_FULL[dayIdx].slice(1);
          results.push({
            type: "date",
            label: `Go to ${dayStr}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`,
            date: d,
          });
        }
        return results;
      }
    }

    // 3. Task name search
    const today = new Date();
    const todayTime = today.getTime();
    const realTasks = tasks.filter(tt => tt.title && tt.date && tt.title.trim() && !tt.completionMarker && !tt.skipMarker);

    // Collect non-recurring tasks
    const candidates = realTasks.filter(tt => !tt.recurrence && tt.title.toLowerCase().includes(qLower)).map(tt => ({
      task: tt,
      date: parseDate(tt.date),
      completed: !!tt.completed,
    }));

    // Expand recurring tasks ±6 months
    const windowStart = new Date(today);
    windowStart.setMonth(windowStart.getMonth() - 6);
    const windowEnd = new Date(today);
    windowEnd.setMonth(windowEnd.getMonth() + 6);
    const recurringTasks = realTasks.filter(tt => tt.recurrence && tt.title.toLowerCase().includes(qLower));
    recurringTasks.forEach(tt => {
      const d = new Date(windowStart);
      while (d <= windowEnd) {
        const dk = dateKey(d);
        const insts = getRecurrenceInstances(tt, dk);
        insts.forEach(inst => {
          const skipId = `${inst.originalId}_skip_${dk}`;
          if (tasks.find(s => s.id === skipId)) return;
          const completedKey = `${inst.originalId}_done_${dk}`;
          const isCompleted = !!tasks.find(s => s.id === completedKey);
          candidates.push({ task: inst, date: parseDate(dk), completed: isCompleted });
        });
        d.setDate(d.getDate() + 1);
      }
      // Also include the origin task itself
      if (!tt.completed) {
        const originDate = parseDate(tt.date);
        if (originDate >= windowStart && originDate <= windowEnd) {
          candidates.push({ task: tt, date: originDate, completed: false });
        }
      }
    });

    // Score & sort
    candidates.forEach(c => {
      const diff = Math.abs(daysBetween(today, c.date));
      const isFuture = c.date.getTime() >= todayTime;
      c.score = isFuture ? diff : diff * 4;
    });
    candidates.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.score - b.score;
    });

    // Deduplicate by task title + date
    const seen = new Set();
    const unique = [];
    for (const c of candidates) {
      const key = `${c.task.title}_${dateKey(c.date)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(c);
      if (unique.length >= 20) break;
    }

    return unique.map(c => ({
      type: "task",
      label: c.task.title,
      date: c.date,
      dateStr: dateKey(c.date),
      category: c.task.category,
      completed: c.completed,
    }));
  }, [searchQuery, tasks]);

  function handleSearchSelect(result) {
    if (result.type === "month") {
      setView("month");
      setCurrentDate(new Date(result.year, result.monthIdx, 1));
      setLastNavDate(new Date(result.year, result.monthIdx, 1));
    } else if (result.type === "date") {
      setView("week");
      setCurrentDate(result.date);
      setLastNavDate(result.date);
    } else {
      setView("week");
      setCurrentDate(result.date);
      setLastNavDate(result.date);
    }
    setSearchQuery("");
    setSearchFocused(false);
    if (searchRef.current) searchRef.current.blur();
  }

  // ── Calendar data ──
  const selectedDateKey = lastNavDate && !isToday(lastNavDate) ? dateKey(lastNavDate) : null;
  const weekDates = getWeekDates(currentDate);
  const monthDates = getMonthDates(currentDate);
  const shortMonth = (i) => { const n = MONTH_NAMES[i]; return (n === "June" || n === "July") ? n : n.slice(0, 3); };
  const headerText = view === "week"
    ? (weekDates[0].getMonth() === weekDates[6].getMonth()
      ? `${shortMonth(weekDates[0].getMonth())} ${weekDates[0].getDate()} - ${weekDates[6].getDate()}`
      : `${shortMonth(weekDates[0].getMonth())} ${weekDates[0].getDate()} - ${shortMonth(weekDates[6].getMonth())} ${weekDates[6].getDate()}`)
    : `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  // ── Shared task card props ──
  const cardProps = {
    theme, allThemes, categories, confettiTask,
    onToggleComplete: toggleComplete,
    onEdit: openEditTask,
    onDragStart: handleDragStart,
  };

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'Nunito', sans-serif", transition: "background 0.3s ease" }}>
      <style>{`
        html, body { background: ${t.bg}; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 3px; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes confetti-burst { 0% { transform: translate(0,0) rotate(0deg); opacity:1; } 100% { transform: translate(var(--tx),var(--ty)) rotate(var(--rot)); opacity:0; } }
        @keyframes checkPop { 0% { transform: scale(1); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }
        @keyframes taskComplete { 0% { transform: scale(1); } 30% { transform: scale(1.02); } 100% { transform: scale(1); opacity: 0.7; } }
        .drop-target { outline: 2px dashed ${t.accent}88 !important; outline-offset: -2px; background: ${t.accent}0a !important; }
        .month-day-tasks::-webkit-scrollbar { display: none; }
        .month-day-tasks { scrollbar-width: none; }
        @media (max-width: 768px) {
          .week-grid { grid-template-columns: 1fr !important; gap: 6px !important; }
          .week-grid .day-card { min-height: auto !important; padding: 10px !important; }
          .month-grid { gap: 1px !important; }
          .month-grid .day-card { min-height: 60px !important; padding: 4px !important; }
          .nav-row { flex-wrap: wrap !important; gap: 8px !important; }
          .nav-left { flex-wrap: wrap !important; gap: 8px !important; }
          .nav-left .search-wrap { width: 100% !important; order: 10; }
          .nav-left .search-wrap input { width: 100% !important; }
          .header-text { min-width: auto !important; font-size: 14px !important; }
          .legend-row { display: none !important; }
          .month-add-btn { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: "20px 24px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1100, margin: "0 auto" }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: t.text, letterSpacing: "-0.02em", marginBottom: 2 }}>My Days</h1>
          <p style={{ color: t.textMuted, fontSize: 13, fontWeight: 500 }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setShowSettings(true)} style={{
            width: 40, height: 40, borderRadius: 12, background: t.surface,
            border: `1px solid ${t.border}`, color: t.textMuted, fontSize: 20,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
        </div>
      </div>

      {/* Nav */}
      <div className="nav-row" style={{ padding: "0 24px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1100, margin: "0 auto" }}>
        <div className="nav-left" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigateWeek(-1)} style={{ width: 36, height: 36, borderRadius: 10, background: t.surface, border: `1px solid ${t.border}`, color: t.textMuted, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          <span className="header-text" style={{ fontSize: 16, fontWeight: 700, minWidth: 220, textAlign: "center", color: t.text }}>{headerText}</span>
          <button onClick={() => navigateWeek(1)} style={{ width: 36, height: 36, borderRadius: 10, background: t.surface, border: `1px solid ${t.border}`, color: t.textMuted, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          <button onClick={() => { setCurrentDate(new Date()); setLastNavDate(null); }} style={{ padding: "6px 14px", borderRadius: 20, background: `${t.accent}22`, border: `1px solid ${t.accent}44`, color: t.accent, fontSize: 12, cursor: "pointer", fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>Today</button>
          {/* Search Bar */}
          <div className="search-wrap" style={{ position: "relative" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <svg style={{ position: "absolute", left: 10, pointerEvents: "none" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.5" cy="10.5" r="7"/><line x1="15.5" y1="15.5" x2="21" y2="21"/></svg>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search dates or tasks..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchHL(-1); }}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => { setSearchFocused(false); setSearchHL(-1); }, 200)}
                onKeyDown={(e) => {
                  const max = Math.min(searchResults.length, 6);
                  if ((e.key === "+" || e.key === "=") && !searchQuery && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault(); searchRef.current?.blur(); setSearchFocused(false);
                    openNewTask(new Date());
                  }
                  else if (e.key === "Escape") { setSearchQuery(""); setSearchFocused(false); setSearchHL(-1); searchRef.current?.blur(); }
                  else if (e.key === "ArrowDown" && max > 0) { e.preventDefault(); setSearchHL((prev) => (prev + 1) % max); }
                  else if (e.key === "ArrowUp" && max > 0) { e.preventDefault(); setSearchHL((prev) => (prev <= 0 ? max - 1 : prev - 1)); }
                  else if (e.key === "Enter" && max > 0) { handleSearchSelect(searchResults[searchHL >= 0 ? searchHL : 0]); setSearchHL(-1); }
                }}
                style={{
                  width: 200, padding: "6px 12px 6px 32px", borderRadius: 10,
                  background: t.surface, border: `1px solid ${t.border}`, color: t.text,
                  fontSize: 13, fontFamily: "'Nunito', sans-serif", fontWeight: 500,
                  outline: "none", transition: "border-color 0.15s ease",
                  ...(searchFocused ? { borderColor: t.accent } : {}),
                }}
              />
            </div>
            {searchFocused && searchQuery.trim() && searchResults.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, marginTop: 6, width: 320,
                background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12,
                boxShadow: `0 8px 24px rgba(0,0,0,0.3)`, zIndex: 200,
                maxHeight: 240, overflowY: "auto",
              }}>
                {searchResults.slice(0, 6).map((result, i) => (
                  <div key={i}
                    onMouseDown={(e) => { e.preventDefault(); handleSearchSelect(result); setSearchHL(-1); }}
                    onMouseEnter={() => setSearchHL(i)}
                    onMouseLeave={() => setSearchHL(-1)}
                    style={{
                      padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                      transition: "background 0.1s ease", fontSize: 13, fontWeight: 500,
                      background: searchHL === i ? `${t.accent}15` : "transparent",
                    }}
                  >
                    {result.type === "task" ? (
                      <>
                        <span style={{
                          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                          background: categories.find(c => c.name === result.category)?.color || t.textMuted,
                        }} />
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: result.completed ? t.textMuted : t.text, textDecoration: result.completed ? "line-through" : "none" }}>
                          {result.label}
                        </span>
                        <span style={{ fontSize: 11, color: t.textMuted, flexShrink: 0 }}>
                          {MONTH_NAMES[result.date.getMonth()].slice(0, 3)} {result.date.getDate()}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: t.accent, fontWeight: 600 }}>{result.label}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, background: t.surface, borderRadius: 10, padding: 3, border: `1px solid ${t.border}` }}>
          {["week", "month"].map((v) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "6px 16px", borderRadius: 8, border: "none",
              background: view === v ? t.accent : "transparent", color: view === v ? "#fff" : t.textMuted,
              fontSize: 13, cursor: "pointer", fontWeight: 600, fontFamily: "'Nunito', sans-serif", transition: "all 0.15s ease",
            }}>{v.charAt(0).toUpperCase() + v.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="legend-row" style={{ padding: "0 24px 12px", maxWidth: 1100, margin: "0 auto", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        {categories.map((c) => (
          <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />
            <span style={{ fontSize: 12, color: t.textMuted, fontWeight: 500 }}>{c.name}</span>
          </div>
        ))}
        <span style={{ color: t.border, margin: "0 4px" }}>|</span>
        {Object.entries(PRIORITY_CONFIG).filter(([k]) => k !== "none").map(([k, v]) => (
          <span key={k} style={{ fontSize: 12, color: t.textMuted }}>{v.icon} {v.label}</span>
        ))}
      </div>

      {/* Week View */}
      {view === "week" ? (
        <div style={{ padding: "0 24px 24px", maxWidth: 1100, margin: "0 auto" }}>
          <div className="week-grid" style={{ display: "grid", gridTemplateColumns: weekDates.map((d) => getTasksForDate(d).length > 0 ? "minmax(0, 1.5fr)" : "minmax(0, 1fr)").join(" "), gap: 8 }}>
            {weekDates.map((date) => {
              const dk = dateKey(date);
              const dayTasks = getTasksForDate(date);
              const today = isToday(date);
              const selected = !today && dk === selectedDateKey;
              return (
                <div key={dk}
                  className={`day-card${dragOverDate === dk ? " drop-target" : ""}`}
                  onDragOver={(e) => handleDragOver(e, date)}
                  onDragLeave={() => setDragOverDate(null)}
                  onDrop={(e) => handleDrop(e, date)}
                  style={{
                    background: today ? t.today : selected ? blendHex(t.calBg, t.today, 0.5) : t.calBg, borderRadius: 14, padding: 12, minHeight: 200,
                    border: today ? `2px solid ${t.accent}44` : selected ? `1px solid ${t.accent}30` : `1px solid ${t.border}`,
                    transition: "all 0.2s ease", display: "flex", flexDirection: "column",
                    minWidth: 0, overflow: "hidden",
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{DAY_NAMES[date.getDay()]}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: today ? t.accent : selected ? `${t.accent}bb` : t.text, lineHeight: 1.1 }}>{date.getDate()}</div>
                    </div>
                    <button onClick={() => openNewTask(date)} style={{
                      width: 26, height: 26, borderRadius: 8, background: `${t.accent}22`, border: `1px solid ${t.accent}33`,
                      color: t.accent, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, fontWeight: 300,
                    }}>+</button>
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                    {dayTasks.map((task) => <TaskCard key={task.id} task={task} inMonthView={false} {...cardProps} />)}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: t.textMuted, fontWeight: 600 }}>{weekDates[6].getFullYear()}</div>
        </div>
      ) : (
        /* Month View */
        <MonthGrid
          monthDates={monthDates} currentDate={currentDate} t={t}
          getTasksForDate={getTasksForDate} isToday={isToday}
          selectedDateKey={selectedDateKey}
          dragOverDate={dragOverDate} handleDragOver={handleDragOver}
          setDragOverDate={setDragOverDate} handleDrop={handleDrop}
          openNewTask={openNewTask} isMobile={isMobile} cardProps={cardProps}
          onDayClick={(date) => { setLastNavDate(date); setDayDetailDate(date); }}
        />
      )}

      {/* FAB */}
      <button onClick={() => openNewTask(new Date())} style={{
        position: "fixed", bottom: 24, right: 24, width: 56, height: 56, borderRadius: 16,
        background: t.accent, border: "none", color: "#fff", fontSize: 28, cursor: "pointer",
        boxShadow: `0 8px 24px ${t.accent}55`, display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, fontWeight: 300, transition: "transform 0.2s ease",
      }}
        onMouseEnter={(e) => e.target.style.transform = "scale(1.1)"}
        onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
      >+</button>

      {/* Day Detail Overlay */}
      {dayDetailDate && (
        <div onClick={() => setDayDetailDate(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center",
          animation: "fadeIn 0.15s ease",
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: "min(420px, 92vw)", maxHeight: "80vh", overflowY: "auto",
            background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16,
            boxShadow: `0 12px 40px rgba(0,0,0,0.4)`, animation: "slideUp 0.2s ease",
          }}>
            <div style={{
              padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
              borderBottom: `1px solid ${t.border}`,
            }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: `${t.accent}bb` }}>
                {DAY_NAMES[dayDetailDate.getDay()]} {dayDetailDate.getDate()} {MONTH_NAMES[dayDetailDate.getMonth()]}
              </span>
              <button onClick={() => openNewTask(dayDetailDate)} style={{
                width: 30, height: 30, borderRadius: 8, background: `${t.accent}22`, border: `1px solid ${t.accent}33`,
                color: t.accent, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1, fontWeight: 300, padding: 0,
              }}>+</button>
            </div>
            <div style={{ padding: "12px 20px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
              {getTasksForDate(dayDetailDate).length === 0 ? (
                <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 14, fontWeight: 500 }}>No tasks yet</div>
              ) : (
                getTasksForDate(dayDetailDate).map((task) => (
                  <TaskCard key={task.id} task={task} inMonthView={false} {...cardProps} />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {modalTask && <TaskModal task={modalTask} onSave={saveTask} onRequestDelete={requestDelete} onClose={() => setModalTask(null)} categories={categories} theme={theme} allThemes={allThemes} />}
      {showSettings && <SettingsModal theme={theme} setTheme={setThemeWithColors} sound={sound} setSound={setSound} categories={categories} setCategories={setCategories} customThemes={customThemes} setCustomThemes={setCustomThemes} allThemes={allThemes} onClose={() => setShowSettings(false)} onSignOut={() => supabase.auth.signOut()} />}
      {deleteDialog && <DeleteDialog task={deleteDialog} onDeleteThis={() => deleteThisInstance(deleteDialog)} onDeleteAll={() => deleteAllFuture(deleteDialog)} onClose={() => setDeleteDialog(null)} theme={theme} allThemes={allThemes} />}
      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
