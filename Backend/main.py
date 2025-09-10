import os
import base64
import uuid
import tempfile
import traceback
from typing import Literal, Tuple

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

app = FastAPI(title="Vision Backend (REST)")

ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
ALLOWED_ORIGINS = [o.strip() for o in ALLOWED_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------ Models ------------
class EditIn(BaseModel):
    provider: Literal["gpt", "gemini"]   # "gemini" = Banana
    prompt: str
    image_data_url: str                  # ALWAYS required (image-to-image)

class EditOut(BaseModel):
    mime: str
    image_b64: str

# ------------ Helpers ------------
def decode_data_url(data_url: str) -> Tuple[str, bytes]:
    """
    Decode data URL like 'data:image/png;base64,AAAA...' -> (mime, bytes)
    """
    if not data_url.startswith("data:"):
        raise ValueError("image_data_url must be a data URL")
    header, b64 = data_url.split(",", 1)
    mime = header.split(";")[0].split(":")[1] if ":" in header else "image/png"
    return mime, base64.b64decode(b64)

def to_data_b64(content: bytes) -> str:
    return base64.b64encode(content).decode("utf-8")

# ------------ Routes ------------
@app.get("/ping")
def ping():
    return {"ok": True}

@app.post("/api/edit", response_model=EditOut)
def api_edit(in_: EditIn):
    prompt = (in_.prompt or "").strip()
    if not prompt:
        raise HTTPException(400, "prompt is required")
    if not in_.image_data_url:
        raise HTTPException(400, "image_data_url is required")

    mime, img_bytes = decode_data_url(in_.image_data_url)
    print(f"[edit] provider={in_.provider} prompt_len={len(prompt)} img_bytes={len(img_bytes)} mime={mime}")

    if in_.provider == "gpt":
        # ---- OpenAI: REST /v1/images/edits with multipart/form-data ----
        if not OPENAI_API_KEY:
            raise HTTPException(500, "OPENAI_API_KEY not configured")

        tmp_path = os.path.join(tempfile.gettempdir(), f"{uuid.uuid4().hex}.png")
        with open(tmp_path, "wb") as f:
            f.write(img_bytes)
        print(f"[edit:gpt] saved → {tmp_path}")

        try:
            with open(tmp_path, "rb") as f:
                files = {
                    "image": ("selfie.png", f, "image/png"),
                }
                data = {
                    "model": "gpt-image-1",
                    "prompt": prompt,
                    "size": "1024x1024",
                }
                headers = {
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                }
                r = requests.post(
                    "https://api.openai.com/v1/images/edits",
                    headers=headers,
                    data=data,
                    files=files,
                    timeout=120,
                )

            if r.status_code != 200:
                raise HTTPException(502, f"OpenAI edit HTTP {r.status_code}: {r.text}")

            j = r.json()
            item = (j.get("data") or [{}])[0]

            if "b64_json" in item:
                return EditOut(mime="image/png", image_b64=item["b64_json"])

            if "url" in item:
                img = requests.get(item["url"], timeout=60)
                img.raise_for_status()
                return EditOut(
                    mime=img.headers.get("Content-Type", "image/png"),
                    image_b64=to_data_b64(img.content),
                )

            raise HTTPException(502, f"OpenAI edit returned no image: {j}")

        except HTTPException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(502, f"OpenAI edit error: {e}")
        finally:
            # Always cleanup
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                print(f"[edit:gpt] cleaned → {tmp_path}")

    elif in_.provider == "gemini":
        # ---- Gemini Banana: gemini-2.5-flash-image-preview via REST ----
        if not GOOGLE_API_KEY:
            raise HTTPException(500, "GOOGLE_API_KEY not configured")

        try:
            url = (
                "https://generativelanguage.googleapis.com/"
                "v1beta/models/gemini-2.5-flash-image-preview:generateContent"
                f"?key={GOOGLE_API_KEY}"
            )
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {
                                "inline_data": {
                                    "mime_type": mime,
                                    "data": to_data_b64(img_bytes),
                                }
                            },
                            {"text": prompt},
                        ],
                    }
                ]
            }

            r = requests.post(url, json=payload, timeout=120)
            if r.status_code != 200:
                raise HTTPException(502, f"Gemini error {r.status_code}: {r.text}")

            j = r.json()
            out_b64, out_mime = None, "image/png"

            for cand in j.get("candidates", []):
                for part in cand.get("content", {}).get("parts", []):
                    if "inline_data" in part:
                        inline = part["inline_data"]
                        out_b64 = inline.get("data")
                        out_mime = inline.get("mime_type", out_mime)
                        break
                if out_b64:
                    break

            if not out_b64:
                raise HTTPException(502, f"Gemini did not return an image: {j}")

            return EditOut(mime=out_mime, image_b64=out_b64)

        except HTTPException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(502, f"Gemini edit error: {e}")

    else:
        raise HTTPException(400, "Unsupported provider")