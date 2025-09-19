import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon } from "lucide-react";
import PulsingOrb from "./PulsingOrb"; // Assuming this component exists

export default function ResultPanel({ rendering, resultUrl }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden shadow-xl">
      <div className="p-3 border-b border-white/10 flex items-center gap-2">
        <ImageIcon className="w-5 h-5" />
        <span className="font-medium">Styled Result</span>
        <span className="ml-auto text-xs opacity-70">
          {rendering ? "Generating…" : resultUrl ? "Ready" : "Idle"}
        </span>
      </div>

      <div className="relative aspect-[16/9] bg-slate-950 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {rendering ? (
            <motion.div
              key="anim"
              initial={{ opacity: 0.0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <PulsingOrb />
            </motion.div>
          ) : resultUrl ? (
            <motion.img
              key="result"
              src={resultUrl}
              alt="Result"
              className="max-w-full max-h-full object-contain"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
            />
          ) : (
            <motion.div
              key="idle"
              className="text-center px-6 opacity-80 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Once the tablet sends a prompt, the styled image will appear here.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}