import { useEffect, useState } from "react";

import apiClient from "../../lib/apiClient";

export default function UpcomingVisits() {
  const [visits, setVisits] = useState([]);

  useEffect(() => {
    apiClient.get("/visits/worker/upcoming").then((response) => setVisits(response.data));
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
            </div>
          ))
        ) : (
          <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No upcoming visits in the next week.</p>
        )}
      </div>
    </div>
  );
}
