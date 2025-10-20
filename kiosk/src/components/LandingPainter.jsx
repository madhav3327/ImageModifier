// LandingPainter.jsx
import React, { useEffect, useRef, useState } from "react";

/**
 * LandingPainter (responsive + video background)
 *
 * Props:
 *  - onStart: () => void
 *  - phrase?: string                               (default: "Welcome\nto\nArtistic\n AI Storyline")
 *  - backgroundVideoSrc?: string                   (e.g., "/videos/inkwaves.mp4")
 *  - backgroundPoster?: string                     (optional poster while buffering)
 *  - backgroundDim?: number                        (0..1 video darkening overlay, default 0.35)
 */
export default function LandingPainter({
  onStart,
  phrase = "Welcome\nto\nArtistic\n AI Storyline",
  backgroundVideoSrc,
  backgroundPoster,
  backgroundDim = 0.35,
}) {
  const [videoError, setVideoError] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  // ✅ Consent gate
  const [consented, setConsented] = useState(false);

  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const stopRef = useRef(false);
  const videoRef = useRef(null);

  // ---- quick knobs (tuneable) ----
  const PAINT_SPEED = 1.6;       // ↑ faster; try 1.2–2.2
  const COVERAGE_TARGET = 0.90;  // % of mask that must be filled before font swap

  const FONTS = [
    `"Pacifico", cursive`,
    `"Great Vibes", cursive`,
    `"Dancing Script", cursive`,
    `"Lobster", cursive`,
    `"Playfair Display", serif`,
    `"Cinzel", serif`,
    `"Comfortaa", sans-serif`,
  ];
  const COLORS = ["#d43c3c", "#2258e0", "#1fa86a", "#e0a722", "#7a3be0", "#e04fae", "#0ea5e9"];

  // Load Google fonts once
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Pacifico&family=Great+Vibes&family=Dancing+Script&family=Lobster&family=Playfair+Display:wght@600&family=Cinzel:wght@600&family=Comfortaa:wght@600&display=swap";
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch {} };
  }, []);

  // --- prefers-reduced-motion gate for video bg ---
  const prefersReducedMotion = (() => {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch { return false; }
  })();
  const showVideoBg = !!backgroundVideoSrc && !prefersReducedMotion;

  // Try to autoplay the background video (mobile needs muted+playsInline)
  useEffect(() => {
    if (!showVideoBg || !videoRef.current) return;
    const v = videoRef.current;
    const onCanPlay = () => setVideoReady(true);
    v.addEventListener("canplay", onCanPlay, { once: true });

    const tryPlay = async () => {
      try { await v.play(); } catch {}
    };
    const t = setTimeout(tryPlay, 50);

    // Pause when tab hidden (battery friendly)
    const vis = () => { if (document.hidden) v.pause(); else tryPlay(); };
    document.addEventListener("visibilitychange", vis);

    return () => {
      clearTimeout(t);
      v.removeEventListener("canplay", onCanPlay);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [showVideoBg]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    stopRef.current = false; // StrictMode remount guard

    // --- State ---
    let W = 0, H = 0;
    let dpr = getDPR(); // DPR now derived dynamically
    let maskCanvas, maskCtx;     // text alpha mask
    let paintCanvas, paintCtx;   // accumulated paint
    let fxCanvas, fxCtx;         // drips/splashes
    let t0 = performance.now();

    // Layout / font
    let fontPx = 120 * dpr, lineHeight = 0, topY = 0, lines = [];

    // Motion preference (reduces steps if user prefers less)
    const prefersReducedMotion = matchMediaSafe("(prefers-reduced-motion: reduce)");
    let STEPS_PER_FRAME = prefersReducedMotion ? 3 : 6;

    // Brush
    const globalThickness = 1.1;              // slightly thicker dabs
    let colorIdx = 0;
    let color = COLORS[colorIdx];

    const brush = {
      x: 0, y: 0, angle: 0,
      wet: 1.0,
      pressure: 1.0,
      painting: false,
      cooldown: 0,
      target: null,
      x0: 0, y0: 0,
    };

    // Skeleton (target points)
    let attractors = [];

    // Cycling (gated by coverage)
    let fontIdx = 0;
    const MIN_PAINT_TIME_MS = 1200; // brief guard so we don't flip too fast
    let startedAt = performance.now();

    // Multicolor "dips" while painting
    let lastDipAt = performance.now();
    let nextDipDelay = 700 + Math.random() * 400; // 700–1100ms

    // --- Helpers ---
    function getDPR() {
      const base = (typeof window !== "undefined" && window.devicePixelRatio) ? window.devicePixelRatio : 1;
      const w = typeof window !== "undefined" ? window.innerWidth : 1024;
      const cap = w < 480 ? 1.75 : 2;
      return Math.min(cap, base);
    }
    function matchMediaSafe(q) {
      try { return window.matchMedia(q).matches; } catch { return false; }
    }
    const rgba = (hex, a) => {
      if (!hex || hex[0] !== "#") return hex;
      const c = hex.slice(1);
      const r = parseInt(c.slice(0, 2), 16);
      const g = parseInt(c.slice(2, 4), 16);
      const b = parseInt(c.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${a})`;
    };
    const fontsReadyFor = async (fontFamilyCss, px) => {
      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
          await document.fonts.load(`${px}px ${fontFamilyCss}`);
        } catch {}
      }
    };

    // Quick coverage sampler (coarse grid). Returns 0..1
    function coverageSample(sampleStep = 8 * dpr) {
      const step = Math.max(4, Math.floor(sampleStep));
      let maskCount = 0, paintedCount = 0;

      const mData = maskCtx.getImageData(0, 0, W, H).data;
      const pData = paintCtx.getImageData(0, 0, W, H).data;

      for (let y = 0; y < H; y += step) {
        for (let x = 0; x < W; x += step) {
          const idx = ((y * W) + x) * 4 + 3; // alpha
          const ma = mData[idx];
          if (ma > 10) {
            maskCount++;
            const pa = pData[idx];
            if (pa > 28) paintedCount++;
          }
        }
      }
      if (maskCount === 0) return 0;
      return paintedCount / maskCount;
    }

    // --- Canvas sizing ---
    const resize = () => {
      // Recompute DPR on resize/orientation changes
      dpr = getDPR();

      const bounds = canvas.getBoundingClientRect();
      W = canvas.width  = Math.max(1, Math.floor(bounds.width * dpr));
      H = canvas.height = Math.max(1, Math.floor(bounds.height * dpr));

      maskCanvas = document.createElement("canvas"); maskCanvas.width = W; maskCanvas.height = H; maskCtx = maskCanvas.getContext("2d");
      paintCanvas = document.createElement("canvas"); paintCanvas.width = W; paintCanvas.height = H; paintCtx = paintCanvas.getContext("2d");
      fxCanvas = document.createElement("canvas"); fxCanvas.width = W; fxCanvas.height = H; fxCtx = fxCanvas.getContext("2d");

      layoutText();
      paintCtx.clearRect(0,0,W,H);
      fxCtx.clearRect(0,0,W,H);
      startedAt = performance.now();
      lastDipAt = startedAt;
      nextDipDelay = 700 + Math.random() * 400;
    };

    // --- Text mask & skeleton ---
    function layoutText() {
      [maskCtx, paintCtx, fxCtx].forEach(c => c.setTransform(1,0,0,1,0,0));
      maskCtx.clearRect(0,0,W,H);

      // Responsive text size with a friendly clamp for phones → TVs
      const wUnit = W / dpr;
      const pxClamped = Math.max(56, Math.min(220, Math.floor(wUnit / 8.5)));
      fontPx = pxClamped * dpr;
      lineHeight = fontPx * 1.08;

      const currentFont = FONTS[fontIdx % FONTS.length];
      maskCtx.font = `${fontPx}px ${currentFont}`;
      maskCtx.textBaseline = "alphabetic";
      maskCtx.setTransform(1,0,-0.06,1,0,0); // slight italic slant

      // Four-line explicit phrase ("Welcome\nto\nArtistic\n AI Storyline")
      lines = phrase.split("\n");

      // Vertical centering
      const totalH = lines.length * lineHeight;
      topY = (H - totalH) / 2 + fontPx;

      // Draw each line centered horizontally
      maskCtx.fillStyle = "#000";
      lines.forEach((ln, i) => {
        const w = maskCtx.measureText(ln).width;
        const x = (W - w) / 2;
        maskCtx.fillText(ln, x, topY + i * lineHeight);
      });

      buildSkeleton();

      // Reset brush and do entrance arc
      const first = attractors[0] || { x: W * 0.5, y: topY };
      brush.x = first.x; brush.y = first.y; brush.angle = 0;
      brush.x0 = first.x; brush.y0 = first.y;
      brush.wet = 1.0; brush.pressure = 1.0; brush.painting = true; brush.cooldown = 0; brush.target = null;
      entranceArc(first.x, first.y);
    }

    function isInMask(x, y) {
      if (x<0||y<0||x>=W||y>=H) return false;
      return maskCtx.getImageData(x|0, y|0, 1, 1).data[3] > 10;
    }
    function isPainted(x, y) {
      if (x<0||y<0||x>=W||y>=H) return true;
      return paintCtx.getImageData(x|0, y|0, 1, 1).data[3] > 26;
    }

    function buildSkeleton() {
      attractors = [];
      const sample = Math.max(4, Math.floor(fontPx * 0.032));
      const totalLines = lines.length;
      for (let j = (topY-fontPx)|0; j < (topY + lineHeight*totalLines)|0; j += sample) {
        let inRun = false, startX = 0;
        for (let i = 0; i < W; i += sample) {
          const inside = isInMask(i, j);
          if (inside && !inRun) { inRun = true; startX = i; }
          else if (!inside && inRun) {
            inRun = false;
            const mid = startX + (i - startX)/2;
            attractors.push({x: mid, y: j});
          }
        }
        if (inRun) {
          const mid = startX + (W - startX)/2;
          attractors.push({x: mid, y: j});
        }
      }
      // shuffle
      for (let k=attractors.length-1; k>0; k--) {
        const r = (Math.random()*(k+1))|0;
        [attractors[k], attractors[r]] = [attractors[r], attractors[k]];
      }
    }

    function pickTarget() {
      // Try harder to find unpainted spots
      for (let t=0; t<450; t++){
        const a = attractors[(Math.random()*attractors.length)|0];
        if (!a) break;
        const rx = a.x + (Math.random()-0.5)*fontPx*0.12;
        const ry = a.y + (Math.random()-0.5)*fontPx*0.12;
        if (isInMask(rx, ry) && !isPainted(rx, ry)) return {x: rx, y: ry};
      }
      return null;
    }

    // --- Brush motion / arcs ---
    async function entranceArc(tx, ty) {
      const sx = W*0.5, sy = H + 120*dpr;
      brush.x = sx; brush.y = sy;
      brush.x0 = tx; brush.y0 = ty;
      await arcMove(sx, sy, tx, ty, 520*dpr, 380*dpr, 360);
    }

    function arcMove(sx, sy, tx, ty, rx, ry, ms) {
      return new Promise(res => {
        const start = performance.now();
        const cx = (sx + tx)/2, cy = (sy + ty)/2 - 0.6*ry; // arc apex above
        function ease(t){ return t<.5 ? 2*t*t : -1+(4-2*t)*t; }
        function step() {
          const now = performance.now();
          const p = Math.min(1, (now-start)/ms);
          const e = ease(p);
          const x = (1-e)*(1-e)*sx + 2*(1-e)*e*cx + e*e*tx;
          const y = (1-e)*(1-e)*sy + 2*(1-e)*e*cy + e*e*ty;
          brush.angle = Math.atan2(y - brush.y, x - brush.x);
          brush.x = x; brush.y = y;
          if (p < 1) requestAnimationFrame(step); else res();
        }
        requestAnimationFrame(step);
      });
    }

    // --- Paint dabs / drips ---
    function dabPaint(x, y) {
      const base = Math.max(24, Math.min(50, Math.floor(fontPx * 0.34))) * globalThickness;
      const w = base * brush.pressure;

      const dabs = 1 + (Math.random() < 0.72 ? 1 : 0);
      for (let i=0; i<dabs; i++){
        const off = (i===0) ? 0 : (Math.random()-0.5)*w*0.25;
        const px = x + Math.cos(brush.angle + Math.PI/2) * off;
        const py = y + Math.sin(brush.angle + Math.PI/2) * off;

        const g = paintCtx.createRadialGradient(px, py, 0, px, py, w);
        g.addColorStop(0, rgba(color, 0.94 * brush.wet));
        g.addColorStop(0.6, rgba(color, 0.66 * brush.wet));
        g.addColorStop(1, rgba(color, 0));
        paintCtx.globalCompositeOperation = "source-over";
        paintCtx.fillStyle = g;
        paintCtx.beginPath(); paintCtx.arc(px, py, w, 0, Math.PI*2); paintCtx.fill();

        // subtle streak
        paintCtx.globalAlpha = 0.16 * brush.wet;
        paintCtx.strokeStyle = rgba("#000000", 0.15);
        paintCtx.lineWidth = Math.max(1, w * 0.08);
        paintCtx.beginPath();
        paintCtx.moveTo(px - Math.cos(brush.angle)*w*0.9, py - Math.sin(brush.angle)*w*0.9);
        paintCtx.lineTo(px, py);
        paintCtx.stroke();
        paintCtx.globalAlpha = 1;
      }
    }

    function drip(x, y) {
      const len = 8 + Math.random()*22;
      fxCtx.strokeStyle = rgba(color, 0.5);
      fxCtx.lineWidth = 1.3 + Math.random()*1.3;
      fxCtx.beginPath();
      fxCtx.moveTo(x + (Math.random()-0.5)*6, y + (Math.random()-0.5)*6);
      fxCtx.lineTo(x + (Math.random()-0.5)*4, y + len);
      fxCtx.stroke();
      fxCtx.fillStyle = rgba(color, .55);
      fxCtx.beginPath(); fxCtx.arc(x, y + len, 1.5 + Math.random()*2.5, 0, Math.PI*2); fxCtx.fill();
    }

    // --- Brush step (stroke seeking) ---
    function nearestAttractor(x, y) {
      let best = null, bd = 1e9;
      for (let k=0; k<14; k++) {
        const a = attractors[(Math.random()*attractors.length)|0];
        if (!a) break;
        const d = (x-a.x)**2 + (y-a.y)**2;
        if (d < bd) { bd = d; best = a; }
      }
      return best;
    }

    function stepBrush(dt) {
      if (!brush.painting) return;

      if (!brush.target || brush.cooldown <= 0 || isPainted(brush.target.x, brush.target.y)) {
        brush.target = pickTarget();
        if (!brush.target) { brush.painting = false; return; }
        brush.cooldown = 520 + Math.random()*320;
      } else {
        brush.cooldown -= dt;
      }

      let dx = brush.target.x - brush.x;
      let dy = brush.target.y - brush.y;
      let dist = Math.hypot(dx, dy) || 0.001;
      dx/=dist; dy/=dist;

      const near = nearestAttractor(brush.x, brush.y);
      let ax = 0, ay = 0;
      if (near) {
        ax = (near.x - brush.x); ay = (near.y - brush.y);
        const al = Math.hypot(ax, ay) || 1;
        ax/=al; ay/=al;
      }

      const perpX = -dy, perpY = dx;
      const wiggle = Math.sin(performance.now()*0.006 + brush.x*0.01) * 0.012 + (Math.random()-0.5)*0.7;
      const speed = (0.12 + Math.random()*0.48) * dpr * PAINT_SPEED * (0.65 + brush.wet*0.5);

      let vx = (dx*0.64 + ax*0.36) * speed + perpX * wiggle * 1.4;
      let vy = (dy*0.64 + ay*0.36) * speed + perpY * wiggle * 1.4;

      let nx = brush.x + vx, ny = brush.y + vy;
      if (!isInMask(nx, ny)) {
        nx = brush.x + dx * speed * 0.6;
        ny = brush.y + dy * speed * 0.6;
        if (!isInMask(nx, ny)) {
          const t = pickTarget(); if (t) { brush.x = t.x; brush.y = t.y; return; }
        }
      }

      brush.angle = Math.atan2(ny - brush.y, nx - brush.x);
      brush.x = nx; brush.y = ny;

      brush.pressure += (Math.random() - 0.5) * 0.16;
      brush.pressure = Math.max(0.72, Math.min(1.25, brush.pressure));

      dabPaint(brush.x, brush.y);

      if (brush.wet > 0.7 && Math.random() < 0.01) drip(brush.x, brush.y);
      brush.wet = Math.max(0.35, brush.wet - 0.0009 * dt);
    }

    // --- Brush sprite ---
    function drawBrush() {
      const ctx = canvas.getContext("2d");
      ctx.save();
      ctx.translate(brush.x, brush.y);
      ctx.rotate(brush.angle);

      const handleLen = Math.max(120, Math.min(180, Math.floor(fontPx * 1.2)));
      ctx.fillStyle = "#6e4a2f"; ctx.strokeStyle = "#3b291b"; ctx.lineWidth = 2*dpr;
      roundRect(ctx, -handleLen, -8, handleLen, 16, 8); ctx.fill(); ctx.stroke();

      ctx.fillStyle = "#c9ccd1"; ctx.strokeStyle = "#8f9399";
      roundRect(ctx, -22, -10, 26, 20, 5); ctx.fill(); ctx.stroke();

      const tip = 18, bw = 18;
      ctx.beginPath();
      ctx.moveTo(4, -bw*0.6); ctx.quadraticCurveTo(8, 0, 4, bw*0.6); ctx.lineTo(tip, 0); ctx.closePath();
      const g = ctx.createLinearGradient(0, -bw*0.6, tip, 0);
      g.addColorStop(0, rgba(color, .9)); g.addColorStop(1, rgba(color, .35));
      ctx.fillStyle = g; ctx.fill();

      ctx.globalAlpha = Math.max(0, brush.wet - 0.4);
      ctx.fillStyle = "white";
      ctx.beginPath(); ctx.ellipse(8, -4, 6, 2, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-8, 3, 8, 2.2, 0, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;

      ctx.restore();
    }

    function roundRect(c, x, y, w, h, r) {
      c.beginPath();
      c.moveTo(x+r, y);
      c.arcTo(x+w, y, x+w, y+h, r);
      c.arcTo(x+w, y+h, x, y+h, r);
      c.arcTo(x, y+h, x, y, r);
      c.arcTo(x, y, x+w, y, r);
      c.closePath();
    }

    // --- Render loop ---
    function render(now) {
      if (stopRef.current) return;

      const dt = Math.min(48, now - (t0 || now));
      t0 = now;

      for (let s = 0; s < STEPS_PER_FRAME; s++) stepBrush(16 / STEPS_PER_FRAME);

      // Transparent canvas: show app background
      const ctx = canvas.getContext("2d");
      ctx.setTransform(1,0,0,1,0,0);
      ctx.clearRect(0,0,W,H);

      // paint ∩ mask
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(paintCanvas, 0, 0);
      ctx.drawImage(fxCanvas, 0, 0);
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(maskCanvas, 0, 0);
      ctx.globalCompositeOperation = "source-over";

      // brush sprite
      drawBrush();

      // periodic color "dip" while painting
      if (brush.painting && now - lastDipAt > nextDipDelay) {
        colorIdx = (colorIdx + 1) % COLORS.length;
        color = COLORS[colorIdx];
        lastDipAt = now;
        nextDipDelay = 700 + Math.random() * 400;
        brush.wet = 1.0; // fresh dip look
      }

      // gate font switch by coverage
      const cov = coverageSample(); // 0..1
      const enoughTime = (now - startedAt) > MIN_PAINT_TIME_MS;
      if (cov >= COVERAGE_TARGET && enoughTime) {
        fontIdx = (fontIdx + 1) % FONTS.length;
        paintCtx.clearRect(0,0,W,H);
        fxCtx.clearRect(0,0,W,H);
        layoutText();
        startedAt = now;
      }

      rafRef.current = requestAnimationFrame(render);
    }

    // --- init & resize handling ---
    let rafResize = 0;
    const onResize = async () => {
      if (rafResize) cancelAnimationFrame(rafResize);
      rafResize = requestAnimationFrame(async () => {
        cancelAnimationFrame(rafRef.current);
        resize();
        const px = Math.max(56, Math.min(220, Math.floor((W/dpr) / 8.5))) * dpr;
        await fontsReadyFor(FONTS[fontIdx % FONTS.length], px);
        layoutText();
        rafRef.current = requestAnimationFrame(render);
      });
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas.parentElement);

    onResize();

    return () => {
      stopRef.current = true;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [phrase]);

  return (
    <div
      className="relative w-full min-h:[100svh] min-h-[100svh] text-slate-100 isolate"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {/* Background layer */}
      <div className="absolute inset-0 z-0">
        {showVideoBg && !videoError ? (
          <>
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              src={backgroundVideoSrc}
              poster={backgroundPoster}
              muted
              loop
              playsInline
              autoPlay
              preload="auto"
              crossOrigin="anonymous"
              aria-hidden="true"
              style={{ willChange: "transform", transform: "translateZ(0)" }}
              onLoadedData={() => setVideoReady(true)}
              onPlay={() => setVideoPlaying(true)}
              onError={() => setVideoError(true)}
            />
            <div
              className="absolute inset-0"
              style={{ background: `rgba(0,0,0,${backgroundDim})` }}
              aria-hidden="true"
            />
          </>
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-black"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Frame */}
      <div className="absolute inset-2 sm:inset-4 md:inset-6 z-10 rounded-2xl border border-white/10 bg-transparent overflow-hidden shadow-xl">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            boxShadow:
              "inset 0 0 0 1px rgba(255,255,255,.03), inset 0 0 120px rgba(0,0,0,.12)",
          }}
        />

        <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

        {/* Consent + Start */}
        <div
          className="absolute inset-x-0 flex flex-col items-center justify-center gap-4 px-4"
          style={{ bottom: "max(env(safe-area-inset-bottom), 1.25rem)" }}
        >
          <label className="flex gap-3 items-start text-sm sm:text-base text-slate-200 bg-black/30 px-4 sm:px-5 py-3 rounded-xl border border-white/10 backdrop-blur-sm max-w-2xl">
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
              className="mt-0.5 accent-sky-400 w-5 h-5 cursor-pointer"
            />
            <span className="leading-snug">
              I consent to use my photo for artistic transformation in this exhibit.,
            </span>
          </label>

          <button
            onClick={() => consented && onStart()}
            aria-label="Start"
            disabled={!consented}
            className={`px-5 py-3 sm:px-7 sm:py-3.5 md:px-8 md:py-4 rounded-2xl text-white font-semibold text-base sm:text-lg md:text-xl border transition
            ${
              consented
                ? "bg-white/10 border-white/20 hover:bg-white/20 active:scale-[0.99]"
                : "bg-white/5 border-white/10 opacity-60 cursor-not-allowed"
            }`}
          >
            {consented ? "Start" : "Please provide consent to continue"}
          </button>
        </div>

        {/* (debug strip) */}
        {showVideoBg && (
          <div className="absolute left-3 bottom-3 text-[11px] px-2 py-1 rounded bg-black/40 border border-white/10">
            {/* keep empty or show debug if needed */}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */
function getDPR() {
  try { return Math.min(window.devicePixelRatio || 1, 2); } catch { return 1; }
}
function matchMediaSafe(q) {
  try { return window.matchMedia(q).matches; } catch { return false; }
}