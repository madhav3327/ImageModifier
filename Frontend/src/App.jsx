import React, { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PlugZap, Activity, Settings2 } from "lucide-react";

import WelcomeScreen from "./components/WelcomeScreen";
import ConsentScreen from "./components/ConsentScreen";
import MainEditor from "./components/MainEditor";

const RAW_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const WS_BASE = RAW_BASE.replace(/^http/i, "ws");

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// ✅ FIX: The ConnectionScreen component is now defined outside the App component.
// It receives all the data it needs (like sessionCode, error, and functions) as props.
const ConnectionScreen = ({ sessionCode, setSessionCode, connectWS, error }) => (
  <div className="relative min-h-screen w-full flex items-center justify-center">
    <div className="relative z-10 w-full max-w-xl mx-auto p-8 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-lg text-center">
      <h2 className="text-4xl font-bold mb-4">Connect to Kiosk</h2>
      <p className="text-xl opacity-70 mb-8">
        Enter the session code to begin.
      </p>
      <div className="grid gap-4 mb-6">
        <input
          type="text"
          value={sessionCode}
          onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
          placeholder="Session Code"
          className="w-full px-4 py-3 rounded-lg bg-slate-800/80 border border-white/10 outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>
      <button
        onClick={connectWS}
        className="w-full px-8 py-4 rounded-xl text-lg font-bold bg-indigo-600 hover:bg-indigo-500 transition"
      >
        Connect
      </button>
      {error && (
        <div className="mt-4 text-sm text-red-300 bg-red-950/40 border border-red-900/40 rounded-xl p-3">
          {error}
        </div>
      )}
    </div>
  </div>
);


export default function App() {
  const wsRef = useRef(null);
  const [sessionCode, setSessionCode] = useState("");
  const [wsConnected, setWsConnected] = useState(false);
  const [kioskStatus, setKioskStatus] = useState("idle");
  const [error, setError] = useState("");
  const [userStep, setUserStep] = useState(1);
  const [userData, setUserData] = useState({ name: "", age: "" });
  const [consentGiven, setConsentGiven] = useState(false);
  
  // --- NEW STATE for synchronization ---
  const [canSend, setCanSend] = useState(false);
  const [resultUrl, setResultUrl] = useState("");

  const handleNextStep = () => setUserStep((prev) => prev + 1);
  const handleUserDataChange = (data) => setUserData(data);
  const handleConsent = (permission) => {
    setConsentGiven(permission);
    handleNextStep();
  };

  const handleExit = () => {
    setUserStep(1);
    setUserData({ name: "", age: "" });
    setConsentGiven(false);
    // You may also want to close the WebSocket connection here
    // try { wsRef.current?.close(); } catch {}
  };

  const connectWS = () => {
    setError("");
    if (!sessionCode) {
      setError("Please enter a session code.");
      return;
    }
    try {
      const ws = new WebSocket(
        `${WS_BASE}/ws?session=${encodeURIComponent(sessionCode)}&role=tablet`
      );
      ws.onopen = () => {
        setWsConnected(true);
        setUserStep(1); 
      };
      ws.onclose = () => {
        setWsConnected(false);
        setKioskStatus("offline");
      };
      ws.onerror = () => {
        setError("WebSocket error. Check network or session code.");
        setWsConnected(false);
      };
      ws.onmessage = (ev) => {
        const msg = safeParse(ev.data);
        if (!msg) return;
        if (msg.type === "PEER_STATUS" && msg.role === "kiosk") {
            setKioskStatus(msg.status);
        }
        // --- NEW: Listen for 'CAPTURED' and 'RESULT' messages ---
        if (msg.type === "CAPTURED") {
            setCanSend(true);
        }
        if (msg.type === "RESULT" && msg.dataUrl) {
            setResultUrl(msg.dataUrl);
            // We can also reset canSend here if needed for the next capture
            // setCanSend(false);
        }
        // --- END NEW ---
      };
      wsRef.current = ws;
    } catch {
      setError("Failed to connect to WebSocket server.");
    }
  };

  const sendWS = (obj) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify(obj));
    } else {
      setError("Not connected to kiosk. Please connect first.");
    }
  };
  
  const renderUserFlow = () => {
    switch (userStep) {
      case 1:
        return (
          <WelcomeScreen
            onNext={handleNextStep}
            onUserDataChange={handleUserDataChange}
          />
        );
      case 2:
        return <ConsentScreen onConsent={handleConsent} />;
      case 3:
        return (
          <MainEditor
            sendWS={sendWS}
            wsConnected={wsConnected}
            username={userData.name}
            onExit={handleExit}
            // --- NEW: Pass down the new state and result URL ---
            canSend={canSend}
            resultUrl={resultUrl}
            onSetCanSend={setCanSend} // Pass the setter function
            onSetResultUrl={setResultUrl} // Pass the setter function
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      <header className="sticky top-0 z-10 backdrop-blur bg-slate-900/50 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight">Vision Tablet</h1>
          <div className="ml-auto flex items-center gap-2">
            <span
                className={`text-[11px] px-2 py-1 rounded border ${
                  kioskStatus === "online"
                    ? "bg-emerald-500/10 border-emerald-500"
                    : "bg-red-500/15 border-red-500/40 text-red-200"
                }`}
                title="Kiosk status"
              >
                <Activity className="w-3 h-3 inline mr-1 -mt-0.5" />
                Kiosk: {kioskStatus}
              </span>
            <Settings2 className="w-5 h-5 opacity-70 ml-2" />
          </div>
        </div>
      </header>
      {wsConnected ? renderUserFlow() : (
        // ✅ FIX: Pass the required state and functions as props to the component.
        <ConnectionScreen 
          sessionCode={sessionCode}
          setSessionCode={setSessionCode}
          connectWS={connectWS}
          error={error}
        />
      )}
    </div>
  );
}