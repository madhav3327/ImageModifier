import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Activity,
  PlugZap,
  Image as ImageIcon,
} from "lucide-react";
import TitleDisplay from "./components/TitleDisplay";
import ProcessingDisplay from "./components/ProcessingDisplay";
import PulsingOrb from "./components/PulsingOrb"; 
import FloatingIconsFooter from "./components/FloatingIconsFooter";

const RAW_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const BACKEND_URL = RAW_BASE.replace(/\/+$/, "");
const WS_BASE = BACKEND_URL.replace(/^http/i, "ws");


function CountdownOverlay({ value }) {
  if (!value || value <= 0) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
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
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  }, [stream]);
  const resultUrlRef = useRef(resultUrl);
  useEffect(() => {
    resultUrlRef.current = resultUrl;
  }, [resultUrl]);

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

  useEffect(() => {
    createSession();
    return () => {
      try { wsRef.current?.close(); } catch {}
      try { stopCamera(); } catch {}
    };
  }, []);

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

  const sendWS = (obj) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
  };

  const handleRefineRequest = async (prompt) => {
    // --- FIX: Read the URL from the ref to get the latest value ---
    const currentResultUrl = resultUrlRef.current;
    
    if (!currentResultUrl) {
      console.error("No result image to refine.");
      setRendering(false);
      return;
    }
    
    setRendering(true);
    
    try {
      const imgBlob = await (await fetch(currentResultUrl)).blob();
      const form = new FormData();
      form.append("image_file", imgBlob, "refine.png");
      form.append("prompt", prompt.trim());
      
      const response = await fetch(`${BACKEND_URL}/api/edit`, { method: "POST", body: form });
      if (!response.ok) throw new Error("Backend error during refine");
      
      const blob = await response.blob();
      const newObjectUrl = URL.createObjectURL(blob);
      setResultUrl(newObjectUrl); // This will trigger the useEffect to update the ref
      sendWS({ type: "RESULT", dataUrl: newObjectUrl });
    } catch (err) {
      console.error("REFINE failed:", err);
    } finally {
      setRendering(false);
    }
  };
  const connectWS = (sid) => {
    const ws = new WebSocket(`${WS_BASE}/ws?session=${encodeURIComponent(sid)}&role=kiosk`);
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
          setShowCapturedImage(false);
          setResultUrl("");
          // alert("2")
          setRendering(false);
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
          if (!capturedUrlRef.current) {
            console.error("No captured image available");
            break;
          }
          setRendering(true);
          setResultUrl("");
          // alert("1")
          try {
            const imgBlob = await (await fetch(capturedUrlRef.current)).blob();
            const form = new FormData();
            form.append("image_file", imgBlob, "capture.png");
            form.append("prompt", msg.prompt.trim());
            const response = await fetch(`${BACKEND_URL}/api/edit`, { method: "POST", body: form });
            if (!response.ok) throw new Error("Backend error");
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            console.log(objectUrl)
            setResultUrl(objectUrl);
           
            sendWS({ type: "RESULT", dataUrl: objectUrl });
          } catch (err) {
            console.error("EDIT failed:", err);
            setRendering(false);
          }
          break;
        }
        case "REFINE": {
          await handleRefineRequest(msg.prompt);
          break;
        }
        case "RESULT":
          if (msg.dataUrl) setResultUrl(msg.dataUrl);
          break;
        default:
          break;
      }
    };
    wsRef.current = ws;
  };

  const openCamera = async () => {
    if (stream) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user",
          aspectRatio: 12 / 16,
        },
        audio: false,
      });
      setStream(s);
    } catch (e) {
      console.error("Could not open camera", e);
    }
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

  const renderContent = () => {
    if (rendering) {
      return (
        <ProcessingDisplay
          capturedImageUrl={capturedUrlRef.current}
          resultUrl={resultUrl}
          onAnimationComplete={() => setRendering(false)}
        />
      );
    }
    if (resultUrl && !rendering) {
      return <img src={resultUrl} alt="Result" className="w-full h-full object-cover" />;
    }
    if (stream) {
      return <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover" />;
    }
    if (showCapturedImage && capturedUrlRef.current) {
      return <img src={capturedUrlRef.current} alt="Captured" className="w-full h-full object-cover" />;
    }
    return (
    <motion.div
      key="idle-animation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full"
    >
      <PulsingOrb />
    </motion.div>
  );
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
            <div className={`px-2 py-1 rounded border ${connected ? "border-emerald-500 bg-emerald-500/10" : "border-white/10 bg-white/5"}`}>
              <PlugZap className="w-3 h-3 inline -mt-0.5 mr-1" />
              {connected ? "WS connected" : "WS offline"}
            </div>
            <div className={`px-2 py-1 rounded border ${tabletOnline ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 bg-white/5"}`}>
              <Activity className="w-3 h-3 inline -mt-0.5 mr-1" />
              Tablet: {tabletOnline ? "online" : "offline"}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto px-4 pb-16 pt-6 flex flex-col items-center gap-6">
        <TitleDisplay />
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden shadow-xl">
          <div className="p-3 border-b border-white/10 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            <span className="font-medium">Kiosk Display</span>
          </div>
          <div className="relative aspect-[12/16] bg-black flex items-center justify-center">
            {renderContent()}
            <AnimatePresence>
              {countdown > 0 && <CountdownOverlay value={countdown} />}
            </AnimatePresence>
          </div>
        </div>
        <FloatingIconsFooter/>
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