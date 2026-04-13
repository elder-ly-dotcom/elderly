import { useEffect, useState } from "react";

import apiClient from "../../lib/apiClient";

function statusTone(status) {
  if (status === "ACTIVE") return "bg-cyan-100 text-cyan-700";
  if (status === "COMPLETED") return "bg-emerald-100 text-emerald-700";
  if (status === "PENDING") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export default function VisitRequests() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    apiClient.get("/admin/visits/requests").then((response) => setRequests(response.data));
  }, []);

  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] border border-cyan-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <p className="text-sm uppercase tracking-[0.18em] text-cyan-700">Visit Requests</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">Scheduled visit workflow</h2>
      </section>

      <div className="grid gap-3">
        {requests.length ? (
          requests.map((item) => (
            <div key={item.visit.id} className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-slate-900">{item.visit.location_address_snapshot || item.visit.elder_name}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.elder_names.join(", ")}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Customer: {item.customer_name || "Unknown"}{item.customer_phone ? ` | ${item.customer_phone}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Worker: {item.visit.worker_name || "Pending"}{item.worker_phone ? ` | ${item.worker_phone}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Scheduled: {item.visit.scheduled_start_time ? new Date(item.visit.scheduled_start_time).toLocaleString() : "Not scheduled"}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(item.visit.status)}`}>{item.visit.status}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No visit requests yet.</p>
        )}
      </div>
    </div>
  );
}
