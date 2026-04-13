import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import apiClient from "../../lib/apiClient";
import { WS_BASE_URL } from "../../lib/runtimeConfig";

const STAGE_LABELS = {
  ADMIN_NOTIFIED: "Admin Notified",
  WORKER_ASSIGNED: "Worker Assigned",
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

export default function EmergencyHub() {
  const [alerts, setAlerts] = useState([]);
  const audioRef = useRef(null);

  const loadHistory = () => apiClient.get("/emergency/history").then((response) => setAlerts(response.data));

  useEffect(() => {
    let cancelled = false;
    apiClient.get("/emergency/history").then((response) => {
      if (!cancelled) {
        setAlerts(response.data);
      }
    });
    const socket = new WebSocket(`${WS_BASE_URL}/emergency/ws/admin`);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "emergency") {
        audioRef.current?.play().catch(() => {});
        toast.error(`Emergency: ${payload.location_address || payload.elder_name}`);
        loadHistory();
        return;
      }
      if (payload.type === "emergency_stage_update") {
        toast.success(`Emergency #${payload.alert_id}: ${stageLabel(payload.stage)}`);
        loadHistory();
      }
    };
    const timer = setInterval(() => socket.readyState === WebSocket.OPEN && socket.send("ping"), 25000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      socket.close();
    };
  }, []);

  const respond = async (alertId) => {
    await apiClient.patch(`/emergency/${alertId}/respond`, {
      action_taken: "Admin acknowledged, called local emergency contact, and closed the emergency loop.",
    });
    toast.success("Emergency marked as responded.");
    loadHistory();
  };

  return (
    <div className="rounded-[2rem] border border-rose-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <audio ref={audioRef} src="https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg" preload="auto" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Emergency Hub</h2>
          <p className="mt-1 text-sm text-slate-600">Live SOS stream with worker assignment and named stage history.</p>
        </div>
        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-rose-700">
          {alerts.filter((item) => item.status === "PENDING").length} open
        </span>
      </div>

      <div className="mt-5 grid gap-3">
        {alerts.length ? (
          alerts.map((alert) => (
            <div key={alert.id} className="rounded-3xl border border-rose-200 bg-gradient-to-r from-rose-50 via-white to-orange-50 p-4">
              <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose-700">
                      Alert #{alert.id}
                    </span>
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
                      {stageLabel(alert.current_stage)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {alert.status}
                    </span>
                  </div>

                  <h3 className="mt-3 text-lg font-semibold text-slate-900">{alert.location_address || "Unknown location"}</h3>
                  <p className="mt-1 text-sm text-slate-700">{alert.elder_names?.join(", ") || alert.elder_name}</p>
                  <p className="mt-2 text-sm text-slate-600">{alert.message}</p>
                  <p className="mt-2 text-xs text-slate-500">{new Date(alert.start_time).toLocaleString()}</p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-rose-100 bg-white/80 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Triggered By</p>
                      <p className="mt-1 font-semibold text-slate-900">{alert.triggered_by_name || "Unknown"}</p>
                      <p className="text-sm text-slate-600">{alert.triggered_by_phone || "No phone"}</p>
                    </div>
                    <div className="rounded-2xl border border-rose-100 bg-white/80 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Assigned Worker</p>
                      <p className="mt-1 font-semibold text-slate-900">{alert.assigned_worker_name || "Waiting for assignment"}</p>
                      <p className="text-sm text-slate-600">{alert.assigned_worker_phone || "No phone"}</p>
                    </div>
                    <div className="rounded-2xl border border-rose-100 bg-white/80 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Address History</p>
                      <p className="mt-1 font-semibold text-slate-900">{alert.location_emergency_count} resolved</p>
                      <p className="text-sm text-slate-600">Emergency responses at this address</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-3xl border border-rose-100 bg-white/80 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-rose-700">Audit Trail</p>
                    <div className="mt-3 space-y-2">
                      {alert.stage_updates
                        ?.slice()
                        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                        .map((entry) => (
                          <div key={entry.id} className="rounded-2xl bg-slate-50 px-3 py-2">
                            <p className="text-sm font-medium text-slate-900">{stageLabel(entry.stage)}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(entry.created_at).toLocaleString()} | {entry.updated_by_name || "System"}
                              {entry.updated_by_role ? ` | ${entry.updated_by_role}` : ""}
                              {entry.updated_by_phone ? ` | ${entry.updated_by_phone}` : ""}
                            </p>
                            {entry.note ? <p className="mt-1 text-xs text-slate-600">{entry.note}</p> : null}
                          </div>
                        ))}
                    </div>
                  </div>

                  {alert.status === "PENDING" ? (
                    <button
                      onClick={() => respond(alert.id)}
                      className="w-full rounded-2xl bg-rose-500 px-4 py-3 font-semibold text-white shadow-[0_12px_30px_rgba(244,63,94,0.18)] transition hover:bg-rose-600"
                    >
                      Mark Responded
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No emergency incidents yet.
          </p>
        )}
      </div>
    </div>
  );
}
