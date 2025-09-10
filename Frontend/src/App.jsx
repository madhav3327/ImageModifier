import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Aperture, Image as ImageIcon, Wand2, Send, RefreshCcw, X, Settings2 } from "lucide-react";

// === Vision Playground (Frontend) ===
// - Side-by-side images (left: camera capture, right: generated/placeholder)
// - Prompt + model controls + Submit moved BELOW the images
// - Always sends selfie to backend /api/edit (no API keys in UI)

// Use env in production, fall back to local for dev
const BACKEND_URL = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const SUGGESTED_PROMPTS = [
  "Convert my image to a cartoon",
  "Apply police uniform",
  "Make me look like Batman",
  "Studio portrait color grade",
  "Pop-art comic style",
];

const MODELS = [
  { id: "gpt", label: "GPT" },
  { id: "gemini", label: "Gemini" },
];

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [isOpening, setIsOpening] = useState(false);
  const [captured, setCaptured] = useState(null); // dataURL
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt");
  const [result, setResult] = useState(null); // { imageDataUrl, provider }
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stop stream on unmount
  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    if (isOpening) return;
    setError("");
    setIsOpening(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      setStream(s);
      setHasPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
    } catch (e) {
      setHasPermission(false);
      setError("Could not access camera. Check permissions and device settings.");
    } finally {
      setIsOpening(false);
    }
  };

  const stopCamera = () => {
    try {
      if (videoRef.current) {
        videoRef.current.pause?.();
        videoRef.current.srcObject = null;
      }
      if (stream) stream.getTracks().forEach((t) => t.stop());
    } finally {
      setStream(null);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 720;
    const h = video.videoHeight || 1280;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/png");
    setCaptured(dataUrl);
    stopCamera();
  };

  const retake = () => {
    setCaptured(null);
    startCamera();
  };

  const useSuggestion = (text) => setPrompt(text);

  const handleSubmit = async () => {
    setError("");
    setResult(null);

    if (!captured) {
      setError("Please take a selfie first.");
      return;
    }

    try {
      setIsSubmitting(true);
      const r = await fetch(`${BACKEND_URL}/api/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedModel, // "gpt" | "gemini"
          prompt,
          image_data_url: captured, // ALWAYS send the selfie
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json(); // { mime, image_b64 }
      setResult({ provider: selectedModel, imageDataUrl: `data:${j.mime};base64,${j.image_b64}` });
    } catch (e) {
      const msg = typeof e === "string" ? e : (e?.message || String(e));
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

return (
  <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
    {/* Header with model selector moved here */}
    <header className="sticky top-0 z-10 backdrop-blur bg-slate-900/50 border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3">
        <Camera className="w-6 h-6" />
        <h1 className="text-lg font-semibold tracking-tight">Vision Playground</h1>
        <div className="ml-auto flex items-center gap-2">
          {/* Model buttons in navbar */}
          {[{ id: "gpt", label: "GPT" }, { id: "gemini", label: "Gemini" }].map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedModel(m.id)}
              className={`px-3 py-1.5 text-sm rounded-xl border transition ${
                selectedModel === m.id
                  ? "bg-emerald-600/80 border-emerald-500"
                  : "bg-slate-800/70 border-white/10 hover:border-white/20"
              }`}
              title={`Use ${m.label}`}
            >
              {m.label}
            </button>
          ))}
          <Settings2 className="w-5 h-5 opacity-70" />
        </div>
      </div>
    </header>

    <main className="max-w-6xl mx-auto px-4 pb-16 pt-6 grid gap-6">
      {/* Row 1: Side-by-side images */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Camera Card */}
        <motion.div
          layout
          className="rounded-2xl border border-white/10 bg-slate-900/50 shadow-xl overflow-hidden"
        >
          <div className="p-4 flex items-center gap-2 border-b border-white/10">
            <Aperture className="w-5 h-5" />
            <span className="font-medium">Camera</span>
            <div className="ml-auto flex items-center gap-2">
              {stream ? (
                <button
                  onClick={stopCamera}
                  className="px-3 py-1.5 text-sm rounded-xl bg-red-600/80 hover:bg-red-600 transition"
                >
                  Stop
                </button>
              ) : (
                <button
                  onClick={startCamera}
                  className="px-3 py-1.5 text-sm rounded-xl bg-emerald-600/80 hover:bg-emerald-600 transition"
                  disabled={isOpening}
                >
                  {isOpening ? "Opening…" : "Open Camera"}
                </button>
              )}
            </div>
          </div>

          <div className="relative bg-black h-[300px] md:h-[340px] lg:h-[380px] rounded-b-2xl">
            {!captured ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  autoPlay
                />
                {!stream && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center opacity-80 px-6">
                      <ImageIcon className="w-10 h-10 mx-auto mb-2" />
                      <p className="text-sm">
                        Tap “Open Camera” to start a live preview, then hit the
                        shutter to capture.
                      </p>
                      {hasPermission === false && (
                        <p className="text-xs text-red-300 mt-2">
                          Permission denied. Enable camera access in your browser
                          settings.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <img
                src={captured}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            )}

            {/* Shutter / Retake overlay */}
            <div className="absolute inset-x-0 bottom-0 p-3 flex items-center justify-center gap-3 bg-gradient-to-t from-black/70 to-transparent">
              {!captured ? (
                <button
                  onClick={capturePhoto}
                  className="rounded-full p-3 bg-white/90 hover:bg-white text-black shadow-lg"
                  title="Capture"
                  disabled={!stream}
                >
                  <Wand2 className="w-5 h-5" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={retake}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-900 hover:bg-white"
                  >
                    <RefreshCcw className="w-4 h-4 inline -mt-0.5 mr-1" /> Retake
                  </button>
                  <button
                    onClick={() => setCaptured(null)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10"
                  >
                    <X className="w-4 h-4 inline -mt-0.5 mr-1" /> Clear
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Result Card (placeholder when empty) */}
        <motion.div
          layout
          className="rounded-2xl border border-white/10 bg-slate-900/50 shadow-xl overflow-hidden"
        >
          <div className="p-4 border-b border-white/10 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            <span className="font-medium">Result</span>
          </div>
          <div className="relative bg-slate-950 h-[300px] md:h-[340px] lg:h-[380px] flex items-center justify-center rounded-b-2xl">
            {result?.imageDataUrl ? (
              <img
                src={result.imageDataUrl}
                alt="Edited"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center px-6 opacity-80">
                <p className="text-sm">
                  Your customized image will appear here.
                </p>
                <p className="text-xs mt-1">
                  Capture a selfie on the left, write a prompt below, and press
                  Submit.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Controls under images */}
      <div className="grid gap-6">
        {/* Prompt */}
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
            <label className="block text-sm mb-2 opacity-80">
              Describe the edit you want
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Apply police uniform with badge; keep glasses; match lighting"
              className="w-full min-h-[100px] rounded-xl bg-slate-800/80 border border-white/10 p-3 outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={handleSubmit}
                className="px-4 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 transition font-medium disabled:opacity-50"
                disabled={isSubmitting || !captured}
                title={`Submit with ${selectedModel.toUpperCase()}`}
              >
                Submit
              </button>
              <button
                onClick={() => {
                  setPrompt("");
                  setCaptured(null);
                  setResult(null);
                }}
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
      </div>
    </main>

    <canvas ref={canvasRef} className="hidden" />

    <footer className="max-w-6xl mx-auto px-4 pb-6 text-center opacity-60 text-xs">
      Built with getUserMedia • Images are sent to your backend only for each
      request (never stored).
    </footer>
  </div>
);
}
