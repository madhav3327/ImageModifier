import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon } from "lucide-react";
import CountdownOverlay from "./CountdownOverlay"; // You'll move this component here

export default function CapturePanel({ videoRef, stream, capturedUrl, countdown }) {
  const getStatusText = () => {
    if (stream) return "Live preview (awaiting capture…)";
    if (capturedUrl) return "Frozen still";
    return "Waiting…";
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden shadow-xl">
      <div className="p-3 border-b border-white/10 flex items-center gap-2">
        <ImageIcon className="w-5 h-5" />
        <span className="font-medium">Captured</span>
        <span className="ml-auto text-xs opacity-70">{getStatusText()}</span>
      </div>

      <div className="relative aspect-[16/9] bg-black flex items-center justify-center">
        {stream && (
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className="w-full h-full object-contain"
          />
        )}

        {!stream && capturedUrl && (
          <img
            src={capturedUrl}
            alt="Captured"
            className="w-full h-full object-contain"
          />
        )}

        {!stream && !capturedUrl && (
          <div className="text-center px-6 opacity-80">
            <p className="text-sm">
              Waiting for tablet to open the camera and take a shot…
            </p>
          </div>
        )}

        <AnimatePresence>
          {countdown > 0 && <CountdownOverlay value={countdown} />}
        </AnimatePresence>
      </div>
    </div>
  );
}