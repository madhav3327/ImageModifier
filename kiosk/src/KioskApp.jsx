// KioskApp.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Sparkles, Wand2, ChevronDown } from "lucide-react";
import TitleDisplay from "./components/TitleDisplay";
import ProcessingDisplay from "./components/ProcessingDisplay";

const RAW_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const BACKEND_URL = RAW_BASE.replace(/\/+$/, "");

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

// Example artists
const ARTISTS = [
  {
    key: "vangogh",
    name: "Vincent van Gogh",
    prompt:
      "in the style of Vincent van Gogh: bold impasto brush strokes, swirling skies, vibrant cobalt blue and cadmium yellow, post-Impressionist lighting",
  },
  {
    key: "monet",
    name: "Claude Monet",
    prompt:
      "in the style of Claude Monet: soft impressionist brushwork, broken color, luminous pastel palette, shimmering light reflections",
  },
  {
    key: "picasso",
    name: "Pablo Picasso",
    prompt:
      "in the style of Pablo Picasso: cubist abstraction, fractured planes, bold geometric composition, experimental color blocking",
  },
  {
    key: "davinci",
    name: "Leonardo da Vinci",
    prompt:
      "in the style of Leonardo da Vinci: sfumato, subtle gradations, renaissance lighting, detailed anatomical proportions",
  },
  {
    key: "frida",
    name: "Frida Kahlo",
    prompt:
      "in the style of Frida Kahlo: surreal symbolism, vibrant Mexican folk palette, floral motifs, bold portrait framing",
  },
];

export default function KioskApp() {
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

  const [prompt, setPrompt] = useState(""); // <-- free text stays
  const [artistOpen, setArtistOpen] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState(ARTISTS[0]);

  // attach stream & play
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

  // gesture unlock
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

  // Build final prompt = artist style + user free text
  const builtPrompt = [
    selectedArtist?.prompt?.trim(),
    prompt.trim(),
  ]
    .filter(Boolean)
    .join(", "); // simple join; adjust if you want different formatting

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

  // Display content
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
      <header className="sticky top-0 z-10 backdrop-blur bg-slate-900/50 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Camera className="w-6 h-6" />
          <h1 className="text-lg font-semibold tracking-tight">Comic Generator</h1>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto px-4 pb-16 pt-6 flex flex-col items-center gap-6">
        <TitleDisplay />

        <div className="grid w-full max-w-4xl gap-4 md:grid-cols-[1fr,360px]">
          {/* Display Column */}
          <div className="w-full rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden shadow-xl">
            {/* Artist selector (replaces old header) */}
            <div className="p-3 border-b border-white/10">
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={() => setArtistOpen((s) => !s)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2"
                  aria-haspopup="listbox"
                  aria-expanded={artistOpen}
                >
                  <span className="font-medium">
                    {selectedArtist ? selectedArtist.name : "Choose Artist"}
                  </span>
                  <ChevronDown className="w-4 h-4 opacity-80" />
                </button>

                {/* Dropdown list */}
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
            </div>

            {/* Display area */}
            <div className="relative aspect-[12/16] bg-black flex items-center justify-center">
              {renderContent()}

              {/* Artist tag on RIGHT side */}
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

          {/* Controls Column (free text kept) */}
          <div className="flex flex-col gap-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your comic/edit style… (artist style is added automatically)"
              className="w-full h-36 rounded-xl bg-slate-900/70 border border-white/10 p-3 outline-none"
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={openCamera}
                disabled={hasCamera}
                className="rounded-xl px-4 py-3 bg-white/10 border border-white/10 hover:bg-white/15 disabled:opacity-50"
              >
                Open Camera
              </button>
              <button
                onClick={onClickCapture}
                disabled={!hasCamera}
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

            {/* Small helper showing the final prompt actually sent */}
            <div className="text-xs text-white/60 mt-1 px-1">
              {/* <div className="font-semibold mb-1">Final Prompt (artist + your text):</div> */}
              {/* <div className="rounded-lg border border-white/10 bg-slate-900/50 p-2 break-words">
                {builtPrompt || "— select an artist and/or add text —"}
              </div> */}
            </div>
          </div>
        </div>
      </main>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}