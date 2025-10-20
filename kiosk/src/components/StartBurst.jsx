// components/StartBurst.jsx
import React, { useEffect, useRef } from "react";

export default function StartBurst() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.animate(
      [
        { opacity: 0, transform: "scale(0.95)" },
        { opacity: 1, transform: "scale(1)" },
        { opacity: 0, transform: "scale(1.04)" },
      ],
      { duration: 600, easing: "cubic-bezier(.22,.61,.36,1)", fill: "forwards" }
    );
  }, []);
  return (
    <div
      ref={ref}
      className="absolute inset-0 z-50 grid place-items-center"
      style={{
        background:
          "radial-gradient(1200px 900px at 50% 60%, rgba(255,255,255,.35), rgba(0,0,0,.55) 45%, rgba(0,0,0,.85) 70%)",
        pointerEvents: "none",
      }}
    >
      <div className="text-center">
        <div className="text-2xl sm:text-3xl font-black tracking-tight">Let’s Begin</div>
        <div className="text-xs sm:text-sm text-slate-300/90">Loading demo…</div>
      </div>
    </div>
  );
}