export function StartFXSplash({ onDone }) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 1100);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[999] bg-black pointer-events-none overflow-hidden">
      <div className="absolute inset-0 animate-[splash_1s_ease-in-out] bg-[radial-gradient(circle_at_center,#ff00cc_0%,#333399_25%,#00ccff_50%,#00ff99_70%,transparent_100%)]" />
      <style>{`
        @keyframes splash {
          0% { transform: scale(0.2); opacity:1; filter:blur(0px);}
          50% { transform: scale(1.3); opacity:0.8; filter:blur(20px);}
          100% { transform: scale(2.6); opacity:0; filter:blur(40px);}
        }
      `}</style>
    </div>
  );
}