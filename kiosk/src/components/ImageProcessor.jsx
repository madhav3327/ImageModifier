import React from "react";
import { motion, useTime, useTransform } from "framer-motion";

// Defines the grid size. Higher numbers mean more, smaller squares.
const GRID_SIZE = 20;

// This sub-component renders a single square of the grid.
function Square({ row, col, sourceImage, targetImage }) {
  // These calculations determine which part of the source/target image to show
  // inside this specific square, creating the mosaic effect.
  const bgSize = `${GRID_SIZE * 100}%`;
  const bgPosX = `${col * (100 / (GRID_SIZE - 1))}%`;
  const bgPosY = `${row * (100 / (GRID_SIZE - 1))}%`;

  return (
    <div className="relative aspect-square">
      {/* The "after" image piece (bottom layer) */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${targetImage})`,
          backgroundSize: bgSize,
          backgroundPosition: `${bgPosX} ${bgPosY}`,
        }}
      />
      {/* The "before" image piece (top layer, will fade out) */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${sourceImage})`,
          backgroundSize: bgSize,
          backgroundPosition: `${bgPosX} ${bgPosY}`,
        }}
        // Animate opacity to 0 to reveal the layer underneath
        animate={{ opacity: 0 }}
        transition={{
          duration: 0.4,
          // This delay is based on the square's position, creating the wipe effect
          delay: (row + col) * 0.035, 
        }}
      />
    </div>
  );
}

// The main component that orchestrates the animation
export default function ImageProcessor({ beforeImage, afterImage, onAnimationComplete }) {
  // Create a 2D array representing the grid
  const grid = Array.from({ length: GRID_SIZE }, (_, row) =>
    Array.from({ length: GRID_SIZE }, (_, col) => ({ row, col }))
  );

  return (
    <div className="relative w-full h-full">
      {/* Grid container */}
      <div className="absolute inset-0 grid grid-cols-20">
        {grid.flat().map(({ row, col }) => (
          <Square
            key={`${row}-${col}`}
            row={row}
            col={col}
            sourceImage={beforeImage}
            targetImage={afterImage}
          />
        ))}
      </div>
      
      {/* Scanner Line */}
      <motion.div
        className="absolute top-0 left-0 w-full h-1 bg-cyan-300/80 shadow-[0_0_10px_2px_#00ffff]"
        initial={{ y: "-100%" }}
        animate={{ y: "100vh" }} // Animate past the bottom of the screen
        transition={{ duration: 1.5, ease: "easeInOut" }}
        // When the scanner animation completes, call the function from props
        onAnimationComplete={onAnimationComplete} 
      />
    </div>
  );
}