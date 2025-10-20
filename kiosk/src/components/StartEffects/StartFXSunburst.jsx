export function StartFXSunburst({ onDone }) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 1200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[999] pointer-events-none overflow-hidden bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#ff8a00_0%,#e52e71_40%,#000_100%)] animate-[sunburst_1.2s_ease-in-out]" />
      <style>{`
        @keyframes sunburst {
          0% { transform: scale(0.3); opacity:1; filter:blur(0px);}
          50% { transform: scale(1.4); opacity:.9; filter:blur(15px);}
          100% { transform: scale(2.2); opacity:0; filter:blur(40px);}
        }
      `}</style>
    </div>
  );
}