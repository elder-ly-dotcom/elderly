import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import apiClient from "../../lib/apiClient";

function Metric({ label, value, hint }) {
  return (
    <div className="rounded-[2rem] border border-cyan-100 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState({
    active_visits: 0,
    active_subscriptions: 0,
    total_mrr: 0,
    workers_active_now: 0,
    workers_inactive_now: 0,
    today_visits_pending: 0,
    today_visits_ongoing: 0,
    today_visits_finished: 0,
    visit_daily: {},
    open_emergencies: 0,
    resolved_emergencies: 0,
    customers: 0,
    workers: 0,
    admins: 0,
  });
  const [visits, setVisits] = useState([]);
  const [workers, setWorkers] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [summaryRes, visitsRes, workersRes] = await Promise.allSettled([
        apiClient.get("/admin/dashboard/summary"),
        apiClient.get("/admin/visits/active"),
        apiClient.get("/admin/workers/live"),
      ]);

      if (summaryRes.status === "fulfilled") setSummary(summaryRes.value.data);
      else toast.error("Admin summary could not load.");

      setVisits(visitsRes.status === "fulfilled" ? visitsRes.value.data : []);
      setWorkers(workersRes.status === "fulfilled" ? workersRes.value.data : []);
    };

    load();
  }, []);

  const visitDailyRows = useMemo(
    () =>
      Object.entries(summary.visit_daily || {})
        .sort((a, b) => new Date(b[0]) - new Date(a[0]))
        .slice(0, 7),
    [summary.visit_daily]
  );

  const activeWorkers = workers.filter((worker) => worker.is_active && worker.available_for_dispatch);
  const inactiveWorkers = workers.filter((worker) => !worker.is_active || !worker.available_for_dispatch);

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-cyan-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-700">Admin Control Center</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">Operations dashboard</h2>
        <p className="mt-2 text-sm text-slate-600">Everything important is visible here: people, visits, emergency load, revenue, and workforce readiness.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Workers Active Now" value={summary.workers_active_now} hint={`${activeWorkers.length} currently dispatch-ready`} />
        <Metric label="Workers Inactive Now" value={summary.workers_inactive_now} hint={`${inactiveWorkers.length} paused or inactive`} />
        <Metric label="Open Emergencies" value={summary.open_emergencies} hint={`${summary.resolved_emergencies} resolved overall`} />
        <Metric label="Total MRR" value={`Rs. ${summary.total_mrr}`} hint={`${summary.active_subscriptions} active subscriptions`} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Today's Pending Visits" value={summary.today_visits_pending} />
        <Metric label="Today's Ongoing Visits" value={summary.today_visits_ongoing} />
        <Metric label="Today's Finished Visits" value={summary.today_visits_finished} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-cyan-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-2xl font-semibold text-slate-900">Daily visit trend</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Last 7 days</span>
          </div>
          <div className="mt-4 grid gap-3">
            {visitDailyRows.length ? (
              visitDailyRows.map(([day, counts]) => (
                <div key={day} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">{day}</p>
                    <p className="text-sm text-slate-500">
                      Pending {counts.PENDING || 0} | Ongoing {counts.ACTIVE || 0} | Finished {counts.COMPLETED || 0}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No recent visit activity yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-emerald-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <h3 className="text-2xl font-semibold text-slate-900">Platform mix</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Metric label="Customers" value={summary.customers} />
            <Metric label="Workers" value={summary.workers} />
            <Metric label="Admins" value={summary.admins} />
          </div>
          <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">
              Workforce split: {summary.workers_active_now} active now and {summary.workers_inactive_now} inactive right now.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-cyan-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-2xl font-semibold text-slate-900">Live visits</h3>
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-700">{visits.length} active</span>
          </div>
          <div className="mt-4 grid gap-3">
            {visits.length ? (
              visits.map((visit) => (
                <div key={visit.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Visit #{visit.id}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {visit.elder_name || "Assigned elder"} | {visit.worker_name || "Assigned worker"} | {visit.distance_meters?.toFixed?.(1) ?? visit.distance_meters}m from home
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No live visits right now. New worker check-ins will appear here automatically.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-orange-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-2xl font-semibold text-slate-900">Worker readiness</h3>
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">{workers.length} verified workers</span>
          </div>
          <div className="mt-4 grid gap-3">
            {workers.slice(0, 6).map((worker) => (
              <div key={worker.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{worker.full_name}</p>
                    <p className="mt-1 text-sm text-slate-600">{worker.base_location || "Base location not set"}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      !worker.is_active || !worker.available_for_dispatch
                        ? "bg-slate-100 text-slate-600"
                        : worker.open_emergency
                          ? "bg-rose-100 text-rose-700"
                          : worker.open_visit
                            ? "bg-cyan-100 text-cyan-700"
                            : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {!worker.is_active || !worker.available_for_dispatch
                      ? "Inactive"
                      : worker.open_emergency
                        ? "On SOS"
                        : worker.open_visit
                          ? "On Visit"
                          : "Available"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
