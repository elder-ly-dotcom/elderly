import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";

export default function SlideToConfirm({
  label,
  helperText,
  accentClassName = "from-rose-500 to-rose-600",
  confirmText = "Slide to confirm",
  onConfirm,
  disabled = false,
}) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState(0);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!dragging) return undefined;

    const handlePointerMove = (event) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const knobSize = 56;
      const next = Math.min(Math.max(event.clientX - rect.left - knobSize / 2, 0), rect.width - knobSize);
      setPosition(next);
    };

    const handlePointerUp = () => {
      const track = trackRef.current;
      if (!track) {
        setDragging(false);
        return;
      }
      const knobSize = 56;
      const threshold = Math.max(track.clientWidth - knobSize - 8, 0);
      if (position >= threshold) {
        setConfirmed(true);
        setPosition(threshold);
        onConfirm?.();
      } else {
        setPosition(0);
      }
      setDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragging, onConfirm, position]);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        {helperText ? <p className="mt-1 text-sm text-slate-500">{helperText}</p> : null}
      </div>

      <div
        ref={trackRef}
        className="relative h-16 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
      >
        <div className={`absolute inset-y-0 left-0 rounded-2xl bg-gradient-to-r ${accentClassName} transition-all`} style={{ width: `${position + 56}px` }} />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-16 text-sm font-semibold text-slate-600">
          {confirmed ? "Confirmed" : confirmText}
        </div>
        <button
          type="button"
          disabled={disabled || confirmed}
          onPointerDown={() => {
            if (disabled || confirmed) return;
            setDragging(true);
          }}
          className="absolute top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition disabled:cursor-not-allowed disabled:opacity-60"
          style={{ left: `${position}px` }}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
