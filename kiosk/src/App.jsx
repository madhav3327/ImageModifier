// App.jsx
import React, { useEffect, useMemo, useState, Suspense, lazy } from "react";
import LandingPainter from "./components/LandingPainter";
import StartBurst from "./components/StartBurst";
import DemoExplainer from "./components/DemoExplainer";
import StartFX from "./components/StartFX";

// Lazy-load heavier screens
const RotatingCardsIntro = lazy(() => import("./components/RotatingCardsIntro"));
const KioskApp = lazy(() => import("./KioskApp"));

// Assets (thumbnails for the cards)
import p1 from "./assets/Picasso.JPG";
import p2 from "./assets/VanGogh.JPG";
import p3 from "./assets/RajaRaviVarma.JPG";
import p4 from "./assets/FridaKahlo.JPG";
import p5 from "./assets/ClaudeMonet.JPG";
import p6 from "./assets/LeonardoDaVinci.JPG";

export default function App() {
  useSafeVh();

  // Flow: "landing" -> "startFX" -> "demo" -> "intro" -> "kiosk"
  const [screen, setScreen] = useState("landing");

  // Keep the style the user chose from the intro
  // { index:number, name:string, action: "portrait" | "storyline" }
  const [selectedStyle, setSelectedStyle] = useState(null);

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
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <div className="relative min-h-[var(--app-svh,100vh)] sm:m-4 md:m-6 rounded-2xl overflow-auto">
        {/* Landing → Start FX → Demo */}
        {screen === "landing" && (
          <LandingPainter
            onStart={() => setScreen("startFX")}
            backgroundVideoSrc="Screensaver2error.mp4"
            backgroundPoster="/videos/inkwaves-poster.jpg"
            backgroundDim={0.4}
          />
        )}

        {screen === "startFX" && <StartFX onDone={() => setScreen("demo")} />}
        {screen === "startFX" && <StartBurst />}

        {screen === "demo" && (
          <DemoExplainer
            onClose={() => setScreen("intro")}
            onRepeat={() => setScreen("demo")}
          />
        )}

        <Suspense fallback={<BootSplash />}>
          {screen === "intro" && (
            <RotatingCardsIntro
              images={images}
              message={message}
              videoFor={(i) => {
                // Ensure these files are available under /public/artistVideos/*
                const map = {
                  0: "/artistVideos/Picasso.mp4",
                  1: "/artistVideos/VanGogh.mp4",
                  2: "/artistVideos/Raja.mp4",
                  3: "/artistVideos/Frida.mp4",
                  4: "/artistVideos/Claude.mp4",
                  5: "/artistVideos/Leonardo.mp4",
                };
                return map[i];
              }}
              onStoryline={({ index, name }) => {
                setSelectedStyle({ index, name, action: "storyline" });
                setScreen("kiosk");
              }}
              onPortrait={({ index, name }) => {
                setSelectedStyle({ index, name, action: "portrait" });
                setScreen("kiosk");
              }}
            />
          )}

          {screen === "kiosk" && (
            <KioskApp
              initialStyle={selectedStyle}
              // key forces a remount when user picks a new style/action from intro
              key={`${selectedStyle?.index ?? "none"}-${selectedStyle?.action ?? "none"}`}
              onBack={()=>setScreen("intro")}
              onHome={() => { setSelectedStyle(null); setScreen("landing"); }} 
            />
          )}
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
    const t = setTimeout(set, 300);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", set);
      window.removeEventListener("orientationchange", set);
    };
  }, []);
}

function BootSplash() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="animate-pulse text-sm sm:text-base text-slate-300">
        Loading…
      </div>
    </div>
  );
}
// function HomeButton({ onHome }) {
//   return (
//     <button
//       onClick={onHome}
//       className="fixed top-3 right-3 z-50 flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl border border-white/20 backdrop-blur-md shadow-md transition"
//       title="Go to Home"
//     >
//       🏠 <span className="hidden sm:inline">Home</span>
//     </button>
//   );
// }