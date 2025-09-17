import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Activity,
  PlugZap,
  Image as ImageIcon,
  Zap,
  Loader2,
} from "lucide-react";
import PulsingOrb from "./components/PulsingOrb";

const RAW_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const BACKEND_URL = RAW_BASE.replace(/\/+$/, "");
const WS_BASE = BACKEND_URL.replace(/^http/i, "ws");

// ------------------- Countdown Overlay -------------------
function CountdownOverlay({ value }) {
  if (!value || value <= 0) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.div
        key={value}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1.1, opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="w-40 h-40 rounded-full bg-black/60 backdrop-blur flex items-center justify-center border border-white/20 shadow-xl"
      >
        <span className="text-6xl font-bold">{value}</span>
      </motion.div>
    </div>
  );
}

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);

  const capturedUrlRef = useRef(null);
  const [sessionId, setSessionId] = useState("");
  const [connected, setConnected] = useState(false);
  const [tabletOnline, setTabletOnline] = useState(false);
  const [showCapturedImage, setShowCapturedImage] = useState(false);
  const [resultUrl, setResultUrl] = useState("");
  const [rendering, setRendering] = useState(false);
  const [stream, setStream] = useState(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    createSession();
    return () => {
      try { wsRef.current?.close(); } catch {}
      try { stopCamera(); } catch {}
    };
  }, []);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  }, [stream]);

  const createSession = async () => {
    try {
      const r = await fetch(`${BACKEND_URL}/session`, { method: "POST" });
      const j = await r.json();
      setSessionId(j.sessionId);
      connectWS(j.sessionId);
    } catch (e) {
      console.error("Failed to create session", e);
    }
  };

  const connectWS = (sid) => {
    try {
      const ws = new WebSocket(
        `${WS_BASE}/ws?session=${encodeURIComponent(sid)}&role=kiosk`
      );
      ws.onopen = () => setConnected(true);
      ws.onclose = () => setConnected(false);
      ws.onerror = () => setConnected(false);
      ws.onmessage = async (ev) => {
        const msg = safeParse(ev.data);
        if (!msg || !msg.type) return;

        switch (msg.type) {
          case "PEER_STATUS":
            if (msg.role === "tablet") setTabletOnline(msg.status === "online");
            break;

          case "OPEN_CAMERA":
            await openCamera();
            break;

          case "CLOSE_CAMERA":
            stopCamera();
            break;

          case "SHUTTER":
            runCountdown(
              typeof msg.countdown === "number" ? msg.countdown : 3,
              async () => {
                const dataUrl = await captureStill();
                
                capturedUrlRef.current = dataUrl;
                setShowCapturedImage(true);
                stopCamera();
                
                sendWS({ type: "CAPTURED" });
              }
            );
            break;

          case "EDIT_START":
            setRendering(true);
            setResultUrl("");
            break;

          case "EDIT": {
            console.log("[KIOSK] EDIT received:", msg);
            
            if (!capturedUrlRef.current) {
              console.error("[KIOSK] No captured image; capture first.");
              setRendering(false);
              sendWS({
                type: "ERROR",
                message: "No captured image available.",
              });
              break;
            }
            if (!msg.prompt || !msg.prompt.trim()) {
              console.error("[KIOSK] Missing prompt.");
              setRendering(false);
              sendWS({ type: "ERROR", message: "No prompt provided." });
              break;
            }

            setRendering(true);
            setResultUrl("");

            try {
              const imgBlob = await (await fetch(capturedUrlRef.current)).blob();
              const form = new FormData();
              form.append("image_file", imgBlob, "capture.png");
              form.append("prompt", msg.prompt.trim());

              console.log("[KIOSK] POST →", `${BACKEND_URL}/api/edit`, {
                promptLen: msg.prompt.length,
                blobSize: imgBlob.size,
              });

              const response = await fetch(`${BACKEND_URL}/api/edit`, {
                method: "POST",
                body: form,
              });

              console.log(
                "[KIOSK] /api/edit status:",
                response.status,
                response.statusText
              );

              if (!response.ok) {
                const errorText = await response
                  .text()
                  .catch(() => "<no body>");
                console.error("[KIOSK] Backend error:", errorText);
                throw new Error(
                  `Backend error (${response.status}): ${errorText}`
                );
              }

              const ct = response.headers.get("content-type") || "";
              if (ct.startsWith("image/")) {
                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                console.log("[KIOSK] Received image blob; URL:", objectUrl);
                setResultUrl(objectUrl);
                setRendering(false);
                sendWS({ type: "RESULT", dataUrl: objectUrl });
              } else {
                const result = await response.json();
                const dataUrl = `data:${result.mime};base64,${result.image_b64}`;
                console.log(
                  "[KIOSK] Received JSON image; dataUrl length:",
                  dataUrl.length
                );
                setResultUrl(dataUrl);
                setRendering(false);
                sendWS({ type: "RESULT", dataUrl });
              }
            } catch (err) {
              console.error("[KIOSK] EDIT failed:", err);
              setRendering(false);
              sendWS({ type: "ERROR", message: err.message || String(err) });
            }
            break;
          }

          case "RESULT":
            setRendering(false);
            if (msg.dataUrl) setResultUrl(msg.dataUrl);
            break;

          default:
            break;
        }
      };
      wsRef.current = ws;
    } catch (e) {
      console.error("WS connect error", e);
    }
  };

  const sendWS = (obj) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
  };

  const openCamera = async () => {
    if (stream) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      setStream(s);
    } catch (e) {
      console.error("Could not open camera", e);
    }
  };

  const stopCamera = () => {
    try {
      if (videoRef.current) {
        videoRef.current.pause?.();
        videoRef.current.srcObject = null;
      }
      if (stream) stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    } catch {}
  };

  const runCountdown = (secs, onDone) => {
    let v = Math.max(1, Math.floor(secs));
    setCountdown(v);
    const iv = setInterval(() => {
      v -= 1;
      setCountdown(v);
      if (v <= 0) {
        clearInterval(iv);
        onDone?.();
      }
    }, 1000);
  };

  const captureStill = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return "";
    const w = video.videoWidth || 720;
    const h = video.videoHeight || 1280;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/png");
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      <header className="sticky top-0 z-10 backdrop-blur bg-slate-900/50 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Camera className="w-6 h-6" />
          <h1 className="text-lg font-semibold tracking-tight">Vision Kiosk</h1>

          <div className="ml-auto flex items-center gap-2 text-xs">
            <div className="px-2 py-1 rounded border border-white/10 bg-white/5">
              Session: <b>{sessionId || "…"}</b>
            </div>
            <div
              className={`px-2 py-1 rounded border ${
                connected
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <PlugZap className="w-3 h-3 inline -mt-0.5 mr-1" />
              {connected ? "WS connected" : "WS offline"}
            </div>
            <div
              className={`px-2 py-1 rounded border ${
                tabletOnline
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <Activity className="w-3 h-3 inline -mt-0.5 mr-1" />
              Tablet: {tabletOnline ? "online" : "offline"}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pb-16 pt-6 grid gap-6">
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden shadow-xl">
          <div className="p-3 border-b border-white/10 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            <span className="font-medium">Captured</span>
            <span className="ml-auto text-xs opacity-70">
              {stream
                ? "Live preview (awaiting capture…)"
                : showCapturedImage
                ? "Frozen still"
                : "Waiting…"}
            </span>
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

            {!stream && showCapturedImage && capturedUrlRef.current && (
              <img
                src={capturedUrlRef.current}
                alt="Captured"
                className="w-full h-full object-contain"
              />
            )}

            {!stream && !showCapturedImage && (
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

        <div className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden shadow-xl">
          <div className="p-3 border-b border-white/10 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            <span className="font-medium">Styled Result</span>
            <span className="ml-auto text-xs opacity-70">
              {rendering ? "Generating…" : resultUrl ? "Ready" : "Idle"}
            </span>
          </div>

          <div className="relative aspect-[16/9] bg-slate-950 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {rendering ? (
                <motion.div
                  key="anim"
                  initial={{ opacity: 0.0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-0"
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
              ) : (
                <motion.div
                  key="idle"
                  className="text-center px-6 opacity-80 text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  Once the tablet sends a prompt, the neural animation will
                  appear here and the styled image will follow.
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <canvas ref={canvasRef} className="hidden" />
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