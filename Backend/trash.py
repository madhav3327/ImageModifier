# import os
# import base64
# import uuid
# import tempfile
# import traceback
# import asyncio
# from io import BytesIO
# from typing import Literal, Tuple, Dict

# import requests
# from PIL import Image
# from dotenv import load_dotenv
# from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel

# load_dotenv()

# # -------- API Keys --------
# GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") or ""

# app = FastAPI()

# # ---------------- CORS ----------------
# origins = [
#     "http://localhost",
#     "http://localhost:8000",
#     # "https://your-cloud-server.com",
    
# ]

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=origins,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # ---------------- Models (REST) ----------------
# class EditIn(BaseModel):
#     provider: Literal["gpt", "gemini"]
#     prompt: str
#     image_data_url: str

# class EditOut(BaseModel):
#     mime: str
#     image_b64: str



# @app.post("/process_image/")
# async def process_image_with_gemini(
#     image_file: UploadFile = File(...),
#     prompt: str = Form(...)
# ):
#     """
#     Processes an image and a text prompt using the Gemini API and returns the modified image.
#     """
#     try:
#         # Read the uploaded image file
#         image_bytes = await image_file.read()
#         pil_image = Image.open(BytesIO(image_bytes))

#         # Prepare the content for the Gemini API call
#         contents = [prompt, pil_image]

#         # Call the Gemini API
#         model = genai.GenerativeModel(model_name="gemini-2.5-flash-image-preview")
#         response = model.generate_content(contents)

#         # Find the image part in the response
#         result_image_data = None
#         for part in response.candidates[0].content.parts:
#             if part.inline_data:
#                 result_image_data = part.inline_data.data
#                 break
        
#         if not result_image_data:
#             raise HTTPException(status_code=500, detail="No image found in Gemini API response.")

#         # Return the modified image as a PNG response
#         return Response(content=result_image_data, media_type="image/png")

#     except Exception as e:
#         # Handle any errors during the process
#         raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")



# # ---------------- CORS ----------------
# def build_allowed_origins() -> list[str]:
#     raw = os.getenv("CORS_ORIGINS", "")
#     items = [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]
#     if any("," in o for o in items):
#         print("[CORS] Warning: found a comma inside an origin; check CORS_ORIGINS formatting")
#     return items

# ALLOWED_ORIGINS = build_allowed_origins() or ["http://localhost:5173", "http://localhost:5174"]
# DEBUG_CORS = os.getenv("DEBUG_CORS", "false").lower() == "true"

# if DEBUG_CORS:
#     print("[CORS] DEBUG MODE: allowing all origins (no credentials)")
#     app.add_middleware(
#         CORSMiddleware,
#         allow_origins=["*"],
#         allow_credentials=False,
#         allow_methods=["*"],
#         allow_headers=["*"],
#     )
# else:
#     print("[CORS] Allowed origins:", ALLOWED_ORIGINS)
#     app.add_middleware(
#         CORSMiddleware,
#         allow_origins=ALLOWED_ORIGINS,
#         allow_credentials=True,
#         allow_methods=["*"],
#         allow_headers=["*"],
#     )


# # ---------------- Helpers ----------------

# def to_b64(content: bytes) -> str:
#     return base64.b64encode(content).decode("utf-8")

# def validate_image(image_bytes: bytes) -> bool:
#     try:
#         with Image.open(BytesIO(image_bytes)) as img:
#             w, h = img.size
#             if w < 10 or h < 10: return False
#             if w > 6000 or h > 6000: return False
#             return True
#     except Exception:
#         return False

# # ---------------- Health ----------------
# @app.get("/ping")
# def ping():
#     return {"ok": True}

# @app.get("/healthz")
# def healthz():
#     return {
#         "allowed_origins": ALLOWED_ORIGINS,
#         "debug_cors": DEBUG_CORS,
#         "openai": bool(OPENAI_API_KEY),
#         "gemini": bool(GENAI_OK),
#         "gemini_model": GEMINI_IMAGE_MODEL if GENAI_OK else None,
#     }

