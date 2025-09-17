import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Camera,
  Wand2,
  Settings2,
  Activity,
  Image as ImageIcon,
  PlugZap,
} from "lucide-react";

// ===== Tablet Controller (remote control) =====
const RAW_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const BACKEND_URL = RAW_BASE.replace(/\/+$/, "");
const WS_BASE = BACKEND_URL.replace(/^http/i, "ws");

const SUGGESTED_PROMPTS = [
  "Convert my image to a cartoon",
  "Apply police uniform",
  "Make me look like Batman",
  "Studio portrait color grade",
  "Pop-art comic style",
];

// --- REMOVED MODEL-RELATED CODE ---
// const MODELS = [...]
// const [selectedModel, setSelectedModel] = useState("gpt");

export default function App() {
  const wsRef = useRef(null);

  const [sessionCode, setSessionCode] = useState("");
  const [wsConnected, setWsConnected] = useState(false);

  const [prompt, setPrompt] = useState("");

  const [status, setStatus] = useState("idle"); // idle | rendering | error
  const [resultUrl, setResultUrl] = useState("");
  const [error, setError] = useState("");

  const [canSend, setCanSend] = useState(false); // enabled after kiosk CAPTURED
  const [countdown, setCountdown] = useState(0); // local visual timer

  // ---- WebSocket connect ----
  const connectWS = () => {
    setError("");
    if (!sessionCode)
      return setError("Enter the session code shown on the kiosk.");

    try {
      const ws = new WebSocket(
        `${WS_BASE}/ws?session=${encodeURIComponent(sessionCode)}&role=tablet`
      );
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onerror = () =>
        setError("WebSocket error. Check network or session code.");
      ws.onmessage = (ev) => {
        const msg = safeParse(ev.data);
        if (!msg) return;
        if (msg.type === "CAPTURED") {
          // Add a small delay to prevent the race condition
          setTimeout(() => {
            setCanSend(true);
          }, 100); // 100ms is usually more than enough
        }
        if (msg.type === "STATUS" && msg.value) setStatus(msg.value);
        if (msg.type === "RESULT" && msg.dataUrl) {
          setResultUrl(msg.dataUrl);
          setStatus("idle");
        }
      };
      wsRef.current = ws;
    } catch {
      setError("Failed to connect WebSocket.");
    }
  };

  const sendWS = (obj) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
    else setError("Not connected to kiosk. Connect with session code first.");
  };

  const useSuggestion = (t) => setPrompt(t);

  const onOpenCamera = () => {
    setError("");
    if (!wsConnected) return setError("Not connected to kiosk.");
    sendWS({ type: "OPEN_CAMERA" });
  };

  const onCapture = () => {
    setError("");
    if (!wsConnected) return setError("Not connected to kiosk.");

    let t = 3;
    setCanSend(false);
    setCountdown(t);
    const iv = setInterval(() => {
      t -= 1;
      setCountdown(t);
      if (t <= 0) clearInterval(iv);
    }, 1000);

    sendWS({ type: "SHUTTER", countdown: 3 });
  };

  const onMagic = () => {
    setError("");
    if (!wsConnected) return setError("Not connected to kiosk.");
    if (!canSend) return setError("Capture a photo first.");
    if (!prompt.trim()) return setError("Enter a prompt.");

    setStatus("rendering");
    // --- UPDATED: removed the 'provider' field ---
    sendWS({ type: "EDIT", prompt: prompt.trim() });
  };

  const onReset = () => {
    setPrompt("");
    setResultUrl("");
    setCanSend(false);
    setStatus("idle");
    setCountdown(0);
    setError("");
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur bg-slate-900/50 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3">
          <Camera className="w-6 h-6" />
          <h1 className="text-lg font-semibold tracking-tight">
            Vision Tablet
          </h1>

          <div className="ml-auto flex items-center gap-2">
            {/* --- REMOVED MODEL SELECTION BUTTONS --- */}

            {/* Session connect */}
            <div className="flex items-center gap-2 pl-3 ml-3 border-l border-white/10">
              <input
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                placeholder="Session code"
                className="px-2 py-1 text-xs rounded-lg bg-slate-800/70 border border-white/10 outline-none"
              />
              <button
                onClick={connectWS}
                className={`px-3 py-1.5 text-xs rounded-xl border ${
                  wsConnected
                    ? "bg-indigo-600/80 border-indigo-500"
                    : "bg-slate-800/70 border-white/10 hover:border-white/20"
                }`}
                title="Connect to kiosk"
              >
                <PlugZap className="w-4 h-4 inline -mt-0.5 mr-1" />
                {wsConnected ? "Connected" : "Connect"}
              </button>
              <span
                className={`text-[11px] px-2 py-1 rounded border ${
                  status === "rendering"
                    ? "bg-yellow-500/15 border-yellow-500/40 text-yellow-200"
                    : status === "error"
                    ? "bg-red-500/15 border-red-500/40 text-red-200"
                    : "bg-slate-700/40 border-white/10 text-slate-200"
                }`}
                title="Kiosk status"
              >
                <Activity className="w-3 h-3 inline mr-1 -mt-0.5" />
                {status}
              </span>

              <Settings2 className="w-5 h-5 opacity-70 ml-2" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pb-16 pt-6 grid gap-6">
        {/* Big control row */}
        <motion.div
          layout
          className="rounded-2xl border border-white/10 bg-slate-900/50 shadow-xl overflow-hidden"
        >
          <div className="p-6 flex flex-col items-center justify-center gap-4">
            <button
              onClick={onOpenCamera}
              disabled={!wsConnected}
              className="px-6 py-3 rounded-2xl text-base font-semibold bg-slate-800 hover:bg-slate-700 border border-white/10 disabled:opacity-50"
              title="Open camera on kiosk"
            >
              Open Camera on Kiosk
            </button>

            <button
              onClick={onCapture}
              disabled={!wsConnected || countdown > 0}
              className="px-8 py-4 rounded-2xl text-lg font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
              title="Capture on kiosk with 3s timer"
            >
              {countdown > 0 ? `Capturing in ${countdown}…` : "Capture"}
            </button>
          </div>
        </motion.div>

        {/* Prompt + Magic */}
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
                <button
                  key={s}
                  onClick={() => useSuggestion(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 bg-slate-800/60 hover:bg-slate-800 transition"
                >
                  {s}
                </button>
              ))}
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Apply police uniform with badge; keep glasses; match lighting"
              className="w-full min-h-[140px] rounded-xl bg-slate-800/80 border border-white/10 p-3 outline-none focus:ring-2 focus:ring-emerald-500/50"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={onMagic}
                disabled={!wsConnected || !canSend}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold disabled:opacity-50"
                // --- UPDATED: removed model tooltip ---
                title={`Send to model`}
              >
                Magic
              </button>
              <button
                onClick={onReset}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10"
              >
                Reset
              </button>
            </div>

            {error && (
              <div className="mt-3 text-sm text-red-300 bg-red-950/40 border border-red-900/40 rounded-xl p-3">
                {error}
              </div>
            )}
          </div>
        </motion.div>

        {/* Optional: mirror latest result */}
        <motion.div
          layout
          className="rounded-2xl border border-white/10 bg-slate-900/50 shadow-xl overflow-hidden"
        >
          <div className="p-3 border-b border-white/10 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            <span className="font-medium">Latest Result (from kiosk)</span>
          </div>
          <div className="h-[240px] bg-slate-950 flex items-center justify-center">
            {resultUrl ? (
              <img
                src={resultUrl}
                alt="Edited"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="opacity-70 text-sm">
                Results will mirror here after Magic.
              </div>
            )}
          </div>
        </motion.div>
      </main>

      <footer className="max-w-6xl mx-auto px-4 pb-6 text-center opacity-60 text-xs">
        Tablet controller • Connect to a kiosk with a session code. Open Camera
        → Capture → Magic.
      </footer>
    </div>
  );
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
