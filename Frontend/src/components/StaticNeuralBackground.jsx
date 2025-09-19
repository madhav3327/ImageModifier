import React from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

const nodesData = Array.from({ length: 100 }, (_, i) => ({
  id: i,
  initial: {
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    opacity: 0,
    scale: 0,
  },
  animate: {
    x: [Math.random() * window.innerWidth, Math.random() * window.innerWidth],
    y: [Math.random() * window.innerHeight, Math.random() * window.innerHeight],
    opacity: [0, 1, 0],
    scale: [0, 1, 0],
    transition: {
      duration: Math.random() * 10 + 5,
      repeat: Infinity,
      repeatType: "loop",
      ease: "linear",
      delay: Math.random() * 5,
    },
  },
}));

export default function StaticNeuralBackground() {
  const nodeMotionValues = nodesData.map(() => ({
    x: useMotionValue(0),
    y: useMotionValue(0),
  }));

  const lineAnimation = (i, j) => ({
    opacity: [0, 0.8, 0],
    transition: {
      duration: 5,
      repeat: Infinity,
      ease: "easeInOut",
      delay: (i + j) * 0.1,
    },
  });

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-slate-950">
      <svg
        className="absolute inset-0 z-10 w-full h-full pointer-events-none"
        style={{ overflow: 'visible' }}
      >
        {nodesData.map((node1, i) =>
          nodesData.slice(i + 1).map((node2, j) => {
            const index2 = i + j + 1;
            const x1 = nodeMotionValues[i].x;
            const y1 = nodeMotionValues[i].y;
            const x2 = nodeMotionValues[index2].x;
            const y2 = nodeMotionValues[index2].y;

            const distance = useTransform([x1, y1, x2, y2], ([x1v, y1v, x2v, y2v]) =>
              Math.sqrt(Math.pow(x1v - x2v, 2) + Math.pow(y1v - y2v, 2))
            );
            const distanceOpacity = useTransform(distance, [0, 200], [1, 0]);

            return (
              <motion.line
                key={`${i}-${index2}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#6366F1"
                strokeWidth="1"
                initial={{ opacity: 0 }}
                animate={lineAnimation(i, j)}
                style={{ opacity: distanceOpacity }}
              />
            );
          })
        )}
      </svg>
      {nodesData.map((node, i) => (
        <motion.div
          key={node.id}
          className="absolute w-2 h-2 rounded-full bg-indigo-500/80"
          initial={node.initial}
          animate={node.animate}
          onUpdate={({ x, y }) => {
            nodeMotionValues[i].x.set(x);
            nodeMotionValues[i].y.set(y);
          }}
        />
      ))}
    </div>
  );
}