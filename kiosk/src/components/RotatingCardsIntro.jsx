// RotatingCardsIntro.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Props:
 *  - images: string[]
 *  - onGo?: () => void
 *  - ctaLabel?: string
 *  - consentText?: string
 *  - intervalMs?: number
 */
export default function RotatingCardsIntro({
  images = [],
  onGo,
  ctaLabel,
  consentText = `The images generated are by google nano banana and
we will use your images for our other projects.`,
  intervalMs = 2000,
}) {
  const ringRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const [consented, setConsented] = useState(false);

  const cards = useMemo(() => {
    if (images.length) return images.map((src) => ({ type: "img", src }));
    return [
      "radial-gradient(80% 60% at 30% 20%, #7dd3fc, #1e3a8a)",
      "radial-gradient(60% 80% at 70% 30%, #c4b5fd, #4c1d95)",
      "radial-gradient(65% 70% at 40% 40%, #fda4af, #7f1d1d)",
      "radial-gradient(70% 70% at 60% 50%, #86efac, #064e3b)",
      "radial-gradient(75% 75% at 50% 40%, #fde68a, #78350f)",
      "radial-gradient(80% 60% at 40% 60%, #a5f3fc, #164e63)",
      "radial-gradient(60% 80% at 30% 60%, #f0abfc, #701a75)",
      "radial-gradient(80% 80% at 50% 50%, #93c5fd, #1e3a8a)",
    ].map((bg) => ({ type: "bg", bg }));
  }, [images]);

  const N = Math.max(1, cards.length);
  const step = 360 / N;

  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;
    const items = Array.from(ring.children);
    items.forEach((el, i) => {
      el.style.transform = `rotateY(${i * step}deg) translateZ(var(--z-depth))`;
    });
  }, [N, step, cards.length]);

  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;

    let index = 0;
    ring.style.transform =
      "translateZ(-100px) rotateX(-8deg) rotateY(0deg)";
    setFront(index);

    timerRef.current = setInterval(() => {
      index = (index + 1) % N;
      ring.style.transform = `translateZ(-100px) rotateX(-8deg) rotateY(${
        -index * step
      }deg)`;
      setFront(index);
    }, Math.max(500, intervalMs));

    return () => clearInterval(timerRef.current);

    function setFront(idx) {
      const items = Array.from(ring.children);
      items.forEach((el, i) =>
        el.classList.toggle("rcg-front", i === idx)
      );
    }
  }, [N, step, intervalMs]);

  const openCamera = async () => {
    if (onGo) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      const cam = document.querySelector(".rcg-camera");
      if (cam) cam.style.display = "block";
    } catch (err) {
      alert("Could not access camera: " + (err?.message || String(err)));
    }
  };
  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    const cam = document.querySelector(".rcg-camera");
    if (cam) cam.style.display = "none";
  };
  useEffect(() => () => closeCamera(), []);

  const handleCTA = () => {
    if (!consented) return;
    onGo ? onGo() : openCamera();
  };
  const label = ctaLabel || (onGo ? "Let’s go" : "Open Camera");

  return (
    <main className="rcg-app" aria-label="3D card gallery with camera consent">
      {/* Heading + aurora */}
      <header className="rcg-header">
        <h1 className="rcg-title">
          <span>Welcome</span>
          <br />
          <span>to</span>
          <br />
          <span>Art Exhibit</span>
          <div className="aurora" aria-hidden="true">
            <div className="aurora__item" />
            <div className="aurora__item" />
            <div className="aurora__item" />
            <div className="aurora__item" />
          </div>
        </h1>
        <p className="rcg-subtitle">
          Now a days we have camera to capture every beautiful moment but earlier
          we have these beautiful paints which we will recreate using AI today
        </p>
      </header>

      {/* 3D stage */}
      <section className="rcg-stage">
        <div className="rcg-ring" ref={ringRef}>
          {cards.map((c, i) => (
            <div key={i} className="rcg-card">
              <div
                className="rcg-inner"
                style={
                  c.type === "bg" ? { backgroundImage: c.bg } : undefined
                }
              >
                {c.type === "img" && (
                  <img src={c.src} alt={`card ${i + 1}`} loading="eager" />
                )}
                <div className="label" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Controls */}
      <section className="rcg-controls">
        <div className="rcg-cta">
          <button
            className="rcg-btn"
            onClick={handleCTA}
            disabled={!consented}
            aria-disabled={!consented}
          >
            {label}
          </button>
        </div>
        <label className="rcg-consent">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
          />
          <span>
            {consentText.split("\n").map((ln, idx) => (
              <React.Fragment key={idx}>
                {ln}
                <br />
              </React.Fragment>
            ))}
          </span>
        </label>
        <div className="rcg-hint">Check the box to enable “{label}”.</div>
      </section>

      {/* Camera panel (only when onGo not supplied) */}
      {!onGo && (
        <section className="rcg-camera" aria-live="polite">
          <header>
            <strong>Camera Preview</strong>
            <button type="button" onClick={closeCamera} aria-label="Close camera">
              Close
            </button>
          </header>
          <video ref={videoRef} playsInline autoPlay muted />
        </section>
      )}

      <style>{`
:root{
  --bg: #0b0f17;
  --ink: #e8f0ff;
  --muted:#9fb3d9;

  --ring-size: 440px;
  --card-w: 220px;
  --card-h: 300px;
  --z-depth: 380px;
}

/* Layout */
.rcg-app{
  margin:0;
  min-height:100vh;
  background:radial-gradient(1000px 800px at 70% 15%, #14233d 0%, var(--bg) 60%, #070a10 100%);
  color:var(--ink);
  font-family: Inter, system-ui, Segoe UI, Roboto, Arial, sans-serif;
  display:grid;
  grid-template-rows: auto auto auto;
  gap:18px;
  padding:24px;
}

/* Heading + aurora */
.rcg-header{ text-align:center; display:grid; gap:8px; place-items:center; }
.rcg-title{
  position:relative; margin:0; line-height:1.0; letter-spacing:-0.02em;
  font-weight:800; font-size:clamp(45px, 6vw, 56px); padding:8px 12px; overflow:hidden;
}
.rcg-title span{ display:inline-block; }
.rcg-subtitle{
  max-width:860px; margin:0 auto;
  font-size:clamp(14px, 1.8vw, 18px); color:rgba(232,240,255,.85);
}
.aurora{ position:absolute; inset:0; z-index:1; pointer-events:none; mix-blend-mode:darken; }
.aurora__item{
  position:absolute; width:60vw; height:60vw; filter:blur(1rem); mix-blend-mode:overlay;
  border-radius:37% 29% 27% 27% / 28% 25% 41% 37%; opacity:.75;
}
.aurora__item:nth-of-type(1){ background:#00c2ff; top:-50%; animation: aurora-border 6s ease-in-out infinite, aurora-1 12s ease-in-out infinite alternate; }
.aurora__item:nth-of-type(2){ background:#ffc640; right:0; top:0; animation: aurora-border 6s ease-in-out infinite, aurora-2 12s ease-in-out infinite alternate; }
.aurora__item:nth-of-type(3){ background:#33ff8c; left:0; bottom:0; animation: aurora-border 6s ease-in-out infinite, aurora-3 8s ease-in-out infinite alternate; }
.aurora__item:nth-of-type(4){ background:#e54cff; right:0; bottom:-50%; animation: aurora-border 6s ease-in-out infinite, aurora-4 24s ease-in-out infinite alternate; }
@keyframes aurora-1{0%{top:0;right:0;}50%{top:100%;right:75%;}75%{top:100%;right:25%;}100%{top:0;right:0;}}
@keyframes aurora-2{0%{top:-50%;left:0%;}60%{top:100%;left:75%;}85%{top:100%;left:25%;}100%{top:-50%;left:0%;}}
@keyframes aurora-3{0%{bottom:0;left:0;}40%{bottom:100%;left:75%;}65%{bottom:40%;left:50%;}100%{bottom:0;left:0;}}
@keyframes aurora-4{0%{bottom:-50%;right:0;}50%{bottom:0%;right:40%;}90%{bottom:50%;right:25%;}100%{bottom:-50%;right:0;}}
@keyframes aurora-border{
  0%{border-radius:37% 29% 27% 27% / 28% 25% 41% 37%;}
  25%{border-radius:47% 29% 39% 49% / 61% 19% 66% 26%;}
  50%{border-radius:57% 23% 47% 72% / 63% 17% 66% 33%;}
  75%{border-radius:28% 49% 29% 100% / 93% 20% 64% 25%;}
  100%{border-radius:37% 29% 27% 27% / 28% 25% 41% 37%;}
}

/* Stage */
.rcg-stage{
  width:var(--ring-size); height:var(--ring-size);
  perspective:1200px; touch-action:pan-y; justify-self:center;
}
.rcg-ring{
  position:relative; width:100%; height:100%;
  transform-style:preserve-3d;
  transition: transform 1s cubic-bezier(.22,.61,.36,1);
  backface-visibility:hidden; -webkit-backface-visibility:hidden;
}

/* Card placement (outer) */
.rcg-card{
  position:absolute; top:50%; left:50%;
  width:var(--card-w); height:var(--card-h);
  transform-style:preserve-3d;
  translate:-50% -50%;
  will-change:transform;
}

/* Card visuals (inner) */
.rcg-inner{
  position:absolute; inset:0;
  border-radius:18px; overflow:hidden;
  box-shadow:0 20px 50px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.06);
  background:#111825;
  display:grid; place-items:end start;
  transition: transform .25s ease, filter .25s ease, box-shadow .25s ease;
}
.rcg-card.rcg-front .rcg-inner{
  transform: scale(1.06);
  filter: brightness(1) saturate(1.05);
  box-shadow:0 26px 64px rgba(0,0,0,.55), inset 0 0 0 1px rgba(255,255,255,.08);
}

.rcg-inner img{
  position:absolute; inset:0; width:100%; height:100%; object-fit:cover;
  filter:saturate(1.05) contrast(1.05);
  transform: translateZ(1px);
  backface-visibility:hidden; -webkit-backface-visibility:hidden;
}
.rcg-inner .label{
  width:100%; padding:10px 12px; font-weight:600; letter-spacing:.3px;
  background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.0));
  color:var(--ink); text-shadow: 0 1px 0 rgba(0,0,0,.5);
}

/* Controls */
.rcg-controls{
  width:100%; max-width:720px;
  display:grid; gap:12px; justify-items:center; text-align:center; justify-self:center;
}
.rcg-cta{ display:flex; gap:12px; align-items:center; justify-content:center; }
.rcg-btn{
  padding:12px 18px; border:0; border-radius:12px; cursor:pointer;
  background: linear-gradient(180deg, #1f344f, #0e1d33);
  color:var(--ink); font-weight:700; letter-spacing:.3px;
  box-shadow: 0 10px 24px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.08);
  transition: transform .15s ease, box-shadow .15s ease, opacity .2s ease;
}
.rcg-btn:hover{ transform: translateY(-1px); box-shadow: 0 16px 30px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.12); }
.rcg-btn[disabled]{ opacity:.45; cursor:not-allowed; filter:grayscale(.2); box-shadow: inset 0 0 0 1px rgba(255,255,255,.06); }
.rcg-consent{ display:flex; gap:10px; align-items:flex-start; color:var(--muted); font-size:14px; line-height:1.3; max-width:780px; }
.rcg-consent input{ transform: translateY(2px); width:18px; height:18px; }
.rcg-hint{ font-size:12px; color:var(--muted); }

/* Camera panel */
.rcg-camera{
  width:min(720px, 100%); border-radius:16px; overflow:hidden;
  border:1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.04);
  display:none;
}
.rcg-camera header{
  padding:10px 14px; display:flex; justify-content:space-between; align-items:center;
  background: rgba(0,0,0,.25); border-bottom:1px solid rgba(255,255,255,.06);
}
.rcg-camera header button{ background:transparent; border:0; color:var(--ink); font-size:14px; cursor:pointer; opacity:.8; }
.rcg-camera video{ width:100%; height:auto; display:block; background:#000; }

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .rcg-ring{ transition: none; transform: translateZ(-100px) rotateX(-6deg); }
}

/* Responsive */
@media (max-width: 520px){
  :root{ --ring-size: 340px; --card-w: 150px; --card-h: 200px; --z-depth: 300px; }
}
      `}</style>
    </main>
  );
}