import { useState, useEffect, useRef } from 'react';

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export default function useKioskWebSocket(backendUrl, onMessage) {
  const [sessionId, setSessionId] = useState("");
  const [connected, setConnected] = useState(false);
  const [tabletOnline, setTabletOnline] = useState(false);
  const wsRef = useRef(null);
  
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const createSession = async () => {
      try {
        const r = await fetch(`${backendUrl}/session`, { method: "POST" });
        const j = await r.json();
        setSessionId(j.sessionId);
        connectWS(j.sessionId);
      } catch (e) {
        console.error("Failed to create session", e);
      }
    };

    const connectWS = (sid) => {
      const wsUrl = backendUrl.replace(/^http/i, "ws") + `/ws?session=${encodeURIComponent(sid)}&role=kiosk`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        setTabletOnline(false);
      };
      ws.onerror = () => {
        setConnected(false);
        setTabletOnline(false);
      };
      ws.onmessage = (ev) => {
        const msg = safeParse(ev.data);
        if (!msg || !msg.type) return;

        if (msg.type === "PEER_STATUS" && msg.role === "tablet") {
          setTabletOnline(msg.status === "online");
        } else {
            onMessageRef.current?.(msg);
        }
      };
      wsRef.current = ws;
    };

    createSession();

    return () => {
      wsRef.current?.close();
    };
  }, [backendUrl]);

  const sendMessage = (obj) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  };

  return { sessionId, connected, tabletOnline, sendMessage };
}