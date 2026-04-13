import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BellRing, CalendarClock, MapPinned, Phone, Siren } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import CameraCaptureCard from "../../components/app/CameraCaptureCard";
import ModalDialog from "../../components/app/ModalDialog";
import apiClient from "../../lib/apiClient";
import { WS_BASE_URL } from "../../lib/runtimeConfig";
import { useAuthStore } from "../../store/authStore";

const STAGE_LABELS = {
  ADMIN_NOTIFIED: "Admin Notified",
  WORKER_ASSIGNED: "Waiting For First Acceptance",
  WORKER_ACCEPTED: "Duty Accepted",
  WORKER_DELAYED_TRAFFIC: "Traffic Delay",
  WORKER_DELAYED_ON_VISIT: "On Another Visit",
  WORKER_ON_THE_WAY: "On The Way",
  WORKER_REACHED: "Worker Reached",
  WORK_IN_PROGRESS: "Work In Progress",
  RESOLVED: "Resolved",
  NO_WORKER_AVAILABLE: "No Worker Available",
};

function stageLabel(stage) {
  return STAGE_LABELS[stage] || stage?.replaceAll("_", " ") || "Unknown";
}

function getEmergencyActions(stage) {
  const actions = {
    WORKER_ASSIGNED: [
      { stage: "WORKER_ACCEPTED", label: "Accept Duty", tone: "emerald", note: "Worker accepted the SOS duty." },
      { stage: "WORKER_DELAYED_TRAFFIC", label: "Stuck In Traffic", tone: "amber", note: "Worker reported traffic delay but stays available." },
      { stage: "WORKER_DELAYED_ON_VISIT", label: "On Another Visit", tone: "slate", note: "Worker is wrapping up another visit first." },
    ],
    WORKER_ACCEPTED: [
      { stage: "WORKER_ON_THE_WAY", label: "Start Travel", tone: "cyan", note: "Worker is now on the way." },
      { stage: "WORKER_DELAYED_TRAFFIC", label: "Traffic Delay", tone: "amber", note: "Worker reported a traffic delay while travelling." },
      { stage: "WORKER_DELAYED_ON_VISIT", label: "Still On Visit", tone: "slate", note: "Worker is delayed because another visit is still closing out." },
    ],
    WORKER_DELAYED_TRAFFIC: [
      { stage: "WORKER_ON_THE_WAY", label: "Back On Route", tone: "cyan", note: "Traffic cleared and worker is back on the way." },
      { stage: "WORKER_REACHED", label: "Reached Now", tone: "emerald", note: "Worker reached the location after delay." },
    ],
    WORKER_DELAYED_ON_VISIT: [
      { stage: "WORKER_ACCEPTED", label: "Ready Now", tone: "emerald", note: "Worker is free now and has accepted the duty." },
      { stage: "WORKER_ON_THE_WAY", label: "Leave For SOS", tone: "cyan", note: "Worker has left the previous assignment and is on the way." },
    ],
    WORKER_ON_THE_WAY: [
      { stage: "WORKER_REACHED", label: "Reached Location", tone: "emerald", note: "Worker reached the emergency location." },
      { stage: "WORKER_DELAYED_TRAFFIC", label: "Traffic Delay", tone: "amber", note: "Worker hit traffic while on the way." },
    ],
    WORKER_REACHED: [{ stage: "WORK_IN_PROGRESS", label: "Start Support", tone: "indigo", note: "Worker has started on-site emergency support." }],
    WORK_IN_PROGRESS: [{ stage: "RESOLVED", label: "Mark Resolved", tone: "emerald", note: "Worker completed the emergency support and resolved the incident." }],
  };
  return actions[stage] || [];
}

