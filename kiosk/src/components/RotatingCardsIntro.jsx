// RotatingCardsIntro.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

export default function RotatingCardsIntro({
  images = [],
  intervalMs = 10000,
  videoFor,
  onStoryline,
  onPortrait,
}) {
  const ringRef = useRef(null);

  const [activeIdx, setActiveIdx] = useState(null); // overlay index (null = closed)
  const [frontIdx, setFrontIdx] = useState(0);      // cosmetic rotation index
  const [spinning, setSpinning] = useState(false);
  const overlayOpen = activeIdx !== null;

  const cards = useMemo(() => {
    if (images.length) return images.map((src) => ({ type: "img", src }));
    return DEFAULT_BACKGROUNDS.map((bg) => ({ type: "bg", bg }));
  }, [images]);

  const N = Math.max(1, cards.length);
  const step = 360 / N;

  // Position cards around the ring once
  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;
    const items = Array.from(ring.children);
    items.forEach((el, i) => {
      el.style.transform = `rotateY(${i * step}deg) translateZ(var(--z-depth))`;
      el.style.pointerEvents = "auto";
    });
  }, [step, N, cards.length]);

  // Auto-rotate (does NOT disable clicks)
  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;

    let index = 0;
    ring.style.transform = "translateZ(-100px) rotateX(-8deg) rotateY(0deg)";
    markFront(index);

    const id = setInterval(() => {
      if (overlayOpen) return; // pause while overlay is up
      index = (index + 1) % N;
      ring.style.transform =
        `translateZ(-100px) rotateX(-8deg) rotateY(${-index * step}deg)`;
      markFront(index);
    }, Math.max(500, intervalMs));

    return () => clearInterval(id);

    function markFront(idx) {
      const items = Array.from(ring.children);
      items.forEach((el, i) => {
        const isFront = i === idx;
        el.classList.toggle("rcg-front", isFront);
      });
      setFrontIdx(idx);
    }
  }, [N, step, intervalMs, overlayOpen]);

  // Rotate helper (used by buttons and card clicks)
  const rotateToIndex = (idx) => {
    const ring = ringRef.current;
    if (!ring) return;
    setSpinning(true);
    setFrontIdx(idx);
    ring.style.transition = "transform 500ms cubic-bezier(.22,.61,.36,1)";
    requestAnimationFrame(() => {
      ring.style.transform =
        `translateZ(-100px) rotateX(-8deg) rotateY(${-idx * step}deg)`;
    });
    setTimeout(() => {
      ring.style.transition = "";
      setSpinning(false);
    }, 520);
  };

  const goPrev = () => rotateToIndex((frontIdx - 1 + N) % N);
  const goNext = () => rotateToIndex((frontIdx + 1) % N);

  // Clicking ANY card: rotate to that card (cosmetic), then open overlay.
  const focusCard = (idx) => {
    const ring = ringRef.current;
    if (!ring) return;
    setSpinning(true);
    setFrontIdx(idx);
    ring.style.transition = "transform 600ms cubic-bezier(.22,.61,.36,1)";
    requestAnimationFrame(() => {
      ring.style.transform =
        `translateZ(-100px) rotateX(-8deg) rotateY(${-idx * step}deg)`;
    });
    setTimeout(() => {
      ring.style.transition = "";
      setSpinning(false);
      setActiveIdx(idx);
    }, 620);
  };

  const playFront = () => setActiveIdx(frontIdx);

  const getStyleName = (idx) => {
    const c = cards[idx];
    if (!c) return `Style ${idx + 1}`;
    if (c.type === "img" && typeof c.src === "string") {
      const base = c.src.split("/").pop() || `style-${idx + 1}`;
      return humanize(base.replace(/\.[a-z0-9]+$/i, ""));
    }
    return `Style ${idx + 1}`;
  };

  const handleStoryline = () => {
    if (activeIdx == null) return;
    const payload = { index: activeIdx, name: getStyleName(activeIdx) };
    onStoryline ? onStoryline(payload) : alert(`Storyline with: ${payload.name}`);
  };

  const handlePortrait = () => {
    if (activeIdx == null) return;
    const payload = { index: activeIdx, name: getStyleName(activeIdx) };
    onPortrait ? onPortrait(payload) : alert(`Portrait with: ${payload.name}`);
  };

  const resolvedVideo =
    activeIdx != null && typeof videoFor === "function" ? videoFor(activeIdx) : null;

  // Lock background scroll while overlay is open
  useEffect(() => {
    if (!overlayOpen) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => (document.documentElement.style.overflow = prev);
  }, [overlayOpen]);

  return (
    <main className="rcg-app" aria-label="3D card gallery">
      <header className="rcg-header">
        <h1 className="rcg-title">
          <span>Welcome</span><br />
          <span>to</span><br />
          <span>Art Exhibit</span>
          <div className="aurora" aria-hidden="true">
            <div className="aurora__item" />
            <div className="aurora__item" />
            <div className="aurora__item" />
            <div className="aurora__item" />
          </div>
        </h1>
        <p className="rcg-subtitle">
          Discover different artists and choose a painting style to transform your portrait or story into art.
        </p>
      </header>

      <section className="rcg-stage" aria-label="rotating gallery">
        <div className="rcg-ring" ref={ringRef}>
          {cards.map((c, i) => (
            <button
              key={i}
              type="button"
              className="rcg-card"
              aria-label={`Open ${getStyleName(i)} preview`}
              onClick={() => focusCard(i)}
            >
              <div
                className="rcg-inner"
                style={c.type === "bg" ? { backgroundImage: c.bg } : undefined}
              >
                {c.type === "img" && (
                  <img src={c.src} alt={`card ${i + 1}`} loading="eager" />
                )}
                <div className="label">{getStyleName(i)}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Controls centered below the ring */}
        <div className="rcg-controls" aria-label="carousel controls">
          <button
            className="rcg-ctrl rcg-ctrl--icon"
            onClick={goPrev}
            aria-label="Previous"
            disabled={spinning}
          >
            ‹
          </button>
          <button
            className="rcg-ctrl rcg-ctrl--play"
            onClick={playFront}
            aria-label={`Play ${getStyleName(frontIdx)} video`}
            disabled={spinning}
            title={getStyleName(frontIdx)}
          >
            ▶ Play
          </button>
          <button
            className="rcg-ctrl rcg-ctrl--icon"
            onClick={goNext}
            aria-label="Next"
            disabled={spinning}
          >
            ›
          </button>
        </div>
      </section>

      {overlayOpen && (
        <div
          className="rcg-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`${getStyleName(activeIdx)} preview`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveIdx(null);
          }}
        >
          <div className="rcg-overlay__panel">
            <header className="rcg-overlay__head">
              <div className="rcg-overlay__title">{getStyleName(activeIdx)}</div>
              <button
                className="rcg-overlay__close"
                onClick={() => setActiveIdx(null)}
                aria-label="Close preview"
              >
                ✕
              </button>
            </header>

            <div className="rcg-overlay__media">
  {resolvedVideo ? (
    <>
      <video
        src={resolvedVideo}
        className="rcg-overlay__video"
        autoPlay
        
        playsInline
        loop
      />
      {/* <div className="rcg-video-caption">{getStyleName(activeIdx)}</div> */}
    </>
  ) : (
    <div className="rcg-overlay__placeholder">
      <div className="rcg-overlay__pulse" />
      <span>No video mapped for this style.</span>
    </div>
  )}
</div>

            <div className="rcg-overlay__actions">
              <button className="rcg-btn" onClick={handleStoryline}>Storyline in this style</button>
              <button className="rcg-btn" onClick={handlePortrait}>Portrait in this style</button>
            </div>
          </div>
        </div>
      )}

      <style>{CSS}</style>
    </main>
  );
}

