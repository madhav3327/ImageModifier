import React, { useEffect, memo } from "react";
import { useAnimate } from "framer-motion";

// Helper to render each character in its own span for animation
const renderChars = (text, className) => {
  return text.split("").map((char, index) => (
    <span key={index} className={`inline-block ${className}`} data-char>
      {char === " " ? "\u00A0" : char}
    </span>
  ));
};

function AnimatedTitle({ isAbducted }) {
  const [scope, animate] = useAnimate();

  useEffect(() => {
    // This effect runs the "abduction" animation when the prop becomes true
    if (isAbducted) {
      const allChars = scope.current.querySelectorAll("[data-char]");
      animate(
        allChars,
        { y: -150, opacity: 0, scale: 0.5 },
        {
          duration: 1.2,
          delay: (i) => i * 0.025, // Stagger the animation for a cool effect
          ease: "easeIn",
        }
      );
    }
  }, [isAbducted, animate, scope]);

  return (
    <div ref={scope} className="text-center">
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
        {renderChars("Virtual World", "animated-gradient-text")}
      </h1>
      <p className="text-lg md:text-xl text-white/70 mt-2">
        {renderChars("make your imaginations live", "")}
      </p>
    </div>
  );
}

export default memo(AnimatedTitle);