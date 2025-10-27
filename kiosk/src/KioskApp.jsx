// KioskApp.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Sparkles, Wand2, ChevronDown } from "lucide-react";
import TitleDisplay from "./components/TitleDisplay";
import ProcessingDisplay from "./components/ProcessingDisplay";

const RAW_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const BACKEND_URL = RAW_BASE.replace(/\/+$/, "");

// --- Home Button (inline; remove if you import it from App.jsx) ---
function HomeButton({ onHome }) {
  return (
    <button
      onClick={onHome}
      className="fixed top-3 right-3 z-50 flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl border border-white/20 backdrop-blur-md shadow-md transition"
      title="Go to Home"
      aria-label="Go to Home"
    >
      🏠 <span className="hidden sm:inline">Home</span>
    </button>
  );
}

// --- Countdown Overlay ---
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

// Artists list
const ARTISTS = [
  { key: "picasso",  name: "Pablo Picasso",  prompt: "in the style of Pablo Picasso: cubist abstraction, fractured planes, bold geometric composition, experimental color blocking" },
  { key: "vangogh",  name: "Vincent van Gogh",  prompt: "in the style of Vincent van Gogh: bold impasto brush strokes, swirling skies, vibrant cobalt blue and cadmium yellow, post-Impressionist lighting" },
  { key: "raja",     name: "Raja Ravi Varma",  prompt: "in the style of Raja Ravi Varma: classical Indian portraiture, rich color palettes, detailed drapery, expressive realism" },
  { key: "frida",    name: "Frida Kahlo",  prompt: "in the style of Frida Kahlo: surreal symbolism, vibrant Mexican folk palette, floral motifs, bold portrait framing" },
  { key: "claude",   name: "Claude Monet",  prompt: "in the style of Claude Monet: soft impressionist brushwork, broken color, luminous pastel palette, shimmering light reflections" },
  { key: "leonardo", name: "Leonardo da Vinci",  prompt: "in the style of Leonardo da Vinci: sfumato, subtle gradations, renaissance lighting, detailed anatomical proportions" },
];

function BackButton({ onBack }) {
  return (
    <button
      onClick={onBack}
      className="fixed top-4 left-4 z-50 text-white text-3xl sm:text-4xl font-light transition-transform hover:scale-110"
      title="Back"
      aria-label="Go Back"
    >
      ←
    </button>
  );
}

