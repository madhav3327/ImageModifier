import React from "react";
import { Camera, PlugZap, Activity } from "lucide-react";

export default function KioskHeader({ sessionId, connected, tabletOnline }) {
  return (
    <header className="sticky top-0 z-10 backdrop-blur bg-slate-900/50 border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <Camera className="w-6 h-6" />
        <h1 className="text-lg font-semibold tracking-tight">Vision Kiosk</h1>

        <div className="ml-auto flex items-center gap-2 text-xs">
          <div className="px-2 py-1 rounded border border-white/10 bg-white/5">
            Session: <b>{sessionId || "…"}</b>
          </div>
          <div
            className={`px-2 py-1 rounded border ${
              connected
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            <PlugZap className="w-3 h-3 inline -mt-0.5 mr-1" />
            {connected ? "WS connected" : "WS offline"}
          </div>
          <div
            className={`px-2 py-1 rounded border ${
              tabletOnline
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            <Activity className="w-3 h-3 inline -mt-0.5 mr-1" />
            Tablet: {tabletOnline ? "online" : "offline"}
          </div>
        </div>
      </div>
    </header>
  );
}