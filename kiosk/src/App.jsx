// App.jsx
import React, { useEffect, useMemo, useState, Suspense, lazy } from "react";
import LandingPainter from "./components/LandingPainter";
// Lazy-load heavier screens
const RotatingCardsIntro = lazy(() => import("./components/RotatingCardsIntro"));
const KioskApp = lazy(() => import("./KioskApp"));

// Optional: imports for images are unchanged
import p1 from "./assets/paint1.jpg";
import p2 from "./assets/paint2.jpg";
import p3 from "./assets/paint3.jpg";
import p4 from "./assets/paint4.jpg";
import p5 from "./assets/paint5.jpg";
import p6 from "./assets/paint6.jpg";

export default function App() {
  useSafeVh(); // sets --app-svh to fix mobile 100vh issues
  const [screen, setScreen] = useState("landing"); // "landing" -> "intro" -> "kiosk"
  const isPortrait = useIsPortrait();
  const isTouch = useIsTouch();

  const images = useMemo(() => [p1, p2, p3, p4, p5, p6], []);
  const message = `Hi everyone—these days we all have cameras to capture every moment.
Before that, we had these beautiful artists.
Today let’s recreate those paintings with AI.`;

  return (
    <div
      className="
        relative w-full
        min-h-[var(--app-svh,100svh)]
        bg-gradient-to-b from-slate-950 via-slate-900 to-black
        text-slate-100
        overflow-hidden
      "
      style={{
        // iOS/Android safe areas
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {/* Global responsive container:
          - small: tighter insets
          - md+: roomier "kiosk" look
      */}
      <div className="absolute inset-2 sm:inset-4 md:inset-6 rounded-2xl overflow-hidden">
        {/* Orientation hint for phones (optional, shows only on kiosk & intro) */}
        {(screen === "intro" || screen === "kiosk") && isTouch && isPortrait && (
          <OrientationHint />
        )}

        <Suspense fallback={<BootSplash />}>
          {screen === "landing" && (
            <LandingPainter onStart={() => setScreen("intro")} />
          )}

          {screen === "intro" && (
            <RotatingCardsIntro
              images={images}
              message={message}
              onGo={() => setScreen("kiosk")}
            />
          )}

          {screen === "kiosk" && <KioskApp />}
        </Suspense>
      </div>
    </div>
  );
}

/* ------------------ Small helpers ------------------ */

// Fix mobile 100vh by publishing a reliable custom svh variable
function useSafeVh() {
  useEffect(() => {
    const set = () => {
      const svh = window.innerHeight; // viewport excluding URL bars after scroll
      document.documentElement.style.setProperty("--app-svh", `${svh}px`);
    };
    set();
    window.addEventListener("resize", set);
    window.addEventListener("orientationchange", set);
    // Some Android browsers fire resize late after URL bar hides
    const t = setTimeout(set, 300);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", set);
      window.removeEventListener("orientationchange", set);
    };
  }, []);
}

function useIsPortrait() {
  const [portrait, setPortrait] = useState(
    typeof window !== "undefined" ? window.innerHeight >= window.innerWidth : false
  );
  useEffect(() => {
    const onResize = () =>
      setPortrait(window.innerHeight >= window.innerWidth);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);
  return portrait;
}

function useIsTouch() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    setTouch(("ontouchstart" in window) || navigator.maxTouchPoints > 0);
  }, []);
  return touch;
}

/* ------------------ UI bits ------------------ */

function BootSplash() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="animate-pulse text-sm sm:text-base text-slate-300">
        Loading…
      </div>
    </div>
  );
}

function OrientationHint() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-50">
      <div className="pointer-events-auto max-w-[90%] sm:max-w-md rounded-2xl border border-white/15 bg-black/60 p-4 sm:p-5 text-center backdrop-blur">
        <div className="text-base sm:text-lg font-semibold mb-1">Rotate for best view</div>
        <p className="text-xs sm:text-sm text-slate-300">
          For the gallery and camera, landscape gives a better experience.
        </p>
      </div>
    </div>
  );
}