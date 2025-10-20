// components/DemoExplainer.jsx
import React, { useEffect, useRef, useState } from "react";

const SCRIPT = `Welcome to the AI Art Storyline Exhibit.

Today, we live in a world where every beautiful moment is instantly captured through cameras.
But before photography, artists preserved those same emotions and memories using the timeless beauty of paint and canvas.

In this experience, you’ll explore the genius of several legendary artists and discover their unique painting styles that shaped generations.

Toward the end, you’ll have the opportunity to recreate your own image as if it were painted by these masters — or even turn your personal story into a one-page comic in their artistic style.

Take your time to explore, learn, and select the artist who inspires you most.

Thank you for being part of our celebration of art, creativity, and artificial intelligence.`;

export default function DemoExplainer({ onClose, onRepeat }) {
  const [text, setText] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);

  // typewriter
  useEffect(() => {
    setText("");
    setIdx(0);
    const speed = 20; // ms per char
    timerRef.current = setInterval(() => {
      setIdx((i) => {
        const n = i + 1;
        setText(SCRIPT.slice(0, n));
        if (n >= SCRIPT.length) {
          clearInterval(timerRef.current);
        }
        return n;
      });
    }, speed);
    return () => clearInterval(timerRef.current);
    // re-run when component remounts (App sets screen="demo")
  }, []);

  // voice (Web Speech API)
//   useEffect(() => {
//     const synth = window.speechSynthesis;
//     if (!synth) return;
//     // small delay so voices load on some browsers
//     const t = setTimeout(() => {
//       try {
//         const utter = new SpeechSynthesisUtterance(SCRIPT);
//         utter.rate = 1.02;
//         utter.pitch = 1.0;
//         utter.volume = 1.0;
//         // pick a friendly voice if present
//         const vs = synth.getVoices();
//         const cand =
//           vs.find((v) => /en-(US|IN)/i.test(v.lang) && /female/i.test(v.name)) ||
//           vs.find((v) => /en-(US|IN)/i.test(v.lang)) ||
//           vs[0];
//         if (cand) utter.voice = cand;

//         utter.onstart = () => setSpeaking(true);
//         utter.onend = () => setSpeaking(false);
//         synth.cancel(); // stop any prior speech
//         synth.speak(utter);
//       } catch {}
//     }, 150);
//     return () => {
//       clearTimeout(t);
//       try { synth && synth.cancel(); } catch {}
//     };
//   }, []);

  // esc to close
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleRepeat = () => {
  clearInterval(timerRef.current);
  setText("");
  setIdx(0);
  const speed = 20;
  timerRef.current = setInterval(() => {
    setIdx((i) => {
      const n = i + 1;
      setText(SCRIPT.slice(0, n));
      if (n >= SCRIPT.length) {
        clearInterval(timerRef.current);
      }
      return n;
    });
  }, speed);
};

  return (
    <div
      className="absolute inset-0 z-40 grid place-items-center"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        background: "linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.75))",
        backdropFilter: "blur(6px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Project demo"
    >
      <div className="w-[min(960px,92vw)] rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-950/90 shadow-2xl overflow-hidden">
        {/* demo header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-white/10">
          <div className="font-bold text-base sm:text-lg">Welcome to AI Art</div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex h-2 w-2 rounded-full ${
                speaking ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
              }`}
              aria-label={speaking ? "Speaking" : "Not speaking"}
              title={speaking ? "Speaking" : "Not speaking"}
            />
            {/* <button
              className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold border border-white/15 hover:bg-white/10"
              onClick={onClose}
            >
              Skip
            </button> */}
          </div>
        </div>

        {/* demo body */}
        <div className="grid md:grid-cols-2 gap-0">
          {/* left: big demo card */}
         <div className="relative h-[55vh] sm:h-[65vh] bg-[radial-gradient(80%_60%_at_50%_50%,#263552,#0b1220)] flex items-center justify-center">
            {/* “demo” artwork frame */}
           <div className="relative w-[80%] h-[80%] rounded-xl overflow-hidden border border-white/10 shadow-xl">
  <DemoArtwork videoSrc="OwlDemo.mp4" dim={0.3}/>
  <div className="absolute bottom-0 inset-x-0 p-3 text-center text-xs text-slate-300/90 bg-gradient-to-t from-black/40 to-transparent">
    
  </div>
</div>
          </div>

          {/* right: typing text */}
          <div className="p-4 sm:p-6 md:h-[48vh] overflow-auto">
            <p className="whitespace-pre-wrap text-sm sm:text-base leading-6 sm:leading-7 text-slate-100 font-medium">
              {text}
              <span className="inline-block w-2 h-5 align-baseline bg-slate-300 animate-pulse ml-0.5" aria-hidden />
            </p>
          </div>
        </div>

        {/* actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 px-4 sm:px-5 py-3 border-t border-white/10">
          <button
            onClick={handleRepeat}
            className="px-4 py-2 rounded-xl font-semibold text-sm border border-white/15 hover:bg-white/10"
          >
            Repeat
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-semibold text-sm bg-white/10 border border-white/15 hover:bg-white/15"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DemoArtwork({ videoSrc = "OwlDemo.mp4", poster, dim = 0.35 }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Background video */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src={videoSrc}
        poster={poster}
        muted
        loop
        autoPlay
        playsInline
        preload="auto"
        aria-hidden="true"
      />

      {/* Optional dim overlay for better contrast */}
      <div
        className="absolute inset-0"
        style={{ background: `rgba(0,0,0,${dim})` }}
        aria-hidden="true"
      />
    </div>
  );
}



//if i genenrate the voice then to make it repeat when the button is clicked i can use this code snippet for handleRepeat method
// const handleRepeat = () => {
//    Stop anything already running
//   clearInterval(timerRef.current);
//   const synth = window.speechSynthesis;
//   try { synth.cancel(); } catch {}

//    Reset typewriter
//   setText("");
//   setIdx(0);

//   const speed = 20;
//   timerRef.current = setInterval(() => {
//     setIdx((i) => {
//       const n = i + 1;
//       setText(SCRIPT.slice(0, n));
//       if (n >= SCRIPT.length) {
//         clearInterval(timerRef.current);
//       }
//       return n;
//     });
//   }, speed);

//    Restart voice
//   if (synth) {
//     const utter = new SpeechSynthesisUtterance(SCRIPT);
//     utter.rate = 1.02;
//     utter.pitch = 1.0;
//     utter.volume = 1.0;

//     const vs = synth.getVoices();
//     const cand =
//       vs.find((v) => /en-(US|IN)/i.test(v.lang) && /female/i.test(v.name)) ||
//       vs.find((v) => /en-(US|IN)/i.test(v.lang)) ||
//       vs[0];
//     if (cand) utter.voice = cand;

//     utter.onstart = () => setSpeaking(true);
//     utter.onend = () => setSpeaking(false);

//     synth.speak(utter);
//   }
// };