# # ---------------- REST: /api/edit ----------------
# @app.post("/api/edit", response_model=EditOut)
# async def api_edit(in_: EditIn):
#     print(f"[edit] provider={getattr(in_, 'provider', None)} prompt_len={len(in_.prompt or '')} has_img={bool(in_.image_data_url)}")

#     prompt = (in_.prompt or "").strip()
#     if not prompt:
#         raise HTTPException(400, "prompt is required")
#     if not in_.image_data_url:
#         raise HTTPException(400, "image_data_url is required")
#     if len(in_.image_data_url) < 50:
#         raise HTTPException(400, "image_data_url looks invalid (too short)")

#     try:
#         mime, img_bytes = decode_data_url(in_.image_data_url)
#     except Exception as e:
#         raise HTTPException(400, f"Invalid data URL: {e}")

#     if not validate_image(img_bytes):
#         raise HTTPException(400, "Invalid or corrupted image")

#     if in_.provider == "gpt":
#         return await handle_openai_edit(prompt, img_bytes, mime)
#     elif in_.provider == "gemini":
#         return await handle_gemini_edit(prompt, img_bytes, mime)
#     else:
#         raise HTTPException(400, "Unsupported provider")

# # -------- OpenAI (DALL·E) --------
# async def handle_openai_edit(prompt: str, img_bytes: bytes, mime: str) -> EditOut:
#     if not OPENAI_API_KEY:
#         raise HTTPException(500, "OPENAI_API_KEY not configured")

#     # We’ll directly use the image-edit endpoint (no masks) – simple transform prompt.
#     tmp_path = os.path.join(tempfile.gettempdir(), f"{uuid.uuid4().hex}.png")
#     try:
#         with open(tmp_path, "wb") as f:
#             f.write(img_bytes)

#         files = { "image": ("input.png", open(tmp_path, "rb"), "image/png") }
#         data = {
#             "model": "gpt-image-1",
#             "prompt": prompt,
#             "size": "1024x1024",
#             "response_format": "b64_json",
#         }
#         headers = { "Authorization": f"Bearer {OPENAI_API_KEY}" }

#         r = requests.post(
#             "https://api.openai.com/v1/images/edits",
#             headers=headers,
#             data=data,
#             files=files,
#             timeout=180,
#         )
#         if r.status_code != 200:
#             raise HTTPException(502, f"OpenAI edit HTTP {r.status_code}: {r.text}")

#         j = r.json()
#         item = (j.get("data") or [{}])[0]
#         b64 = item.get("b64_json")
#         if not b64:
#             # fallback if URL flow is returned
#             url = item.get("url")
#             if not url:
#                 raise HTTPException(502, f"OpenAI edit returned no image: {j}")
#             img = requests.get(url, timeout=60)
#             img.raise_for_status()
#             return EditOut(mime=img.headers.get("Content-Type", "image/png"), image_b64=to_b64(img.content))

#         return EditOut(mime="image/png", image_b64=b64)

#     except HTTPException:
#         raise
#     except requests.exceptions.RequestException as e:
#         raise HTTPException(502, f"OpenAI request failed: {e}")
#     except Exception as e:
#         traceback.print_exc()
#         raise HTTPException(502, f"OpenAI error: {e}")
#     finally:
#         try:
#             if os.path.exists(tmp_path):
#                 os.remove(tmp_path)
#         except Exception:
#             pass

# # -------- Google Gemini (image-capable model) --------
# async def handle_gemini_edit(prompt: str, img_bytes: bytes, mime: str) -> EditOut:
#     if not GENAI_OK:
#         raise HTTPException(500, "Gemini not configured. Set GOOGLE_API_KEY and install google-genai>=1.36.0")

#     try:
#         # IMPORTANT: Use the image-capable model name
#         # Contents: text prompt + inline image
#         resp = genai_client.models.generate_content(
#             model=GEMINI_IMAGE_MODEL,
#             contents=[{
#                 "role": "user",
#                 "parts": [
#                     {"text": prompt},
#                     {"inline_data": {"mime_type": mime, "data": base64.b64encode(img_bytes).decode("utf-8")}},
#                 ],
#             }],
#         )

