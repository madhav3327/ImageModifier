import React from "react";
import { motion } from "framer-motion";

export default function TitleDisplay() {
  // I've corrected the spelling of "imagination" for you
  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
        Virtual World
      </h1>
      <p className="text-lg md:text-xl text-white/70 mt-2">
        bring your imagination to live
      </p>
    </motion.div>
  );
}