import { useEffect, useState } from "react";
import { MapPinned, Phone, Video } from "lucide-react";
import { toast } from "sonner";

import apiClient from "../../lib/apiClient";
import ModalDialog from "../../components/app/ModalDialog";

export default function UpcomingVisits() {
  const [visits, setVisits] = useState([]);
  const [occasions, setOccasions] = useState([]);
  const [selectedCelebration, setSelectedCelebration] = useState(null);

  useEffect(() => {
    Promise.all([apiClient.get("/visits/worker/upcoming"), apiClient.get("/occasions/worker")]).then(
      ([visitResponse, occasionResponse]) => {
        setVisits(visitResponse.data);
        setOccasions(occasionResponse.data);
      }
    );
  }, []);

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] border border-cyan-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <p className="text-xs uppercase tracking-[0.12em] text-cyan-700">Upcoming Visits</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Your next 1 week schedule</h2>
      </section>

      <div className="grid gap-3">
        {visits.length ? (
          visits.map((item) => (
            <div key={item.visit.id} className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <p className="text-lg font-semibold text-slate-900">{item.visit.location_address_snapshot || item.visit.elder_name}</p>
              <p className="mt-1 text-sm text-slate-600">{item.elder_names.join(", ")}</p>
              <p className="mt-2 text-sm text-slate-600">{new Date(item.visit.scheduled_start_time).toLocaleString()}</p>
              <p className="mt-1 text-sm text-slate-600">
                Customer: {item.customer_name || "Unknown"}{item.customer_phone ? ` | ${item.customer_phone}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.customer_phone ? (
                  <a
                    href={`tel:${item.customer_phone}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <Phone size={15} />
                    Call
                  </a>
                ) : null}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.visit.location_address_snapshot || "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-100"
                >
                  <MapPinned size={15} />
                  Navigate
                </a>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No upcoming visits in the next week.</p>
        )}
      </div>

      <section className="rounded-[1.75rem] border border-amber-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <p className="text-xs uppercase tracking-[0.12em] text-amber-700">Celebration Duties</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Special occasion bookings</h2>
      </section>

      <div className="grid gap-3">
        {occasions.length ? (
          occasions.map((item) => (
            <div key={item.id} className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <p className="text-lg font-semibold text-slate-900">{item.package_name}</p>
              <p className="mt-1 text-sm text-slate-600">{item.location_address_snapshot}</p>
              <p className="mt-1 text-sm text-slate-600">{new Date(item.scheduled_start_time).toLocaleString()}</p>
              <p className="mt-1 text-sm text-slate-600">
                Customer: {item.customer_name || "Unknown"}{item.customer_phone ? ` | ${item.customer_phone}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.customer_phone ? (
                  <a
                    href={`tel:${item.customer_phone}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <Phone size={15} />
                    Call
                  </a>
                ) : null}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.location_address_snapshot || "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-100"
                >
                  <MapPinned size={15} />
                  Navigate
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    const response = await apiClient.get(`/occasions/${item.id}/details`);
                    setSelectedCelebration(response.data);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
                >
                  <Video size={15} />
                  Details
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No upcoming celebration duties yet.</p>
        )}
      </div>

      <ModalDialog open={Boolean(selectedCelebration)} title="Celebration Duty Details" onClose={() => setSelectedCelebration(null)} widthClass="max-w-5xl">
        {selectedCelebration ? (
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Package</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{selectedCelebration.booking.package_name}</p>
              <p className="mt-2 text-sm text-slate-600">{selectedCelebration.booking.package_summary}</p>
              <p className="mt-2 text-sm text-slate-600">Elders: {selectedCelebration.elder_names.join(", ")}</p>
            </div>
            {selectedCelebration.can_join_video_call && selectedCelebration.booking.video_room_name ? (
              <div className="overflow-hidden rounded-3xl border border-cyan-200 bg-white">
                <iframe
                  title="Celebration video assist"
                  src={`https://meet.jit.si/${selectedCelebration.booking.video_room_name}#config.prejoinPageEnabled=false`}
                  className="h-[26rem] w-full border-0"
                  allow="camera; microphone; fullscreen; display-capture"
                />
              </div>
            ) : (
              <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-slate-700">
                {selectedCelebration.booking.includes_video_call
                  ? "The video room will open here close to the scheduled time."
                  : "This package does not include a live family video call."}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  await apiClient.patch(`/occasions/${selectedCelebration.booking.id}/worker`, {
                    status: "IN_PROGRESS",
                    update_summary: "Worker reached the location and started the celebration support.",
                  });
                  toast.success("Celebration marked in progress.");
                  setSelectedCelebration(null);
                }}
                className="rounded-2xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-600"
              >
                Start Duty
              </button>
              <button
                type="button"
                onClick={async () => {
                  await apiClient.patch(`/occasions/${selectedCelebration.booking.id}/worker`, {
                    status: "COMPLETED",
                    update_summary: "Celebration completed and family updates shared.",
                  });
                  toast.success("Celebration marked completed.");
                  setSelectedCelebration(null);
                }}
                className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                Mark Completed
              </button>
            </div>
          </div>
        ) : null}
      </ModalDialog>
    </div>
  );
}
