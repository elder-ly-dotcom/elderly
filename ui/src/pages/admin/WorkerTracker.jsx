import { useEffect, useMemo, useState } from "react";
import { MapPin, Phone, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import apiClient from "../../lib/apiClient";

function buildBounds(workers) {
  if (!workers.length) return null;
  const minLat = Math.min(...workers.map((item) => item.current_latitude));
  const maxLat = Math.max(...workers.map((item) => item.current_latitude));
  const minLon = Math.min(...workers.map((item) => item.current_longitude));
  const maxLon = Math.max(...workers.map((item) => item.current_longitude));
  const latPadding = Math.max((maxLat - minLat) * 0.2, 0.0025);
  const lonPadding = Math.max((maxLon - minLon) * 0.2, 0.0025);

  return {
    minLat: minLat - latPadding,
    maxLat: maxLat + latPadding,
    minLon: minLon - lonPadding,
    maxLon: maxLon + lonPadding,
  };
}

function projectPoint(lat, lon, bounds) {
  if (!bounds) return { left: "50%", top: "50%" };
  const lonRange = bounds.maxLon - bounds.minLon || 1;
  const latRange = bounds.maxLat - bounds.minLat || 1;
  const left = ((lon - bounds.minLon) / lonRange) * 100;
  const top = (1 - (lat - bounds.minLat) / latRange) * 100;
  return {
    left: `${Math.min(Math.max(left, 8), 92)}%`,
    top: `${Math.min(Math.max(top, 10), 90)}%`,
  };
}

function statusTone(worker) {
  if (!worker.is_active || !worker.available_for_dispatch) return "bg-slate-100 text-slate-600";
  if (worker.open_emergency) return "bg-rose-100 text-rose-700";
  if (worker.open_visit) return "bg-cyan-100 text-cyan-700";
  return "bg-emerald-100 text-emerald-700";
}

export default function WorkerTracker() {
  const [workers, setWorkers] = useState([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const response = await apiClient.get("/admin/workers/live");
      setWorkers(response.data);
      if (!selectedWorkerId && response.data.length) {
        setSelectedWorkerId(response.data[0].id);
      }
    } catch {
      toast.error("Unable to load live worker tracking right now.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, []);

  const plottedWorkers = useMemo(
    () => workers.filter((worker) => worker.current_latitude != null && worker.current_longitude != null),
    [workers]
  );

  const bounds = useMemo(() => buildBounds(plottedWorkers), [plottedWorkers]);

  const selectedWorker = useMemo(
    () => workers.find((worker) => worker.id === selectedWorkerId) || null,
    [workers, selectedWorkerId]
  );

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-cyan-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="relative h-[620px] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,_#f8fdff_0%,_#edf7fb_100%)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(6,182,212,0.15),transparent_20%),radial-gradient(circle_at_80%_25%,rgba(16,185,129,0.12),transparent_22%),radial-gradient(circle_at_50%_80%,rgba(249,115,22,0.12),transparent_25%)]" />
            <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,#94a3b8_1px,transparent_1px),linear-gradient(to_bottom,#94a3b8_1px,transparent_1px)] [background-size:72px_72px]" />

            {plottedWorkers.map((worker) => {
              const point = projectPoint(worker.current_latitude, worker.current_longitude, bounds);
              return (
                <button
                  key={worker.id}
                  type="button"
                  onClick={() => setSelectedWorkerId(worker.id)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 text-left"
                  style={point}
                >
                  <div
                    className={`rounded-full border-4 border-white px-3 py-2 shadow-[0_14px_30px_rgba(15,23,42,0.12)] ${statusTone(worker)}`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin size={14} />
                      <span className="text-xs font-semibold">{worker.full_name}</span>
                    </div>
                  </div>
                </button>
              );
            })}

            {workers.map((worker) =>
              worker.open_visit?.latitude != null && worker.open_visit?.longitude != null ? (
                <div
                  key={`visit-${worker.id}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={projectPoint(worker.open_visit.latitude, worker.open_visit.longitude, bounds)}
                >
                  <div className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-[11px] font-medium text-cyan-700 shadow-sm">
                    Visit
                  </div>
                </div>
              ) : null
            )}

            {workers.map((worker) =>
              worker.open_emergency?.latitude != null && worker.open_emergency?.longitude != null ? (
                <div
                  key={`emergency-${worker.id}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={projectPoint(worker.open_emergency.latitude, worker.open_emergency.longitude, bounds)}
                >
                  <div className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 shadow-sm">
                    SOS
                  </div>
                </div>
              ) : null
            )}

            {!plottedWorkers.length ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No worker locations have been reported yet.
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[2rem] border border-emerald-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-slate-900">Worker Status List</h3>
              <button
                type="button"
                onClick={load}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              {workers.map((worker) => (
                <button
                  key={worker.id}
                  type="button"
                  onClick={() => setSelectedWorkerId(worker.id)}
                  className={`rounded-3xl border px-4 py-3 text-left transition ${
                    selectedWorkerId === worker.id
                      ? "border-cyan-300 bg-cyan-50"
                      : "border-slate-200 bg-slate-50 hover:border-cyan-200 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{worker.full_name}</p>
                      <p className="mt-1 text-sm text-slate-600">{worker.base_location || "Base location not set"}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(worker)}`}>
                      {!worker.is_active || !worker.available_for_dispatch
                        ? "Inactive"
                        : worker.open_emergency
                          ? "On SOS"
                          : worker.open_visit
                            ? "On Visit"
                            : "Available"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-orange-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <h3 className="text-xl font-semibold text-slate-900">Selected Worker Details</h3>
            {selectedWorker ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{selectedWorker.full_name}</p>
                  <p className="mt-1 text-sm text-slate-600">{selectedWorker.email}</p>
                  <p className="mt-1 text-sm text-slate-600">{selectedWorker.base_location || "Base location not set"}</p>
                  {selectedWorker.phone_number ? (
                    <a href={`tel:${selectedWorker.phone_number}`} className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                      <Phone size={15} />
                      {selectedWorker.phone_number}
                    </a>
                  ) : null}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">Current coordinates</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedWorker.current_latitude ?? "NA"}, {selectedWorker.current_longitude ?? "NA"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Last updated: {selectedWorker.location_updated_at ? new Date(selectedWorker.location_updated_at).toLocaleString() : "No live location yet"}
                  </p>
                </div>

                {selectedWorker.open_visit ? (
                  <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-4">
                    <p className="text-sm font-medium text-cyan-700">Open Visit</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedWorker.open_visit.elder_name || "Assigned elder"}</p>
                    <p className="mt-1 text-sm text-slate-600">{selectedWorker.open_visit.address}</p>
                    <p className="mt-1 text-xs text-slate-500">Visit #{selectedWorker.open_visit.visit_id} | {selectedWorker.open_visit.status}</p>
                  </div>
                ) : null}

                {selectedWorker.open_emergency ? (
                  <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-sm font-medium text-rose-700">Open SOS</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedWorker.open_emergency.address}</p>
                    <p className="mt-1 text-sm text-slate-600">{selectedWorker.open_emergency.stage}</p>
                    <p className="mt-1 text-xs text-slate-500">Alert #{selectedWorker.open_emergency.alert_id}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Select a worker pin or row to inspect their live status.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
