import React, { useEffect, useRef } from "react";
import { useAnimate, memo } from "framer-motion";

// Helper to render text with each character in a separate span
const renderChars = (text, textIndex, isAbducted) => {
  // We apply the animated gradient class only to the first line and when not abducted
  const needsGradient = textIndex === 0 && !isAbducted;

  return text.split("").map((char, charIndex) => {
    const key = `${textIndex}-${charIndex}`;
    const className = `inline-block ${needsGradient ? "animated-gradient-text" : ""}`;

    if (text === "imaginations" && char === "i") {
      return (
        <span key={key} className={className} data-char={char} data-i-base>ı</span>
      );
    }

    return (
      <span key={key} className={className} data-char={char}>
        {char === " " ? "\u00A0" : char}
      </span>
    );
  });
};

function BouncingDotTitle({ isAbducted }) {
  const [scope, animate] = useAnimate();
  const animationControl = useRef({ isActive: true });

  useEffect(() => {
    // This effect runs the abduction animation when the isAbducted prop becomes true
    if (isAbducted) {
      // Signal the main loop to stop
      animationControl.current.isActive = false;

      const allElements = scope.current.querySelectorAll("[data-char], #dot");
      
      // Animate all letters and the dot flying upwards
      animate(
        allElements,
        { y: -200, opacity: 0 },
        {
          duration: 1.5,
          delay: (i) => i * 0.02, // Stagger the animation
          ease: "easeIn",
        }
      );
    }
  }, [isAbducted, animate, scope]);
  
  useEffect(() => {
    // Set the flag to true on mount
    animationControl.current.isActive = true;

    const runAnimation = async () => {
      // ... (Setup and Measurement code remains the same as before)
      const allChars = Array.from(scope.current.querySelectorAll("[data-char]"));
      const iBaseElement = scope.current.querySelector("[data-i-base]");
      if (!iBaseElement) return;
      const iBaseRect = iBaseElement.getBoundingClientRect();
      const scopeRect = scope.current.getBoundingClientRect();
      const dotHomeX = iBaseRect.left - scopeRect.left + iBaseRect.width / 2 - 2;
      const dotHomeY = iBaseRect.top - scopeRect.top - 6;
      await animate("#dot", { x: dotHomeX, y: dotHomeY }, { duration: 0 });

      // The main animation loop
      while (animationControl.current.isActive) {
        // ... (The entire bouncing animation loop remains the same as before)
        for (const charElement of allChars) {
          if (!animationControl.current.isActive) break; // Exit loop if abduction starts
          const charRect = charElement.getBoundingClientRect();
          if (charRect.width === 0) continue;
          const targetX = charRect.left - scopeRect.left + charRect.width / 2 - 2;
          const targetY = charRect.top - scopeRect.top - 6;
          await animate( "#dot", { x: targetX, y: [dotHomeY, targetY - 20, targetY] }, { duration: 0.3, ease: "circOut" });
          if (!animationControl.current.isActive) break;
          await animate(charElement, { y: [0, -10, 0], scaleY: [1, 0.8, 1], scaleX: [1, 1.1, 1] }, { duration: 0.4, type: "spring", damping: 10, stiffness: 300 });
        }
        if (!animationControl.current.isActive) break;
        await animate("#dot", { x: dotHomeX, y: dotHomeY }, { type: "spring", damping: 15, stiffness: 200 });
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    };
    
    runAnimation();
    
    // Cleanup function to stop the loop when the component unmounts
    return () => {
      animationControl.current.isActive = false;
    };
  }, [animate, scope]);

  return (
    <div ref={scope} className="relative text-center">
      <span id="dot" className="absolute w-2 h-2 bg-slate-100 rounded-full" style={{ top: 0, left: 0 }}/>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
        {renderChars("Virtual World", 0, isAbducted)}
      </h1>
      <p className="text-lg md:text-xl text-white/70">
        {renderChars("make your ", 1, isAbducted)}
        {renderChars("imaginations", 2, isAbducted)}
        {renderChars(" live", 3, isAbducted)}
      </p>
    </div>
  );
}

export default memo(BouncingDotTitle);