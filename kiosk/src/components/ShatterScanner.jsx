import React from "react";
import { motion } from "framer-motion";

// You can adjust this number. Higher numbers = more pieces.
const GRID_SIZE = 15;

export default function ShatterScanner({ imageUrl }) {
  // Create an array to map over for our grid
  const squares = Array.from({ length: GRID_SIZE * GRID_SIZE });

  return (
    <div className="relative w-full h-full">
      {/* The main container for all the pieces */}
      <div className="absolute inset-0">
        {squares.map((_, i) => {
          // Calculate the row and column for this specific piece
          const row = Math.floor(i / GRID_SIZE);
          const col = i % GRID_SIZE;
          
          // Calculate the size and initial position of the piece
          const size = `${100 / GRID_SIZE}%`;
          const top = `${row * (100 / GRID_SIZE)}%`;
          const left = `${col * (100 / GRID_SIZE)}%`;

          // These calculations determine which part of the image to show
          const bgSize = `${GRID_SIZE * 100}%`;
          const bgPosX = `${col * (100 / (GRID_SIZE - 1))}%`;
          const bgPosY = `${row * (100 / (GRID_SIZE - 1))}%`;

          return (
            <motion.div
              key={i}
              // ✅ This is the key change: we use absolute positioning
              style={{
                position: 'absolute',
                top,
                left,
                width: size,
                height: size,
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: bgSize,
                backgroundPosition: `${bgPosX} ${bgPosY}`,
              }}
              // Each piece starts invisible and at its original spot
              initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
              // Animate to a random, "shattered" position
              animate={{
                opacity: 1,
                x: (Math.random() - 0.5) * 50,
                y: (Math.random() - 0.5) * 50,
                rotate: (Math.random() - 0.5) * 45,
              }}
              transition={{
                duration: 0.5,
                delay: Math.random() * 0.4,
                ease: "easeOut",
              }}
            />
          );
        })}
      </div>

      {/* Scanner Line (this part was already working correctly) */}
      <motion.div
        className="absolute w-full h-1 bg-cyan-300/80 shadow-[0_0_10px_2px_#00ffff]"
        style={{ top: "-10px" }}
        animate={{ top: "110%" }}
        transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }}
      />
    </div>
  );
}