import React from 'react';
import { motion } from 'framer-motion';

const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const coreVariants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [0.8, 1, 0.8],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const particleVariants = {
  animate: (i) => ({
    x: [0, Math.random() * 200 - 100, 0],
    y: [0, Math.random() * 200 - 100, 0],
    opacity: [0, 1, 0],
    scale: [0.5, 1, 0.5],
    transition: {
      duration: 5 + Math.random() * 5,
      repeat: Infinity,
      ease: "linear",
      delay: i * 0.2,
    },
  }),
};

export default function PulsingOrb() {
  const particles = Array.from({ length: 20 }, (_, i) => i);
  
  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent_70%)]" />

      <motion.div
        className="w-[120px] h-[120px] rounded-full bg-indigo-500/80 blur-lg"
        variants={coreVariants}
        animate="animate"
      />
      
      <motion.div
        className="absolute w-full h-full flex items-center justify-center"
        variants={containerVariants}
        animate="animate"
      >
        {particles.map((i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-indigo-300 opacity-0"
            variants={particleVariants}
            custom={i}
          />
        ))}
      </motion.div>

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