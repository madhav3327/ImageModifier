// components/StartFX.jsx
import React, { useEffect } from "react";

export default function StartFX({ onDone }) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 1200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[999] overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[conic-gradient(at_50%_50%,#00ffff_0%,#ff00ff_25%,#00ff88_50%,#ffae00_75%,#00ffff_100%)] opacity-80 animate-[aurora_1.2s_ease-in-out]" />
      <style>{`
        @keyframes aurora {
          0% { transform: scale(0.4) rotate(0deg); filter: blur(60px); opacity:0; }
          50% { transform: scale(1.2) rotate(180deg); filter: blur(90px); opacity:0.8; }
          100% { transform: scale(2.5) rotate(360deg); filter: blur(120px); opacity:0; }
        }
      `}</style>
    </div>
  );
}