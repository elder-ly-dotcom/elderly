import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import CameraCaptureCard from "../../components/app/CameraCaptureCard";
import apiClient from "../../lib/apiClient";
import { toApiUrl } from "../../lib/runtimeConfig";

export default function VisitReport() {
  const navigate = useNavigate();
  const { visitId } = useParams();
  const [tasks, setTasks] = useState([
    { title: "Fixed WhatsApp", is_completed: true, notes: "" },
    { title: "Ordered Medicines", is_completed: true, notes: "" },
  ]);
  const [notes, setNotes] = useState("");
  const [moodPhoto, setMoodPhoto] = useState(null);
  const [voiceNote, setVoiceNote] = useState(null);
  const [endPhoto, setEndPhoto] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
    };
  }, []);

  const uploadFile = async (file) => {
    if (!file) return null;
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post("/files/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return toApiUrl(response.data.url);
  };

  const completeVisit = () => {
    if (!endPhoto) {
      toast.error("Capture a live concluding photo before ending the visit.");
      return;
    }

    setSubmitting(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const moodPhotoUrl = await uploadFile(moodPhoto);
          const voiceNoteUrl = await uploadFile(voiceNote);
          await apiClient.post(`/visits/${visitId}/check-out`, {
            latitude: coords.latitude,
            longitude: coords.longitude,
            photo_data_url: endPhoto,
            notes,
            mood_photo_url: moodPhotoUrl,
            voice_note_url: voiceNoteUrl,
            voice_transcript: notes,
            tasks,
          });
          toast.success("Visit completed. Peace-of-mind report sent.");
          navigate("/worker/dashboard");
        } finally {
          setSubmitting(false);
        }
      },
      () => {
        setSubmitting(false);
        toast.error("Location permission is required to complete a visit.");
      }
    );
  };

  const startVoiceCapture = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice-to-text is not supported on this browser.");
      return;
    }
    recognitionRef.current?.stop?.();
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onerror = () => {
      setListening(false);
      toast.error("Voice capture could not start. Please try again.");
    };
    recognition.onend = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        setNotes((current) => `${current}${current ? "\n" : ""}${transcript}`.trim());
        toast.success("Voice note converted into visit summary.");
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <div className="rounded-[2rem] border border-cyan-100 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <h2 className="text-2xl font-semibold text-slate-900">Task reporting</h2>
        <div className="mt-5 space-y-3">
          {tasks.map((task, index) => (
            <div key={task.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-center gap-3 text-slate-800">
                <input
                  type="checkbox"
                  checked={task.is_completed}
                  onChange={(event) =>
                    setTasks((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, is_completed: event.target.checked } : item
                      )
                    )
                  }
                />
                <span>{task.title}</span>
              </label>
              <textarea
                value={task.notes}
                onChange={(event) =>
                  setTasks((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, notes: event.target.value } : item
                    )
                  )
                }
                placeholder="Add notes in English or Bengali"
                className="mt-3 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-300"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-5 rounded-[2rem] border border-emerald-100 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <h2 className="text-2xl font-semibold text-slate-900">Mandatory end-of-visit evidence</h2>
        <CameraCaptureCard
          title="Live camera check-out"
          description="End Visit remains disabled until the concluding live photo is captured."
          previewDataUrl={endPhoto}
          onCapture={setEndPhoto}
        />
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Summarize how the elder is feeling today."
          className="min-h-32 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-300 focus:bg-white"
        />
        <button
          type="button"
          onClick={startVoiceCapture}
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-medium text-cyan-700 transition hover:bg-cyan-100"
        >
          <Mic size={15} />
          {listening ? "Listening..." : "Voice-to-Text Summary"}
        </button>
        <label className="block rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4 text-sm text-slate-600">
          Upload mood photo
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setMoodPhoto(event.target.files?.[0] ?? null)}
            className="mt-2 block w-full"
          />
        </label>
        <label className="block rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/60 p-4 text-sm text-slate-600">
          Upload Bengali voice note
          <input
            type="file"
            accept="audio/*"
            onChange={(event) => setVoiceNote(event.target.files?.[0] ?? null)}
            className="mt-2 block w-full"
          />
        </label>
        <button
          onClick={completeVisit}
          disabled={!endPhoto || submitting}
          className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-white shadow-[0_12px_30px_rgba(16,185,129,0.22)] transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Ending Visit..." : "End Visit"}
        </button>
      </div>
    </div>
  );
}
