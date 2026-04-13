import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCcw, Repeat } from "lucide-react";

export default function CameraCaptureCard({
  title,
  description,
  previewDataUrl,
  onCapture,
  accent = "emerald",
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [openingCamera, setOpeningCamera] = useState(false);
  const [facingMode, setFacingMode] = useState("user");

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async (nextFacingMode = facingMode) => {
    setOpeningCamera(true);
    setCameraError("");
    setCameraReady(false);
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: nextFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraReady(true);
      setFacingMode(nextFacingMode);
    } catch {
      setCameraError("Camera permission is required to capture live visit evidence on mobile and desktop.");
    } finally {
      setOpeningCamera(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const openOnMount = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "user" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraReady(true);
        setCameraError("");
        setFacingMode("user");
      } catch {
        setCameraReady(false);
        setCameraError("Tap Open Camera to launch the selfie camera on mobile.");
      }
    };

    openOnMount();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, []);

  const recapture = async () => {
    onCapture("");
    await startCamera(facingMode);
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(canvas.toDataURL("image/jpeg", 0.92));
  };

  const accentStyles =
    accent === "cyan"
      ? "border-cyan-200 bg-cyan-50/70 text-cyan-800"
      : "border-emerald-200 bg-emerald-50/70 text-emerald-800";

  return (
    <div className={`rounded-3xl border p-4 ${accentStyles}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <button
          type="button"
          onClick={recapture}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCcw size={15} />
          Reset
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border border-white/80 bg-slate-950">
        {previewDataUrl ? (
          <img src={previewDataUrl} alt={title} className="h-64 w-full object-cover" />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="h-64 w-full object-cover" />
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {cameraError ? <p className="mt-3 text-sm text-rose-700">{cameraError}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => startCamera(facingMode)}
          disabled={openingCamera}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Camera size={16} />
          {openingCamera ? "Opening..." : cameraReady ? "Reopen Camera" : "Open Camera"}
        </button>
        <button
          type="button"
          onClick={() => startCamera(facingMode === "user" ? "environment" : "user")}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Repeat size={16} />
          {facingMode === "user" ? "Use Back Camera" : "Use Selfie Camera"}
        </button>
        <button
          type="button"
          onClick={capture}
          disabled={!cameraReady}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Camera size={16} />
          Capture Photo
        </button>
      </div>
    </div>
  );
}
