import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Wand2,
  Image as ImageIcon,
  Settings2,
  Activity,
  LogOut
} from "lucide-react";

const SUGGESTED_PROMPTS = [
  "Convert my image to a cartoon",
  "Apply police uniform",
  "Make me look like Batman",
  "Studio portrait color grade",
  "Pop-art comic style",
];

export default function MainEditor({ sendWS, wsConnected, username, onExit, canSend, onSetCanSend }) {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [firstPromptSubmitted, setFirstPromptSubmitted] = useState(false);
  const [secondPrompt, setSecondPrompt] = useState("");
  
  // A local effect to reset canSend after a magic button press
  const onMagic = () => {
    setError("");
    if (!wsConnected) return setError("Not connected to kiosk. Please reconnect.");
    if (!canSend) return setError("Capture a photo first.");
    if (!prompt.trim()) return setError("Enter a prompt.");
    
    setStatus("rendering");
    setFirstPromptSubmitted(true);
    sendWS({ type: "EDIT", prompt: prompt.trim(), useLastResult: false });
    onSetCanSend(false); // Reset canSend after a successful magic call
  };

  const onRefine = () => {
  setError("");
  if (!wsConnected) return setError("Not connected to kiosk. Please reconnect.");
  if (!secondPrompt.trim()) return setError("Enter a prompt for refinement.");
  
  setStatus("rendering");
  sendWS({ type: "REFINE", prompt: secondPrompt.trim() }); 
  onSetCanSend(false);
};
  
  // Existing functions...
  const useSuggestion = (t) => setPrompt(t);

  const onOpenCamera = () => {
    setError("");
    if (!wsConnected) return setError("Not connected to kiosk. Please reconnect.");
    sendWS({ type: "OPEN_CAMERA" });
  };

  const onCapture = () => {
    setError("");
    if (!wsConnected) return setError("Not connected to kiosk. Please reconnect.");
    let t = 3;
    onSetCanSend(false); // Reset canSend when capture starts
    setCountdown(t);
    const iv = setInterval(() => {
      t -= 1;
      setCountdown(t);
      if (t <= 0) clearInterval(iv);
    }, 1000);
    sendWS({ type: "SHUTTER", countdown: 3 });
  };

  const onReset = () => {
    setPrompt("");
    setSecondPrompt("");
    onSetCanSend(false);
    setStatus("idle");
    setCountdown(0);
    setError("");
    setFirstPromptSubmitted(false);
  };
  
  return (
    <main className="max-w-6xl mx-auto px-4 pb-16 pt-6 grid gap-6">

      {/* NEW: Personalized greeting */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-4xl font-bold mb-1">
          Hi, {username}!
        </h2>
        <p className="text-xl opacity-80 italic">
          Smile for the prettiest photo.
        </p>
      </motion.div>

      {/* Main control row */}
      <motion.div
        layout
        className="rounded-2xl border border-white/10 bg-slate-900/50 shadow-xl overflow-hidden"
      >
        <div className="p-6 flex flex-col items-center justify-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenCamera}
            disabled={!wsConnected || firstPromptSubmitted}
            className="w-full px-6 py-3 rounded-2xl text-base font-semibold bg-slate-800 hover:bg-slate-700 border border-white/10 disabled:opacity-50 transition"
            title="Open camera on kiosk"
          >
            Open Camera on Kiosk
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCapture}
            disabled={!wsConnected || countdown > 0 || firstPromptSubmitted}
            className="w-full px-8 py-4 rounded-2xl text-lg font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition"
            title="Capture on kiosk with 3s timer"
          >
            {countdown > 0 ? `Capturing in ${countdown}…` : "Capture"}
          </motion.button>
        </div>
      </motion.div>

      {/* First Prompt Area */}
      {!firstPromptSubmitted && (
        <motion.div
          layout
          className="rounded-2xl border border-white/10 bg-slate-900/50 shadow-xl"
        >
          <div className="p-4 border-b border-white/10 flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            <span className="font-medium">Prompt</span>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {SUGGESTED_PROMPTS.map((s) => (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  key={s}
                  onClick={() => useSuggestion(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 bg-slate-800/60 hover:bg-slate-800 transition"
                >
                  {s}
                </motion.button>
              ))}
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Apply police uniform with badge; keep glasses; match lighting"
              className="w-full min-h-[140px] rounded-xl bg-slate-800/80 border border-white/10 p-3 outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onMagic}
                disabled={!wsConnected || !canSend}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold disabled:opacity-50 transition"
                title={`Send to model`}
              >
                Magic
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onReset}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 transition"
              >
                Reset
              </motion.button>
            </div>
            {error && (
              <div className="mt-3 text-sm text-red-300 bg-red-950/40 border border-red-900/40 rounded-xl p-3">
                {error}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {firstPromptSubmitted && (
        <motion.div
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-white/10 bg-slate-900/50 shadow-xl"
        >
          <div className="p-4 border-b border-white/10 flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            <span className="font-medium">Refine</span>
          </div>
          <div className="p-4">
            <textarea
              value={secondPrompt}
              onChange={(e) => setSecondPrompt(e.target.value)}
              placeholder="e.g., Make the background a jungle; give me sunglasses"
              className="w-full min-h-[100px] rounded-xl bg-slate-800/80 border border-white/10 p-3 outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onRefine}
                disabled={!wsConnected || !secondPrompt.trim()} // Check canSend for refinement
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold disabled:opacity-50 transition"
                title={`Refine the image`}
              >
                Magic Refine
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onReset}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 transition"
              >
                Reset
              </motion.button>
            </div>
            {error && (
              <div className="mt-3 text-sm text-red-300 bg-red-950/40 border border-red-900/40 rounded-xl p-3">
                {error}
              </div>
            )}
          </div>
        </motion.div>
      )}
      
      <footer className="max-w-6xl mx-auto px-4 pb-6 text-center opacity-60 text-xs flex justify-between items-center">
        <span>
          Tablet controller
        </span>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onExit}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-sm font-semibold hover:bg-red-500/10 hover:border-red-500 transition"
        >
          <LogOut className="w-4 h-4" />
          Exit
        </motion.button>
      </footer>
    </main>
  );
}