function actionClass(tone) {
  const styles = {
    cyan: "bg-cyan-500 hover:bg-cyan-600",
    emerald: "bg-emerald-500 hover:bg-emerald-600",
    amber: "bg-amber-500 hover:bg-amber-600",
    indigo: "bg-indigo-500 hover:bg-indigo-600",
    slate: "bg-slate-700 hover:bg-slate-800",
  };
  return styles[tone] || styles.cyan;
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-3xl border border-cyan-100 bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

const WEEK_DAYS = [
  { value: 0, label: "Mon" },
  { value: 1, label: "Tue" },
  { value: 2, label: "Wed" },
  { value: 3, label: "Thu" },
  { value: 4, label: "Fri" },
  { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
];

function WorkerShiftManager({ initialShifts, onSave }) {
  const [shifts, setShifts] = useState(
    WEEK_DAYS.map((day) => {
      const existing = initialShifts.find((item) => item.day_of_week === day.value);
      return (
        existing || {
          day_of_week: day.value,
          is_active: false,
          start_time: "09:00:00",
          end_time: "18:00:00",
        }
      );
    })
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setShifts(
      WEEK_DAYS.map((day) => {
        const existing = initialShifts.find((item) => item.day_of_week === day.value);
        return (
          existing || {
            day_of_week: day.value,
            is_active: false,
            start_time: "09:00:00",
            end_time: "18:00:00",
          }
        );
      })
    );
  }, [initialShifts]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {WEEK_DAYS.map((day) => {
          const shift = shifts.find((item) => item.day_of_week === day.value);
          return (
            <div key={day.value} className="grid grid-cols-[0.9fr_0.8fr_0.8fr_auto] items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">{day.label}</p>
              <input
                type="time"
                value={(shift?.start_time || "09:00:00").slice(0, 5)}
                disabled={!shift?.is_active}
                onChange={(event) =>
                  setShifts((current) =>
                    current.map((item) =>
                      item.day_of_week === day.value ? { ...item, start_time: `${event.target.value}:00` } : item
                    )
                  )
                }
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100"
              />
              <input
                type="time"
                value={(shift?.end_time || "18:00:00").slice(0, 5)}
                disabled={!shift?.is_active}
                onChange={(event) =>
                  setShifts((current) =>
                    current.map((item) =>
                      item.day_of_week === day.value ? { ...item, end_time: `${event.target.value}:00` } : item
                    )
                  )
                }
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100"
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(shift?.is_active)}
                  onChange={(event) =>
                    setShifts((current) =>
                      current.map((item) =>
                        item.day_of_week === day.value ? { ...item, is_active: event.target.checked } : item
                      )
                    )
                  }
                />
                Active
              </label>
            </div>
          );
        })}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave(shifts);
            } finally {
              setSaving(false);
            }
          }}
          className="rounded-2xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-600 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Shifts"}
        </button>
      </div>
    </div>
  );
}

