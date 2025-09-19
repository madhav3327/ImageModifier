import React from "react";
import { Camera, Video, Image, Smile } from "lucide-react";

// An array to hold our icons and their initial positions/styles
const icons = [
  { Component: Camera, styles: { left: "10%", bottom: "20px", animationDuration: "10s" } },
  { Component: Video, styles: { left: "25%", bottom: "40px", animationDuration: "14s" } },
  { Component: Image, styles: { left: "45%", bottom: "10px", animationDuration: "8s" } },
  { Component: Smile, styles: { left: "60%", bottom: "50px", animationDuration: "12s" } },
  { Component: Camera, styles: { left: "80%", bottom: "30px", animationDuration: "9s", animationDelay: "2s" } },
  { Component: Image, styles: { left: "90%", bottom: "25px", animationDuration: "15s", animationDelay: "1s" } },
];

export default function FloatingIconsFooter() {
  return (
    <>
      {/* This style tag contains the new, more dynamic drift animation */}
      <style>{`
        @keyframes drift {
          0% { transform: translateY(0px) translateX(0px) rotate(0deg); }
          25% { transform: translateY(-15px) translateX(10px) rotate(5deg); }
          50% { transform: translateY(5px) translateX(-10px) rotate(-5deg); }
          75% { transform: translateY(-10px) translateX(5px) rotate(3deg); }
          100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
        }
        .drift-anim {
          animation: drift ease-in-out infinite;
        }
      `}</style>

      <div
        className="fixed bottom-0 left-0 w-full h-32 pointer-events-none z-0"
        aria-hidden="true"
      >
        <div className="relative w-full h-full max-w-6xl mx-auto">
          {icons.map((icon, index) => (
            <div
              key={index}
              className="absolute text-slate-700 drift-anim"
              style={icon.styles}
            >
              <icon.Component className="w-8 h-8 text-slate-400" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}