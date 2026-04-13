import { useEffect, useState } from "react";

import apiClient from "../../lib/apiClient";

function statusTone(status) {
  if (status === "In Progress") return "bg-cyan-100 text-cyan-700";
  if (status === "Completed") return "bg-emerald-100 text-emerald-700";
  if (status === "Scheduled") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export default function VisitBookings() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    apiClient.get("/visits/customer/upcoming").then((response) => setBookings(response.data));
  }, []);

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] border border-emerald-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <p className="text-xs uppercase tracking-[0.12em] text-emerald-700">Visit Bookings</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Upcoming and recent visit requests</h2>
      </section>

      <div className="grid gap-3">
        {bookings.length ? (
          bookings.map((item) => (
            <div key={item.visit.id} className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-slate-900">{item.visit.location_address_snapshot || item.visit.elder_name}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.elder_names.join(", ")}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Scheduled for {item.visit.scheduled_start_time ? new Date(item.visit.scheduled_start_time).toLocaleString() : "Not scheduled"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Worker: {item.visit.worker_name || "Pending"}{item.worker_phone ? ` | ${item.worker_phone}` : ""}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(item.status_label)}`}>{item.status_label}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No visit bookings yet.</p>
        )}
      </div>
    </div>
  );
}