#         # Parse the first inline image
#         img_b64 = None
#         out_mime = "image/png"
#         for cand in getattr(resp, "candidates", []) or []:
#             content = getattr(cand, "content", None)
#             if not content:
#                 continue
#             for part in getattr(content, "parts", []) or []:
#                 # SDK uses snake_case properties when accessed as attributes, but the dict-like
#                 # access above is safe for both.
#                 inline = getattr(part, "inline_data", None) or getattr(part, "inlineData", None)
#                 if inline:
#                     data = getattr(inline, "data", None) or (isinstance(inline, dict) and inline.get("data"))
#                     m = getattr(inline, "mime_type", None) or (isinstance(inline, dict) and inline.get("mime_type"))
#                     if data:
#                         img_b64 = data
#                         if m: out_mime = m
#                         break
#             if img_b64:
#                 break

#         if not img_b64:
#             # Often indicates safety block or quota issue; include server message if present
#             # The SDK raises for many errors already, but if it didn’t, we surface a useful message.
#             # Also handle the common quota error gracefully.
#             text_pieces = []
#             for cand in getattr(resp, "candidates", []) or []:
#                 content = getattr(cand, "content", None)
#                 if content:
#                     for part in getattr(content, "parts", []) or []:
#                         t = getattr(part, "text", None)
#                         if t: text_pieces.append(t)
#             extra = (" ".join(text_pieces))[:300] if text_pieces else "No image parts returned."
#             raise HTTPException(502, f"Gemini did not return an image. {extra}")

#         return EditOut(mime=out_mime, image_b64=img_b64)

#     except genai.errors.ClientError as e:
#         # 400/403/429, etc.
#         raise HTTPException(502, f"Gemini client error: {e}")
#     except Exception as e:
#         traceback.print_exc()
#         raise HTTPException(502, f"Gemini error: {e}")

# # ---------------- WebSockets: Pairing & Relay ----------------
# rooms: Dict[str, dict] = {}

# @app.post("/session")
# def create_session():
#     sid = uuid.uuid4().hex[:6].upper()
#     rooms[sid] = {}
#     print(f"[session] {sid}")
#     return {"sessionId": sid}

# @app.websocket("/ws")
# async def ws_endpoint(ws: WebSocket, session: str, role: str):
#     await ws.accept()
#     if session not in rooms:
#         await ws.close(code=4000); return
#     if role not in ("kiosk", "tablet"):
#         await ws.close(code=4001); return
#     if role in rooms[session] and rooms[session][role] is not None:
#         await ws.close(code=4002); return

#     rooms[session][role] = ws
#     try:
#         await ws.send_json({"type": "CONNECTED", "role": role})
#         await _broadcast(session, {"type": "PEER_STATUS", "role": role, "status": "online"})
#         while True:
#             msg = await ws.receive_json()
#             # Let kiosk do the /api/edit call (keeps keys server-side)
#             target = "kiosk" if role == "tablet" else "tablet"
#             await _relay(session, target, msg)
#     except WebSocketDisconnect:
#         pass
#     except Exception as e:
#         print("[WS] error:", e)
#     finally:
#         await _cleanup(session, role, ws)

# async def _relay(session: str, target: str, payload: dict):
#     peer = rooms.get(session, {}).get(target)
#     if peer:
#         try: await peer.send_json(payload)
#         except Exception: rooms[session][target] = None

# async def _broadcast(session: str, payload: dict):
#     for peer in rooms.get(session, {}).values():
#         try: await peer.send_json(payload)
#         except Exception: pass

# async def _cleanup(session: str, role: str, ws: WebSocket):
#     try:
#         if rooms.get(session, {}).get(role) is ws:
#             rooms[session][role] = None
#         if session in rooms and all(v is None for v in rooms[session].values()):
#             rooms.pop(session, None)
#         await _broadcast(session, {"type": "PEER_STATUS", "role": role, "status": "offline"})
#     except Exception:
#         pass

# # Periodic cleanup
# async def periodic_cleanup():
#     while True:
#         await asyncio.sleep(300)
#         stale = [s for s, conns in rooms.items() if all(v is None for v in conns.values())]
#         for s in stale:
#             rooms.pop(s, None)
#             print(f"[cleanup] removed {s}")

# @app.on_event("startup")
# async def startup_event():
#     asyncio.create_task(periodic_cleanup())

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)