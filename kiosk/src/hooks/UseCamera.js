import { useState, useRef, useCallback } from 'react';

export default function useCamera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);

  const openCamera = useCallback(async () => {
    if (stream) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
    } catch (e) {
      console.error("Could not open camera", e);
    }
  }, [stream]);

  const stopCamera = useCallback(() => {
    try {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      stream?.getTracks().forEach((t) => t.stop());
      setStream(null);
    } catch {}
  }, [stream]);

  const captureStill = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !stream) return "";
    
    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;
    
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/png");
  }, [stream]);

  return { videoRef, canvasRef, stream, openCamera, stopCamera, captureStill };
}