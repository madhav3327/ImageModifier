export function StartFXCrystal({ onDone }) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 1300);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[999] pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#ff00cc_0%,#333399_100%)] opacity-60 animate-[crystal1_1.3s_ease-in-out]" />
      <div className="absolute inset-0 bg-[linear-gradient(225deg,#00fff0_0%,#006aff_100%)] opacity-60 animate-[crystal2_1.3s_ease-in-out]" />
      <div className="absolute inset-0 bg-[linear-gradient(45deg,#ffe600_0%,#ff0080_100%)] opacity-50 animate-[crystal3_1.3s_ease-in-out]" />
      <style>{`
        @keyframes crystal1 {
          0% {transform: translate(-50%,-50%) scale(0); opacity:1;}
          100% {transform: translate(50%,50%) scale(2); opacity:0;}
        }
        @keyframes crystal2 {
          0% {transform: translate(50%,50%) scale(0); opacity:1;}
          100% {transform: translate(-50%,-50%) scale(2); opacity:0;}
        }
        @keyframes crystal3 {
          0% {transform: scale(0.5); opacity:0.7;}
          100% {transform: scale(2.5); opacity:0;}
        }
      `}</style>
    </div>
  );
}