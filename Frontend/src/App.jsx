import React, { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PlugZap, Activity, Settings2 } from "lucide-react";

// --- Placeholder Components to resolve import errors ---

const WelcomeScreen = ({ onNext, onUserDataChange }) => {
    const [name, setName] = useState("");
    const [age, setAge] = useState("");

    const handleNext = () => {
        onUserDataChange({ name, age });
        onNext();
    };
    
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-60px)] p-4">
            <div className="w-full max-w-xl mx-auto p-8 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-lg text-center">
                <h1 className="text-4xl font-bold mb-2">Welcome</h1>
                <p className="text-lg opacity-70 mb-8">Please enter your details to begin.</p>
                <div className="grid gap-4 mb-6 text-left">
                    <input
                        type="text"
                        placeholder="Your Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-slate-800/80 border border-white/10 outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <input
                        type="number"
                        placeholder="Your Age"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-slate-800/80 border border-white/10 outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                </div>
                <button onClick={handleNext} className="w-full px-8 py-4 rounded-xl text-lg font-bold bg-indigo-600 hover:bg-indigo-500 transition">
                    Next
                </button>
            </div>
        </div>
    );
};

const ConsentScreen = ({ onConsent }) => (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-60px)] p-4">
        <div className="w-full max-w-xl mx-auto p-8 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-lg text-center">
            <h1 className="text-4xl font-bold mb-2">Consent</h1>
            <p className="text-lg opacity-70 mb-8">Please review and provide consent to continue.</p>
            <p className="text-sm opacity-60 mb-8 text-left">
                This is a placeholder for your consent form text. You would typically detail what data is being collected and how it will be used.
            </p>
            <div className="flex gap-4">
                <button onClick={() => onConsent(false)} className="w-full px-8 py-4 rounded-xl text-lg font-bold bg-red-600/80 hover:bg-red-600 transition">
                    Decline
                </button>
                <button onClick={() => onConsent(true)} className="w-full px-8 py-4 rounded-xl text-lg font-bold bg-emerald-600 hover:bg-emerald-500 transition">
                    Accept
                </button>
            </div>
        </div>
    </div>
);

const MainEditor = ({ sendWS, wsConnected, username, onExit, canSend, resultUrl, onSetCanSend, onSetResultUrl }) => (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-60px)] p-4">
        <div className="w-full max-w-xl mx-auto p-8 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-lg text-center">
            <h1 className="text-3xl font-bold mb-2">Main Editor</h1>
            <p className="text-lg opacity-70 mb-8">Welcome, {username || "Guest"}!</p>
            {resultUrl ? (
                <div className="mb-4">
                    <h3 className="text-xl font-semibold mb-2">Result:</h3>
                    <img src={resultUrl} alt="Result from Kiosk" className="rounded-lg border border-white/10 max-w-full h-auto mx-auto"/>
                     <button onClick={() => onSetResultUrl("")} className="mt-4 px-6 py-2 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-500 transition">
                        Clear Result
                    </button>
                </div>
            ) : (
                <button 
                    onClick={() => sendWS({ type: "GENERATE", data: { username } })} 
                    disabled={!canSend}
                    className="w-full px-8 py-4 rounded-xl text-lg font-bold bg-sky-600 hover:bg-sky-500 transition disabled:bg-slate-700 disabled:cursor-not-allowed"
                >
                    {canSend ? "Send to Kiosk" : "Waiting for Kiosk..."}
                </button>
            )}
            <button onClick={onExit} className="mt-4 w-full px-8 py-2 rounded-xl text-md font-bold bg-slate-700 hover:bg-slate-600 transition">
                Exit
            </button>
        </div>
    </div>
);


const RAW_BASE = "http://localhost:8000";
const WS_BASE = RAW_BASE.replace(/^http/i, "ws");

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

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
  
  const [canSend, setCanSend] = useState(false);
  const [resultUrl, setResultUrl] = useState("");

  const handleNextStep = () => setUserStep((prev) => prev + 1);
  const handleUserDataChange = (data) => setUserData(data);
  const handleConsent = (permission) => {
    if (permission) {
        setConsentGiven(true);
        handleNextStep();
    } else {
        handleExit(); // If consent is declined, exit the flow
    }
  };

  const handleExit = () => {
    setUserStep(1);
    setUserData({ name: "", age: "" });
    setConsentGiven(false);
    setResultUrl("");
    setCanSend(false);
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
        setError("Connection closed. Please check the session code and network.");
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
        if (msg.type === "CAPTURED") {
            setCanSend(true);
        }
        if (msg.type === "RESULT" && msg.dataUrl) {
            setResultUrl(msg.dataUrl);
            setCanSend(false);
        }
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
            canSend={canSend}
            resultUrl={resultUrl}
            onSetCanSend={setCanSend}
            onSetResultUrl={setResultUrl}
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
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-300"
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
      {wsConnected ? renderUserFlow() :
        <ConnectionScreen
            sessionCode={sessionCode}
            setSessionCode={setSessionCode}
            connectWS={connectWS}
            error={error}
        />
      }
    </div>
  );
}

