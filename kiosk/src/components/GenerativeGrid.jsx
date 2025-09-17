import React from 'react';
import {motion} from 'framer-motion';

const dotVariants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: (custom) => ({
    opacity: [0, 1, 0],
    scale: [0.5, 1, 0.5],
    transition: {
      duration: 1.8,
      repeat: Infinity,
      repeatType: "loop",
      ease: "easeInOut",
      delay: custom * 0.02,
    },
  }),
};

export default function GenerativeGrid() {
  const dots = Array.from({ length: 140 }, (_, i) => i);
  const colors = ["#8B5CF6", "#EC4899", "#22D3EE"];

  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-slate-950">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-fuchsia-500/5 to-cyan-500/5 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent_70%)]" />

      <div
        className="w-[80%] max-w-[720px] aspect-video grid gap-2"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(20px, 1fr))' }}
      >
        {dots.map((i) => (
          <motion.div
            key={i}
            variants={dotVariants}
            custom={i}
            style={{
              backgroundColor: colors[i % colors.length],
            }}
            className="w-4 h-4 rounded-full opacity-0"
          />
        ))}
      </div>

      <div className="absolute bottom-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-4 h-4 rounded-full border-2 border-t-transparent border-white"
          />
          <span className="text-sm tracking-wide">
            Generating your result...
          </span>
        </div>
      </div>
    </div>
  );
}