export default function WorkerDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const hydrateUser = useAuthStore((state) => state.hydrateUser);
  const [elders, setElders] = useState([]);
  const [activeVisit, setActiveVisit] = useState(null);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [dailySummary, setDailySummary] = useState({ completed_visits_today: 0, completed_emergencies_today: 0 });
  const [pendingStart, setPendingStart] = useState(null);
  const [startPhoto, setStartPhoto] = useState("");
  const [startingVisit, setStartingVisit] = useState(false);
  const [updatingStage, setUpdatingStage] = useState("");
  const [selectedPanel, setSelectedPanel] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [availableForDispatch, setAvailableForDispatch] = useState(user?.available_for_dispatch ?? true);
  const [sosAttention, setSosAttention] = useState(false);
  const [workerShifts, setWorkerShifts] = useState([]);
  const [currentCoords, setCurrentCoords] = useState(null);
  const audioContextRef = useRef(null);
  const sirenTimerRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const htmlAudioRef = useRef(null);

  useEffect(() => {
    setAvailableForDispatch(user?.available_for_dispatch ?? true);
  }, [user?.available_for_dispatch]);

  const stopSiren = useCallback(() => {
    if (sirenTimerRef.current) {
      clearInterval(sirenTimerRef.current);
      sirenTimerRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (htmlAudioRef.current) {
      htmlAudioRef.current.pause();
      htmlAudioRef.current.currentTime = 0;
    }
  }, []);

  const ensureAudioReady = useCallback(async () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }
    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const unlockAudio = useCallback(async () => {
    try {
      const context = await ensureAudioReady();
      if (context && !audioUnlockedRef.current) {
        const buffer = context.createBuffer(1, 1, 22050);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);
        audioUnlockedRef.current = true;
      }
      if (htmlAudioRef.current) {
        htmlAudioRef.current.muted = true;
        const playPromise = htmlAudioRef.current.play();
        if (playPromise?.then) {
          await playPromise;
        }
        htmlAudioRef.current.pause();
        htmlAudioRef.current.currentTime = 0;
        htmlAudioRef.current.muted = false;
      }
    } catch {
      // iOS may still require a later explicit gesture; keep retry path alive.
    }
  }, [ensureAudioReady]);

  const playSiren = useCallback(() => {
    if (sirenTimerRef.current) return;
    const pulse = async () => {
      const context = await ensureAudioReady();
      if (!context) return;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      oscillator.frequency.linearRampToValueAtTime(1280, context.currentTime + 0.24);
      oscillator.frequency.linearRampToValueAtTime(760, context.currentTime + 0.48);
      gainNode.gain.setValueAtTime(0.0001, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.24, context.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.62);
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.62);
    };
    pulse().catch(() => {});
    sirenTimerRef.current = setInterval(pulse, 800);

    if (htmlAudioRef.current) {
      htmlAudioRef.current.volume = 1;
      htmlAudioRef.current.loop = true;
      htmlAudioRef.current.play().catch(() => {});
    }
  }, [ensureAudioReady]);

  const load = async () => {
    const [eldersResult, activeVisitResult, emergencyResult, summaryResult, shiftsResult] = await Promise.allSettled([
      apiClient.get("/visits/assigned-elders"),
      apiClient.get("/visits/active"),
      apiClient.get("/emergency/history"),
      apiClient.get("/reports/worker/daily"),
      apiClient.get("/visits/worker/shifts"),
    ]);

    setElders(eldersResult.status === "fulfilled" ? eldersResult.value.data : []);
    setActiveVisit(activeVisitResult.status === "fulfilled" ? activeVisitResult.value.data : null);
    setDailySummary(
      summaryResult.status === "fulfilled"
        ? summaryResult.value.data
        : { completed_visits_today: 0, completed_emergencies_today: 0 }
    );
    setWorkerShifts(shiftsResult.status === "fulfilled" ? shiftsResult.value.data : []);
    if (emergencyResult.status === "fulfilled") {
      const latestOpen = emergencyResult.value.data.find((item) => item.status === "PENDING");
      setActiveEmergency(latestOpen || null);
    } else {
      setActiveEmergency(null);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;

    const handleUnlock = () => {
      unlockAudio().catch(() => {});
      window.removeEventListener("pointerdown", handleUnlock);
      window.removeEventListener("keydown", handleUnlock);
      window.removeEventListener("touchstart", handleUnlock);
      window.removeEventListener("touchend", handleUnlock);
      document.removeEventListener("click", handleUnlock, true);
    };
    window.addEventListener("pointerdown", handleUnlock, { passive: true });
    window.addEventListener("keydown", handleUnlock, { passive: true });
    window.addEventListener("touchstart", handleUnlock, { passive: true });
    window.addEventListener("touchend", handleUnlock, { passive: true });
    document.addEventListener("click", handleUnlock, true);

    const socket = new WebSocket(`${WS_BASE_URL}/emergency/ws/worker/${user.id}`);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "visit_dispatch") {
        toast.success(payload.message || "A new visit request was auto-assigned to you.");
        load();
        return;
      }
      if (payload.type === "emergency") {
        toast.error(payload.message || "Emergency alert received.");
        if (payload.siren) {
          setSosAttention(true);
          playSiren();
        }
        load();
      }
      if (payload.type === "emergency_claimed") {
        stopSiren();
        setSosAttention(false);
        toast.success("Another nearby worker accepted this SOS.");
        load();
      }
      if (payload.type === "emergency_stage_update") {
        if (payload.siren === false) {
          stopSiren();
          setSosAttention(false);
        }
        toast.success(`Emergency updated: ${stageLabel(payload.stage)}`);
        load();
      }
    };
    const timer = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send("ping");
      }
    }, 25000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pointerdown", handleUnlock);
      window.removeEventListener("keydown", handleUnlock);
      window.removeEventListener("touchstart", handleUnlock);
      window.removeEventListener("touchend", handleUnlock);
      document.removeEventListener("click", handleUnlock, true);
      stopSiren();
      socket.close();
    };
  }, [playSiren, stopSiren, unlockAudio, user?.id]);

  useEffect(() => {
    if (user?.available_for_dispatch == null) return;
    const pushLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          setCurrentCoords({ latitude: coords.latitude, longitude: coords.longitude });
          try {
            await apiClient.post("/visits/worker-status", {
              latitude: coords.latitude,
              longitude: coords.longitude,
              available_for_dispatch: user.available_for_dispatch,
            });
          } catch {
            // Best-effort presence update only.
          }
        },
        () => {}
      );
    };
    pushLocation();
    const intervalId = setInterval(pushLocation, 30000);
    return () => clearInterval(intervalId);
  }, [user?.available_for_dispatch]);

  useEffect(() => {
    if (activeEmergency?.current_stage === "WORKER_ASSIGNED" && !activeEmergency?.assigned_worker_id) {
      setSosAttention(true);
      playSiren();
      return;
    }
    setSosAttention(false);
    stopSiren();
  }, [activeEmergency?.assigned_worker_id, activeEmergency?.current_stage, playSiren, stopSiren]);

  const emergencyActions = useMemo(
    () => getEmergencyActions(activeEmergency?.current_stage),
    [activeEmergency?.current_stage]
  );

  const selectedLocation = useMemo(
    () => elders.find((elder) => elder.elder_id === selectedLocationId) || null,
    [elders, selectedLocationId]
  );

  const selectedLocationEta = useMemo(() => {
    if (!selectedLocation || !currentCoords) return null;
    const toRadians = (value) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRadians(selectedLocation.home_latitude - currentCoords.latitude);
    const dLon = toRadians(selectedLocation.home_longitude - currentCoords.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(currentCoords.latitude)) *
        Math.cos(toRadians(selectedLocation.home_latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const distanceKm = 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return {
      distanceKm: distanceKm.toFixed(1),
      etaMinutes: Math.max(2, Math.round((distanceKm / 20) * 60)),
    };
  }, [currentCoords, selectedLocation]);

  const openStartFlow = (elder) => {
    setPendingStart(elder);
    setStartPhoto("");
    setSelectedPanel("checkin");
  };

  const confirmStartVisit = () => {
    if (!pendingStart || !startPhoto) {
      toast.error("Capture a live photo before starting the visit.");
      return;
    }
    setStartingVisit(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const response = await apiClient.post("/visits/verify", {
            elder_id: pendingStart.elder_id,
            latitude: coords.latitude,
            longitude: coords.longitude,
            photo_data_url: startPhoto,
          });
          toast.success("Visit started successfully.");
          setPendingStart(null);
          setStartPhoto("");
          setSelectedPanel("");
          await load();
          navigate(`/worker/report/${response.data.visit.id}`);
        } catch (error) {
          toast.error(error?.response?.data?.detail || "Proximity Error");
        } finally {
          setStartingVisit(false);
        }
      },
      () => {
        setStartingVisit(false);
        toast.error("Location permission is required to start a visit.");
      }
    );
  };

  const continueVisit = (visitId) => {
    navigate(`/worker/report/${visitId}`);
  };

  const triggerSOS = (location) => {
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      await apiClient.post("/emergency/trigger", {
        location_address: location.home_address,
        message: `Worker triggered SOS for ${location.home_address}.`,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      toast.error("SOS alert sent to admins, customer, and the nearest worker pool.");
    });
  };

  const moveEmergencyStage = async (nextStage, note) => {
    if (!activeEmergency) return;
    setUpdatingStage(nextStage);
    try {
      await apiClient.patch(`/emergency/${activeEmergency.id}/stage`, {
        stage: nextStage,
        note,
      });
      if (nextStage === "WORKER_ACCEPTED") {
        stopSiren();
        setSosAttention(false);
      }
      await load();
    } finally {
      setUpdatingStage("");
    }
  };

  const toggleAvailability = () => {
    const nextValue = !availableForDispatch;
    setAvailabilitySaving(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          await apiClient.post("/visits/worker-status", {
            latitude: coords.latitude,
            longitude: coords.longitude,
            available_for_dispatch: nextValue,
          });
          const response = await apiClient.get("/auth/me");
          hydrateUser(response.data);
          setAvailableForDispatch(response.data.available_for_dispatch);
          toast.success(nextValue ? "You are active for services." : "You are inactive for new assignments.");
        } finally {
          setAvailabilitySaving(false);
        }
      },
      async () => {
        try {
          await apiClient.post("/visits/worker-status", {
            latitude: user?.current_latitude ?? 0,
            longitude: user?.current_longitude ?? 0,
            available_for_dispatch: nextValue,
          });
          const response = await apiClient.get("/auth/me");
          hydrateUser(response.data);
          setAvailableForDispatch(response.data.available_for_dispatch);
          toast.success(nextValue ? "You are active for services." : "You are inactive for new assignments.");
        } catch {
          toast.error("Location permission helps update availability accurately.");
        } finally {
          setAvailabilitySaving(false);
        }
      }
    );
  };

  if (user && !user.is_verified) {
    return (
      <div className="space-y-4 overflow-hidden">
        <section className="rounded-[1.75rem] border border-amber-200 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-700">Approval Pending</p>
          <h2 className="mt-2 text-[1.85rem] font-semibold text-slate-900">Your worker account is waiting for admin approval</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Until approval is complete, you will not receive auto-assigned visits or SOS duty. Once approved, this portal will switch to the live dispatch view automatically.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={async () => {
                await apiClient.post("/auth/workers/me/remind-approval");
                toast.success("Approval reminder sent to admin.");
              }}
              className="rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
            >
              Remind Admin
            </button>
            <button
              type="button"
              onClick={() => toast("Contact admin through your onboarding channel for document review.")}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Contact
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-hidden">
      <audio
        ref={htmlAudioRef}
        preload="auto"
        playsInline
        src="https://actions.google.com/sounds/v1/emergency/emergency_alarm.ogg"
      />
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.75rem] border border-cyan-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-xl font-semibold text-slate-900">Visit Schedule</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedPanel("shifts")}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <CalendarClock size={15} />
                Manage Shifts
              </button>
              <button
                type="button"
                onClick={toggleAvailability}
                disabled={availabilitySaving}
                className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${
                  availableForDispatch
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {availabilitySaving ? "Saving..." : availableForDispatch ? "Set Inactive" : "Set Active"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedPanel("emergency")}
                className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                  sosAttention
                    ? "animate-pulse border border-rose-500 bg-rose-500 text-white shadow-[0_0_0_6px_rgba(244,63,94,0.18)] hover:bg-rose-600"
                    : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              >
                {sosAttention ? "SOS Duty Alert" : "SOS Duty"}
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {elders.length ? (
              elders.map((elder) => {
                const visitIsOngoing = Boolean(elder.active_visit_id);
                const visitIsPending = Boolean(elder.pending_visit_id);
                const anotherVisitIsActive = Boolean(activeVisit && activeVisit.elder_id !== elder.elder_id);

                return (
                  <div key={elder.elder_id} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-slate-900">
                          {elder.elder_count > 1 ? `${elder.elder_count} elders at this location` : elder.elder_name}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {visitIsOngoing ? "Visit Ongoing" : visitIsPending ? "Pending Start" : "No open request"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {elder.customer_phone ? (
                          <a
                            href={`tel:${elder.customer_phone}`}
                            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                          >
                            <Phone size={15} />
                            Call
                          </a>
                        ) : null}
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                            `${elder.home_latitude},${elder.home_longitude}`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-100"
                        >
                          <MapPinned size={15} />
                          Navigate
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLocationId(elder.elder_id);
                            setSelectedPanel("location");
                          }}
                          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          View
                        </button>
                        {visitIsOngoing ? (
                          <button
                            onClick={() => continueVisit(elder.active_visit_id)}
                            className="rounded-2xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
                          >
                            Continue
                          </button>
                        ) : (
                          <button
                            onClick={() => openStartFlow(elder)}
                            disabled={anotherVisitIsActive || !visitIsPending}
                            className="rounded-2xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Start Visit
                          </button>
                        )}
                        {visitIsOngoing ? (
                          <button
                            onClick={() => triggerSOS(elder)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"
                          >
                            <Siren size={15} />
                            SOS
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No open location visits are assigned right now.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-emerald-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <h3 className="text-xl font-semibold text-slate-900">Today At A Glance</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MetricCard label="Assigned Locations" value={elders.length} hint="Open visit cards" />
            <MetricCard label="Visits Finished Today" value={dailySummary.completed_visits_today} hint="Completed visits" />
            <MetricCard label="Emergencies Finished Today" value={dailySummary.completed_emergencies_today} hint="Resolved SOS duties" />
            <MetricCard
              label="Service Status"
              value={availableForDispatch ? "Active" : "Inactive"}
              hint={availableForDispatch ? "You can receive new assignments" : "You will not be auto-assigned"}
            />
          </div>
        </div>
      </section>

      <ModalDialog
        open={selectedPanel === "location" && Boolean(selectedLocation)}
        title="Location Details"
        onClose={() => setSelectedPanel("")}
      >
        {selectedLocation ? (
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-base font-semibold text-slate-900">{selectedLocation.home_address}</p>
              <p className="mt-2 text-sm text-slate-600">{selectedLocation.elder_names.join(", ")}</p>
              <p className="mt-1 text-sm text-slate-600">Pod: {selectedLocation.pod_name || "Unassigned pod"}</p>
              <p className="mt-1 text-sm text-slate-600">
                Customer: {selectedLocation.customer_name || "Unknown"}{selectedLocation.customer_phone ? ` | ${selectedLocation.customer_phone}` : ""}
              </p>
              {selectedLocationEta ? (
                <p className="mt-1 text-sm text-slate-600">
                  Live ETA: {selectedLocationEta.etaMinutes} mins | {selectedLocationEta.distanceKm} km away
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              {selectedLocation.customer_phone ? (
                <a
                  href={`tel:${selectedLocation.customer_phone}`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <Phone size={16} />
                  Call Customer
                </a>
              ) : null}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                  `${selectedLocation.home_latitude},${selectedLocation.home_longitude}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 font-semibold text-cyan-700 transition hover:bg-cyan-100"
              >
                <MapPinned size={16} />
                Open Navigation
              </a>
              {selectedLocation.active_visit_id ? (
                <button
                  type="button"
                  onClick={() => continueVisit(selectedLocation.active_visit_id)}
                  className="rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-white transition hover:bg-emerald-600"
                >
                  Continue Active Visit
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openStartFlow(selectedLocation)}
                  className="rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-white transition hover:bg-cyan-600"
                >
                  Start Visit
                </button>
              )}
            </div>
          </div>
        ) : null}
      </ModalDialog>

      <ModalDialog open={selectedPanel === "shifts"} title="Shift Management" onClose={() => setSelectedPanel("")}>
        <WorkerShiftManager
          initialShifts={workerShifts}
          onSave={async (shifts) => {
            await apiClient.put("/visits/worker/shifts", { shifts });
            toast.success("Weekly shifts updated.");
            await load();
            setSelectedPanel("");
          }}
        />
      </ModalDialog>

      <ModalDialog open={selectedPanel === "emergency"} title="SOS Duty Details" onClose={() => setSelectedPanel("")}>
        {activeEmergency ? (
          <div className="space-y-4">
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm text-rose-700">Current Duty</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{stageLabel(activeEmergency.current_stage)}</p>
              <p className="mt-2 text-sm text-slate-600">{activeEmergency.location_address}</p>
              <p className="mt-1 text-sm text-slate-600">{activeEmergency.elder_names?.join(", ") || activeEmergency.elder_name}</p>
              <p className="mt-2 text-sm text-slate-700">
                {activeEmergency.current_stage === "WORKER_ASSIGNED" && !activeEmergency.assigned_worker_id
                  ? `${activeEmergency.candidate_workers_notified || 0} nearby workers were alerted. First accepted worker will take the duty.`
                  : `Assigned worker: ${activeEmergency.assigned_worker_name || "Awaiting assignment"}${activeEmergency.assigned_worker_phone ? ` | ${activeEmergency.assigned_worker_phone}` : ""}`}
              </p>
            </div>

            <div className="rounded-3xl border border-rose-100 bg-white p-4">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-rose-700">Next Update</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {emergencyActions.length ? (
                  emergencyActions.map((action) => (
                    <button
                      key={action.stage}
                      type="button"
                      onClick={() => moveEmergencyStage(action.stage, action.note)}
                      disabled={Boolean(updatingStage)}
                      className={`rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${actionClass(action.tone)}`}
                    >
                      {updatingStage === action.stage ? "Updating..." : action.label}
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No further worker actions are available for the current stage.</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {activeEmergency.stage_updates
                ?.slice()
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                .map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">{stageLabel(entry.stage)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(entry.created_at).toLocaleString()} | {entry.updated_by_name || "System"}
                      {entry.updated_by_phone ? ` | ${entry.updated_by_phone}` : ""}
                    </p>
                    {entry.note ? <p className="mt-1 text-sm text-slate-600">{entry.note}</p> : null}
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No active SOS assignment right now.
          </p>
        )}
      </ModalDialog>

      <ModalDialog
        open={selectedPanel === "checkin" && Boolean(pendingStart)}
        title="Mandatory Check-in"
        onClose={() => {
          setSelectedPanel("");
          setPendingStart(null);
          setStartPhoto("");
        }}
        widthClass="max-w-5xl"
      >
        {pendingStart ? (
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <CameraCaptureCard
              title="Live camera check-in"
              description="Start Visit stays locked until a real-time camera frame is captured."
              previewDataUrl={startPhoto}
              onCapture={setStartPhoto}
              accent="cyan"
            />

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">Readiness</p>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <p className="rounded-2xl bg-white px-4 py-3">
                  Location members: <span className="font-semibold text-slate-900">{pendingStart.elder_names.join(", ")}</span>
                </p>
                <p className="rounded-2xl bg-white px-4 py-3">
                  Dispatch:{" "}
                  <span className="font-semibold text-slate-900">
                    {pendingStart.pending_visit_id ? `Auto-assigned visit #${pendingStart.pending_visit_id}` : "Direct assigned elder"}
                  </span>
                </p>
                <p className="rounded-2xl bg-white px-4 py-3">
                  Photo evidence:{" "}
                  <span className={`font-semibold ${startPhoto ? "text-emerald-700" : "text-amber-700"}`}>
                    {startPhoto ? "Captured" : "Required before start"}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={confirmStartVisit}
                disabled={!startPhoto || startingVisit}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <BellRing size={16} />
                {startingVisit ? "Starting Visit..." : "Start Visit"}
              </button>
            </div>
          </div>
        ) : null}
      </ModalDialog>
    </div>
  );
}
