import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function ProcessingDisplay({ capturedImageUrl, resultUrl, onAnimationComplete }) {
  const [isFlipped, setIsFlipped] = useState(false);

  // When the resultUrl prop arrives from the parent, trigger the flip
  useEffect(() => {
    if (resultUrl) {
      setIsFlipped(true);
    }
  }, [resultUrl]);

  return (
    <div className="w-full h-full perspective-1000">
      <motion.div
        className="w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        onAnimationComplete={() => {
          // When the flip animation is finished, tell the parent component
          if (isFlipped) {
            onAnimationComplete();
          }
        }}
      >
        {/* --- FRONT SIDE: The blurring captured image --- */}
        <div className="absolute w-full h-full backface-hidden">
          <motion.img
            src={capturedImageUrl}
            alt="Processing"
            className="w-full h-full object-contain"
            // This animation creates the progressive blur effect
            animate={{ filter: ["blur(0px)", "blur(16px)"] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "mirror", // Goes from blur(0) -> blur(16) -> blur(0)
              ease: "easeInOut",
            }}
          />
        </div>

        {/* --- BACK SIDE: The final result image --- */}
        <div
          className="absolute w-full h-full backface-hidden"
          style={{ transform: "rotateY(180deg)" }}
        >
          {resultUrl && (
            <img
              src={resultUrl}
              alt="Result"
              className="w-full h-full object-contain"
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}