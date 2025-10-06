// TitleDisplay.jsx
import React from "react";
import { motion } from "framer-motion";

export default function TitleDisplay() {
  return (
    <motion.div
      className="text-center relative"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h1 className="title relative font-extrabold leading-tight">
        Imagine  <br/> your World
        <div className="aurora">
          <div className="aurora__item"></div>
          <div className="aurora__item"></div>
          <div className="aurora__item"></div>
          <div className="aurora__item"></div>
        </div>
      </h1>
      <p className="subtitle text-lg md:text-xl text-white/70 mt-4">
        Be a writer for your comic
      </p>

      {/* Scoped styles for aurora heading */}
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;800&display=swap");

        .title {
          font-size: clamp(2.5rem, 6vw, 4rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          position: relative;
          overflow: hidden;
          
          margin: 0;
        }

        .aurora {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 2;
          mix-blend-mode: darken;
          pointer-events: none;
        }

        .aurora__item {
          overflow: hidden;
          position: absolute;
          width: 60vw;
          height: 60vw;
          background-color: #00c2ff;
          border-radius: 37% 29% 27% 27% / 28% 25% 41% 37%;
          filter: blur(1rem);
          mix-blend-mode: overlay;
        }
        .aurora__item:nth-of-type(1) {
          top: -50%;
          animation: aurora-border 6s ease-in-out infinite, aurora-1 12s ease-in-out infinite alternate;
        }
        .aurora__item:nth-of-type(2) {
          background-color: #ffc640;
          right: 0;
          top: 0;
          animation: aurora-border 6s ease-in-out infinite, aurora-2 12s ease-in-out infinite alternate;
        }
        .aurora__item:nth-of-type(3) {
          background-color: #33ff8c;
          left: 0;
          bottom: 0;
          animation: aurora-border 6s ease-in-out infinite, aurora-3 8s ease-in-out infinite alternate;
        }
        .aurora__item:nth-of-type(4) {
          background-color: #e54cff;
          right: 0;
          bottom: -50%;
          animation: aurora-border 6s ease-in-out infinite, aurora-4 24s ease-in-out infinite alternate;
        }

        @keyframes aurora-1 {
          0% { top: 0; right: 0; }
          50% { top: 100%; right: 75%; }
          75% { top: 100%; right: 25%; }
          100% { top: 0; right: 0; }
        }
        @keyframes aurora-2 {
          0% { top: -50%; left: 0%; }
          60% { top: 100%; left: 75%; }
          85% { top: 100%; left: 25%; }
          100% { top: -50%; left: 0%; }
        }
        @keyframes aurora-3 {
          0% { bottom: 0; left: 0; }
          40% { bottom: 100%; left: 75%; }
          65% { bottom: 40%; left: 50%; }
          100% { bottom: 0; left: 0; }
        }
        @keyframes aurora-4 {
          0% { bottom: -50%; right: 0; }
          50% { bottom: 0%; right: 40%; }
          90% { bottom: 50%; right: 25%; }
          100% { bottom: -50%; right: 0; }
        }
        @keyframes aurora-border {
          0% { border-radius: 37% 29% 27% 27% / 28% 25% 41% 37%; }
          25% { border-radius: 47% 29% 39% 49% / 61% 19% 66% 26%; }
          50% { border-radius: 57% 23% 47% 72% / 63% 17% 66% 33%; }
          75% { border-radius: 28% 49% 29% 100% / 93% 20% 64% 25%; }
          100% { border-radius: 37% 29% 27% 27% / 28% 25% 41% 37%; }
        }
      `}</style>
    </motion.div>
  );
}