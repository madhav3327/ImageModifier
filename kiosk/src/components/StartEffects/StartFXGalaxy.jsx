export function StartFXGalaxy({ onDone }) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 1300);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[999] pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#8a2be2,#ff69b4,#1e90ff,#000)] animate-[galaxy_1.3s_ease-in-out]" />
      <style>{`
        @keyframes galaxy {
          0% { transform: scale(0.3) rotate(0deg); opacity:1; filter:blur(0px);}
          50% { transform: scale(1.2) rotate(90deg); opacity:0.9; filter:blur(30px);}
          100% { transform: scale(2.8) rotate(180deg); opacity:0; filter:blur(60px);}
        }
      `}</style>
    </div>
  );
}