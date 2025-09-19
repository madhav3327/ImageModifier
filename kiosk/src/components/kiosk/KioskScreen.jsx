import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image as ImageIcon } from "lucide-react";
import PulsingOrb from "../PulsingOrb";
import CountdownOverlay from "../CountdownOverlay";

export default function KioskScreen({
  stream,
  rendering,
  resultUrl,
  showCapturedImage,
  capturedUrlRef,
  countdown,
  videoElementProps,
  imageElementProps,
}) {
  const idleVideos = [
    '/static/Animated2.MP4',
    '/static/Animated3.MP4'
  ];
  const [currentVideoIndex, setCurrentVideoIndex] = React.useState(0);

  return (
    <main className="max-w-6xl mx-auto px-4 pb-16 pt-6 grid gap-6">
      <div className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden shadow-xl">
        <div className="p-3 border-b border-white/10 flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          <span className="font-medium">Current View</span>
          <span className="ml-auto text-xs opacity-70">
            {stream ? "Live preview" : "Ready"}
          </span>
        </div>
        <div className="relative aspect-[10/16] bg-black flex items-center justify-center">
          <AnimatePresence mode="wait">
            {stream ? (
              <motion.video
                key="video"
                {...videoElementProps}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-contain"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35 }}
              />
            ) : rendering ? (
              <motion.div
                key="rendering"
                initial={{ opacity: 0.0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
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
            ) : showCapturedImage && capturedUrlRef.current ? (
              <motion.img
                key="captured"
                src={capturedUrlRef.current}
                alt="Captured"
                className="w-full h-full object-contain"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
              />
            ) : (
              <motion.video
                key={currentVideoIndex}
                src={idleVideos[currentVideoIndex]}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-contain"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                onEnded={() => setCurrentVideoIndex((prev) => (prev + 1) % idleVideos.length)}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {countdown > 0 && <CountdownOverlay value={countdown} />}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}