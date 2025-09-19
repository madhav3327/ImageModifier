import React from "react";
import { motion } from "framer-motion";

export default function CountdownOverlay({ value }) {
  if (!value || value <= 0) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.div
        key={value}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1.1, opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="w-40 h-40 rounded-full bg-black/60 backdrop-blur flex items-center justify-center border border-white/20 shadow-xl"
      >
        <span className="text-6xl font-bold">{value}</span>
      </motion.div>
    </div>
  );
}