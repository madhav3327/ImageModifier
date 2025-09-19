import React, { useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const dots = Array.from({ length: 150 }, (_, i) => i);

export default function NeuralBackground() {
  const mouse = {
    x: useSpring(useMotionValue(0), { stiffness: 400, damping: 90 }),
    y: useSpring(useMotionValue(0), { stiffness: 400, damping: 90 }),
  };

  const handlePointerMove = (e) => {
    mouse.x.set(e.clientX - window.innerWidth / 2);
    mouse.y.set(e.clientY - window.innerHeight / 2);
  };
  
  return (
    <motion.div
      className="absolute inset-0 z-0 overflow-hidden bg-slate-950"
      onPointerMove={handlePointerMove}
    >
      {dots.map((i) => (
        <Dot key={i} mouse={mouse} />
      ))}
    </motion.div>
  );
}

function Dot({ mouse }) {
  const x = useTransform(mouse.x, (val) => val * (Math.random() * 0.5));
  const y = useTransform(mouse.y, (val) => val * (Math.random() * 0.5));

  const size = useSpring(useMotionValue(Math.random() * 8 + 4), {
    stiffness: 400,
    damping: 90,
  });

  return (
    <motion.div
      className="absolute rounded-full bg-indigo-500/50"
      style={{ x, y, width: size, height: size }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.8 }}
      transition={{ duration: 2, delay: Math.random() * 2 }}
    />
  );
}