import { useMemo } from "react";

export function Confetti({ active, color }) {
  if (!active) return null;
  const particles = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 80,
      y: -(Math.random() * 60 + 20),
      rot: Math.random() * 720 - 360,
      scale: Math.random() * 0.5 + 0.5,
      delay: Math.random() * 0.15,
      color: [`${color}`, "#fff", `${color}cc`][i % 3],
    })), [active]);

  return (
    <div style={{ position: "absolute", top: "50%", left: "50%", pointerEvents: "none", zIndex: 100 }}>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute", width: 6, height: 6,
            borderRadius: p.id % 2 === 0 ? "50%" : "1px",
            backgroundColor: p.color,
            animation: `confetti-burst 0.6s ${p.delay}s ease-out forwards`,
            "--tx": `${p.x}px`, "--ty": `${p.y}px`, "--rot": `${p.rot}deg`,
            transform: `scale(${p.scale})`, opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

export function Toast({ message, visible }) {
  return (
    <div style={{
      position: "fixed", bottom: 30, left: "50%",
      transform: `translateX(-50%) translateY(${visible ? 0 : 20}px)`,
      opacity: visible ? 1 : 0, transition: "all 0.3s ease",
      padding: "12px 24px", borderRadius: 12, background: "rgba(0,0,0,0.85)",
      color: "#fff", fontSize: 15, fontWeight: 500, pointerEvents: "none",
      zIndex: 1000, backdropFilter: "blur(10px)", letterSpacing: "0.01em",
    }}>
      {message}
    </div>
  );
}