export default function KioskApp({ initialStyle, onBack, onHome }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const capturedUrlRef = useRef(null);
  const currentImageRef = useRef(null);

  const openingRef = useRef(false);
  const needsGestureRef = useRef(false);

  const [stream, setStream] = useState(null);
  const [showCapturedImage, setShowCapturedImage] = useState(false);
  const [resultUrl, setResultUrl] = useState("");
  const [rendering, setRendering] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [prompt, setPrompt] = useState("");
  const [artistOpen, setArtistOpen] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState(ARTISTS[0]);
  const [mode, setMode] = useState("portrait"); // portrait | storyline

  // ✅ Preselect artist + mode passed from intro
  useEffect(() => {
    if (!initialStyle) return;
    const byIndex =
      Number.isInteger(initialStyle.index) && ARTISTS[initialStyle.index]
        ? ARTISTS[initialStyle.index]
        : null;

    const byName =
      ARTISTS.find(
        (a) =>
          a.name.toLowerCase() === String(initialStyle.name || "").toLowerCase()
      ) ||
      ARTISTS.find((a) =>
        String(initialStyle.name || "")
          .toLowerCase()
          .startsWith(a.name.toLowerCase().slice(0, 5))
      );

    const chosen = byIndex || byName || ARTISTS[0];
    setSelectedArtist(chosen);
    setMode(initialStyle.action === "storyline" ? "storyline" : "portrait");
  }, [initialStyle]);

  // Camera stream management
  useEffect(() => {
    if (!stream || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = stream;
    video.setAttribute("playsinline", "");
    video.muted = true;

    const start = async () => {
      if (video.readyState < 1) {
        await new Promise((resolve) => {
          const onLoaded = () => {
            video.removeEventListener("loadedmetadata", onLoaded);
            resolve();
          };
          video.addEventListener("loadedmetadata", onLoaded, { once: true });
        });
      }
      try {
        await video.play();
        needsGestureRef.current = false;
      } catch {
        needsGestureRef.current = true;
      }
    };
    start();
  }, [stream]);

  useEffect(() => {
    const handler = async () => {
      if (needsGestureRef.current && videoRef.current) {
        try {
          await videoRef.current.play();
          needsGestureRef.current = false;
        } catch {}
      }
    };
    window.addEventListener("pointerdown", handler, { passive: true });
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  const stopCamera = useCallback(() => {
    try {
      if (videoRef.current) {
        videoRef.current.pause?.();
        videoRef.current.srcObject = null;
      }
      if (stream) stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    } catch {}
    openingRef.current = false;
  }, [stream]);

  const openCamera = useCallback(async () => {
    if (openingRef.current || stream) return;
    openingRef.current = true;
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", aspectRatio: 12 / 16 },
        audio: false,
      });
      setShowCapturedImage(false);
      setStream(s);
    } catch (e) {
      console.error("Could not open camera", e);
    } finally {
      openingRef.current = false;
    }
  }, [stream]);

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

  const setNewResult = (newUrl) => {
    if (currentImageRef.current && currentImageRef.current.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(currentImageRef.current);
      } catch {}
    }
    currentImageRef.current = newUrl;
    setResultUrl(newUrl);
  };

  const builtPrompt = [selectedArtist?.prompt?.trim(), prompt.trim()]
    .filter(Boolean)
    .join(", ");

  const handleGenerate = async () => {
    const trimmed = (builtPrompt || "").trim();
    if (!trimmed) return console.error("Prompt required (select an artist or add text)");

    const src = capturedUrlRef.current || currentImageRef.current || resultUrl;
    if (!src) return console.error("No captured image to generate from");

    setRendering(true);
    try {
      const imgBlob = await (await fetch(src)).blob();
      const form = new FormData();
      form.append("image_file", imgBlob, "capture.png");
      form.append("prompt", trimmed);
      form.append("mode", mode);

      const response = await fetch(`${BACKEND_URL}/api/edit`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) throw new Error(`Backend error (${response.status})`);

      const outBlob = await response.blob();
      const newObjectUrl = URL.createObjectURL(outBlob);
      setNewResult(newObjectUrl);
    } catch (e) {
      console.error("GENERATE failed:", e);
    } finally {
      setRendering(false);
    }
  };

  const handleRefine = async () => {
    const trimmed = (builtPrompt || "").trim();
    if (!trimmed) return console.error("Prompt required (select an artist or add text)");

    const src = currentImageRef.current || resultUrl || capturedUrlRef.current;
    if (!src) return console.error("No image to refine");

    setRendering(true);
    try {
      const imgBlob = await (await fetch(src)).blob();
      const form = new FormData();
      form.append("image_file", imgBlob, "refine.png");
      form.append("prompt", trimmed);
      form.append("mode", mode);

      const response = await fetch(`${BACKEND_URL}/api/edit`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) throw new Error(`Backend error during refine (${response.status})`);

      const outBlob = await response.blob();
      const newObjectUrl = URL.createObjectURL(outBlob);
      setNewResult(newObjectUrl);
      setShowCapturedImage(false);
    } catch (e) {
      console.error("REFINE failed:", e);
    } finally {
      setRendering(false);
    }
  };

  const onClickCapture = () => {
    runCountdown(3, async () => {
      const dataUrl = await captureStill();
      capturedUrlRef.current = dataUrl;
      currentImageRef.current = dataUrl;
      setShowCapturedImage(true);
      stopCamera();
    });
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
      <div className="text-center px-6 opacity-80">
        <p className="text-sm">Tap “Open Camera” to begin.</p>
      </div>
    );
  };

  const hasCamera = !!stream;
  const hasCaptured = !!capturedUrlRef.current;
  const hasResult = !!resultUrl;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      {/* Top bar */}
      <header className="sticky top-0 z-10 backdrop-blur bg-slate-900/50 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          {/* Inline back arrow */}
          <button
            onClick={onBack}
            className="text-white text-2xl sm:text-3xl font-light hover:scale-110 transition-transform"
            title="Back"
            aria-label="Go Back"
          >
            ←
          </button>

          <Camera className="w-6 h-6 text-white/90" />

          <h1 className="text-lg font-semibold tracking-tight text-white">
            {mode === "storyline" ? "Storyline Generator" : "Portrait Generator"}
          </h1>
        </div>

        {/* Top-right Home (fixed so it always stays visible) */}
        <HomeButton onHome={onHome} />
      </header>

      <main className="max-w-6xl w-full mx-auto px-4 pb-16 pt-6 flex flex-col items-center gap-6">
        <TitleDisplay />

        <div className="grid w-full max-w-4xl gap-4 md:grid-cols-[1fr,360px]">
          {/* Display Column */}
          <div className="w-full rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden shadow-xl">
            {/* Artist + Mode selector */}
            <div className="p-3 border-b border-white/10 flex items-center justify-between gap-3">
              {/* Artist Dropdown */}
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={() => setArtistOpen((s) => !s)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2"
                  aria-haspopup="listbox"
                  aria-expanded={artistOpen}
                >
                  <span className="font-medium">Choose Artist</span>
                  <ChevronDown className="w-4 h-4 opacity-80" />
                </button>

                <AnimatePresence>
                  {artistOpen && (
                    <motion.ul
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      role="listbox"
                      tabIndex={-1}
                      className="absolute z-20 mt-2 w-64 max-h-64 overflow-auto rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur shadow-xl"
                    >
                      {ARTISTS.map((a) => (
                        <li key={a.key}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedArtist(a);
                              setArtistOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-white/10"
                            role="option"
                            aria-selected={selectedArtist?.key === a.key}
                          >
                            {a.name}
                          </button>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>

              {/* Animated Mode Toggle */}
              <div className="relative w-40 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between cursor-pointer overflow-hidden">
                <motion.div
                  layout
                  className="absolute top-0 bottom-0 rounded-xl bg-indigo-500/70"
                  style={{ left: mode === "portrait" ? "0%" : "50%", width: "50%" }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                />
                <button
                  onClick={() => setMode("portrait")}
                  className={`relative z-10 flex-1 h-full flex items-center justify-center text-sm font-medium transition-colors ${
                    mode === "portrait" ? "text-white" : "text-slate-300"
                  }`}
                >
                  Portrait
                </button>
                <button
                  onClick={() => setMode("storyline")}
                  className={`relative z-10 flex-1 h-full flex items-center justify-center text-sm font-medium transition-colors ${
                    mode === "storyline" ? "text-white" : "text-slate-300"
                  }`}
                >
                  Storyline
                </button>
              </div>
            </div>

            {/* Display Area */}
            <div className="relative aspect-[12/16] bg-black flex items-center justify-center">
              {renderContent()}

              {/* Artist tag */}
              {selectedArtist && (
                <div className="absolute right-3 top-3 z-10">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/15 text-xs font-medium">
                    <Sparkles className="w-3.5 h-3.5" />
                    {selectedArtist.name}
                  </span>
                </div>
              )}

              <AnimatePresence>
                {countdown > 0 && <CountdownOverlay value={countdown} />}
              </AnimatePresence>
            </div>
          </div>

          {/* Controls Column */}
          <div className="flex flex-col gap-3">
            {/* Show text box only for storyline mode */}
            <AnimatePresence mode="wait">
              {mode === "storyline" && (
                <motion.textarea
                  key="storyline-box"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your storyline… (artist style added automatically)"
                  className="w-full h-36 rounded-xl bg-slate-900/70 border border-white/10 p-3 outline-none"
                />
              )}
            </AnimatePresence>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={openCamera}
                disabled={!!stream}
                className="rounded-xl px-4 py-3 bg-white/10 border border-white/10 hover:bg-white/15 disabled:opacity-50"
              >
                Open Camera
              </button>
              <button
                onClick={onClickCapture}
                disabled={!stream}
                className="rounded-xl px-4 py-3 bg-white/10 border border-white/10 hover:bg-white/15 disabled:opacity-50"
              >
                Capture
              </button>
            </div>

            <button
              onClick={handleGenerate}
              disabled={(!hasCaptured && !hasResult) || (!builtPrompt && !prompt.trim()) || rendering}
              className="rounded-xl px-4 py-3 bg-indigo-500/90 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 disabled:opacity-60"
              title={builtPrompt ? builtPrompt : "Select an artist or type a prompt"}
            >
              <Sparkles className="w-4 h-4" /> Generate
            </button>

            <button
              onClick={handleRefine}
              disabled={!hasResult || (!builtPrompt && !prompt.trim()) || rendering}
              className="rounded-xl px-4 py-3 bg-emerald-500/90 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 disabled:opacity-60"
              title={builtPrompt ? builtPrompt : "Select an artist or type a prompt"}
            >
              <Wand2 className="w-4 h-4" /> Refine
            </button>

            <button
              onClick={() => {
                setShowCapturedImage(false);
                openCamera();
              }}
              className="rounded-xl px-4 py-3 bg-white/10 border border-white/10 hover:bg-white/15"
            >
              New Capture
            </button>
          </div>
        </div>
      </main>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}