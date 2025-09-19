import React from "react";
import { motion } from "framer-motion";

export default function PulsingOrb() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <motion.div
        className="w-32 h-32 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 2.5,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />
    </div>
  );
}