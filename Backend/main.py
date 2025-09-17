from fastapi import FastAPI, UploadFile, File, Form, HTTPException,WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from PIL import Image
from io import BytesIO
import os
from dotenv import load_dotenv
from typing import Literal, Tuple, Dict
import asyncio
import uuid
import tempfile
import traceback
from pydantic import BaseModel

# Load environment variables (e.g., your Gemini API key)
load_dotenv()

# --- RECOMMENDED API KEY CONFIGURATION ---
# Create a Client instance, which will handle authentication.
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

# ---------------- CORS ----------------
def build_allowed_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "")
    items = [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]
    if any("," in o for o in items):
        print("[CORS] Warning: found a comma inside an origin; check CORS_ORIGINS formatting")
    return items

# Fallback to localhost dev ports if env not set
ALLOWED_ORIGINS = build_allowed_origins() or [
    "http://localhost:5173",  # tablet
    "http://localhost:5174",  # kiosk
]

DEBUG_CORS = os.getenv("DEBUG_CORS", "false").lower() == "true"

if DEBUG_CORS:
    print("[CORS] DEBUG MODE: allowing all origins (no credentials)")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,   # must be False when using "*"
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    print("[CORS] Allowed origins:", ALLOWED_ORIGINS)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,    # allowed with explicit origins
        allow_methods=["*"],
        allow_headers=["*"],
    )
@app.post("/api/edit")

async def process_image_with_gemini(
    image_file: UploadFile = File(...),
    prompt: str = Form(...)
):
    print("into gemini")
    try:
        image_bytes = await image_file.read()
        pil_image = Image.open(BytesIO(image_bytes))

        contents = [prompt, pil_image]
        print("**********************",prompt)

        # Use the client to access the models service
        response = client.models.generate_content(
            model="gemini-2.5-flash-image-preview", 
            contents=contents,
        )
        print("after gemini")


        result_image_data = None
        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                pil_image = Image.open(BytesIO(part.inline_data.data))
                
                # Create an in-memory buffer (BytesIO)
                img_byte_arr = BytesIO()
                pil_image.save(img_byte_arr, format="PNG")
                img_byte_arr.seek(0)

                return Response(content=img_byte_arr.getvalue(), media_type="image/png")
        
        raise HTTPException(status_code=500, detail="No image found in Gemini API response.")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
       

# ---------------- WebSockets: Pairing & Relay ----------------
import asyncio
import uuid
from typing import Dict, Optional
from fastapi import WebSocket, WebSocketDisconnect

# rooms[sessionId] = {"kiosk": WebSocket|None, "tablet": WebSocket|None}
rooms: Dict[str, Dict[str, Optional[WebSocket]]] = {}
@app.get("/ping")
def check():
    return "checked"

@app.post("/session")
def create_session():
    """
    Create a short session code (e.g. 'A1B2C3') to pair kiosk & tablet.
    Tablet reads it from kiosk screen and connects.
    """
    sid = uuid.uuid4().hex[:6].upper()
    rooms[sid] = {"kiosk": None, "tablet": None}
    print(f"[session] created {sid}")
    return {"sessionId": sid}

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket, session: str, role: str):
    """
    Connect with:  ws://.../ws?session=ABC123&role=kiosk|tablet
    - Exactly one kiosk and one tablet per session.
    - Any JSON message received is relayed to the opposite peer as-is.
    - Server also emits:
        {type:"CONNECTED", role}
        {type:"PEER_STATUS", role:"kiosk|tablet", status:"online|offline"}
        {type:"ERROR", message:"..."} on basic validation failures
    """
    # Accept first so we can send structured errors back if needed
    await ws.accept()
    print(f"[WS] incoming: session={session} role={role}")

    # Basic validation
    if session not in rooms:
        await _safe_send(ws, {"type": "ERROR", "message": "Invalid session"})
        await ws.close(code=4000)
        return
    if role not in ("kiosk", "tablet"):
        await _safe_send(ws, {"type": "ERROR", "message": "Invalid role"})
        await ws.close(code=4001)
        return
    if rooms[session][role] is not None:
        await _safe_send(ws, {"type": "ERROR", "message": f"{role} already connected"})
        await ws.close(code=4002)
        return

    # Register
    rooms[session][role] = ws
    await _safe_send(ws, {"type": "CONNECTED", "role": role})
    await _broadcast(session, {"type": "PEER_STATUS", "role": role, "status": "online"})

    # Optional heartbeat to keep some proxies from idling out
    heartbeat_task = asyncio.create_task(_heartbeat(ws))

    try:
        while True:
            # Any JSON payload is simply relayed to the other peer
            msg = await ws.receive_json()
            target = "kiosk" if role == "tablet" else "tablet"

            # small guard: ensure target exists before relaying
            peer = rooms.get(session, {}).get(target)
            if peer is None:
                # still ACK locally so caller can react (e.g., show “kiosk offline”)
                await _safe_send(ws, {
                    "type": "ERROR",
                    "message": f"{target} not connected"
                })
                continue

            await _safe_send(peer, msg)

    except WebSocketDisconnect:
        print(f"[WS] disconnect: session={session} role={role}")
    except Exception as e:
        print(f"[WS] error ({role}): {e}")
    finally:
        heartbeat_task.cancel()
        await _cleanup_ws(session, role, ws)

async def _safe_send(ws: WebSocket, data: dict):
    try:
        await ws.send_json(data)
    except Exception:
        pass

async def _broadcast(session: str, payload: dict):
    for peer in rooms.get(session, {}).values():
        if peer is not None:
            try:
                await peer.send_json(payload)
            except Exception:
                # ignore send errors; cleanup happens elsewhere
                pass

async def _cleanup_ws(session: str, role: str, ws: WebSocket):
    # Remove this role if it’s the same socket
    try:
        if rooms.get(session, {}).get(role) is ws:
            rooms[session][role] = None
    except Exception:
        pass

    # Tell the other side we went offline
    await _broadcast(session, {"type": "PEER_STATUS", "role": role, "status": "offline"})

    # If both sides are gone, delete the room
    try:
        entry = rooms.get(session)
        if entry and entry["kiosk"] is None and entry["tablet"] is None:
            rooms.pop(session, None)
            print(f"[session] removed empty {session}")
    except Exception:
        pass

async def _heartbeat(ws: WebSocket, interval: float = 25.0):
    """
    Best-effort keepalive; some hosts/proxies close idle WS after ~30s.
    This sends a trivial JSON ping periodically.
    """
    try:
        while True:
            await asyncio.sleep(interval)
            await _safe_send(ws, {"type": "PING", "ts": asyncio.get_event_loop().time()})
    except Exception:
        pass