/* ---------------- helpers ---------------- */

const DEFAULT_BACKGROUNDS = [
  "radial-gradient(80% 60% at 30% 20%, #7dd3fc, #1e3a8a)",
  "radial-gradient(60% 80% at 70% 30%, #c4b5fd, #4c1d95)",
  "radial-gradient(65% 70% at 40% 40%, #fda4af, #7f1d1d)",
  "radial-gradient(70% 70% at 60% 50%, #86efac, #064e3b)",
  "radial-gradient(75% 75% at 50% 40%, #fde68a, #78350f)",
  "radial-gradient(80% 60% at 40% 60%, #a5f3fc, #164e3c)",
  "radial-gradient(60% 80% at 30% 60%, #f0abfc, #701a75)",
  "radial-gradient(80% 80% at 50% 50%, #93c5fd, #1e3a8a)",
];

function humanize(s) {
  return s
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

/* ---------------- CSS ---------------- */

const CSS = `

/* On-video artist name badge */
.rcg-video-caption{
  position:absolute;
  left:12px; bottom:12px;
  padding:8px 12px;
  border-radius:10px;
  font-weight:800; letter-spacing:.2px;
  color:var(--ink);
  background:rgba(0,0,0,.45);
  border:1px solid rgba(255,255,255,.14);
  backdrop-filter: blur(6px);
  pointer-events:none;
  user-select:none;
}
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
  grid-template-rows: auto auto 1fr;
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

/* Stage */
.rcg-stage{
  width:var(--ring-size); height:var(--ring-size);
  perspective:1200px; touch-action:pan-y; justify-self:center;
  position:relative; display:flex; align-items:center; justify-content:center;
}

/* Controls centered under the ring */
.rcg-controls{
  position:absolute; bottom:-52px; left:50%; transform:translateX(-50%);
  display:flex; gap:10px; align-items:center; z-index:35;
}
.rcg-ctrl{
  border:1px solid rgba(255,255,255,.18);
  background:rgba(0,0,0,.28);
  color:var(--ink);
  padding:10px 16px; border-radius:12px;
  font-weight:700; letter-spacing:.2px;
  cursor:pointer; backdrop-filter:blur(6px);
  transition: transform .15s ease, background .15s ease, box-shadow .15s ease, opacity .15s ease;
}
.rcg-ctrl:hover{ transform:translateY(-2px); background: rgba(255,255,255,.12); box-shadow:0 10px 30px rgba(0,0,0,.35); }
.rcg-ctrl:disabled{ opacity:.55; cursor:not-allowed; }
.rcg-ctrl--icon{ width:44px; height:44px; padding:0; border-radius:50%; font-size:24px; line-height:1; display:grid; place-items:center; }
.rcg-ctrl--play{ padding:10px 18px; }

/* Ring */
.rcg-ring{
  position:relative; width:100%; height:100%;
  transform-style:preserve-3d;
  transition: transform 1s cubic-bezier(.22,.61,.36,1);
  backface-visibility:hidden; -webkit-backface-visibility:hidden;
}

/* Card (button) */
.rcg-card{
  position:absolute; top:50%; left:50%;
  width:var(--card-w); height:var(--card-h);
  transform-style:preserve-3d;
  translate:-50% -50%;
  will-change:transform;
  padding:0; border:0; background:none; cursor:pointer;
  pointer-events:auto;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
}

/* Make only card visuals ignore pointer events (so the button gets clicks) */
.rcg-inner, .rcg-inner *{ pointer-events:none; }

/* Card visuals */
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
  width:100%; padding:10px 12px; font-weight:700; letter-spacing:.3px;
  background: linear-gradient(360deg, rgba(0,0,0,.0), rgba(0,0,0,.35));
  color:var(--ink); text-shadow: 0 1px 0 rgba(0,0,0,.6);
}

/* Overlay */
.rcg-overlay{
  position:fixed; inset:0; z-index:60;
  background: rgba(0,0,0,.65);
  display:flex; align-items:center; justify-content:center;
  padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  backdrop-filter: blur(6px);
}
.rcg-overlay__panel{
  width:min(1100px, 100%);
  border-radius:18px; overflow:hidden;
  border:1px solid rgba(255,255,255,.12);
  background: rgba(9,14,22,.92);
  box-shadow: 0 40px 120px rgba(0,0,0,.6);
  display:grid; grid-template-rows:auto 1fr auto;
}
.rcg-overlay__head{
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  padding:14px 16px; border-bottom:1px solid rgba(255,255,255,.08);
  background:linear-gradient(360deg, rgba(255,255,255,.05), rgba(255,255,255,0));
}
.rcg-overlay__title{ font-weight:800; letter-spacing:.2px; color:var(--ink); font-size: clamp(16px, 2.4vw, 22px); }
.rcg-overlay__close{ border:0; background:transparent; color:var(--ink); opacity:.8; cursor:pointer; font-size:18px; }

.rcg-overlay__media{ position:relative; min-height: 40vh; display:grid; place-items:center; background:#000; }
.rcg-overlay__video{ width:100%; height:auto; max-height:70vh; display:block; }

.rcg-overlay__actions{
  display:flex; flex-wrap:wrap; gap:10px; justify-content:flex-end;
  padding:12px 14px; border-top:1px solid rgba(255,255,255,.08);
  background:linear-gradient(0deg, rgba(255,255,255,.05), rgba(255,255,255,0));
}

.rcg-btn {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: var(--ink);
  backdrop-filter: blur(8px);
  font-weight: 600;
  letter-spacing: 0.4px;
  border-radius: 14px;
  padding: 10px 20px;
  transition: all 0.3s ease;
  box-shadow: 0 0 15px rgba(255,255,255,0.08);
}
.rcg-btn:hover { background: rgba(255, 255, 255, 0.15); transform: translateY(-2px) scale(1.02); box-shadow: 0 0 20px rgba(255,255,255,0.15); }
.rcg-btn:active { transform: translateY(0) scale(0.98); background: rgba(255, 255, 255, 0.12); }

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .rcg-ring{ transition: none; transform: translateZ(-100px) rotateX(-6deg); }
}

/* Responsive */
@media (max-width: 520px){
  :root{ --ring-size: 340px; --card-w: 150px; --card-h: 200px; --z-depth: 300px; }
  .rcg-overlay__video{ max-height: 52vh; }
  .rcg-controls{ bottom:-58px; }
  .rcg-ctrl--icon{ width:40px; height:40px; font-size:22px; }
  .rcg-ctrl--play{ padding:8px 14px; font-size:14px; }
}
`;