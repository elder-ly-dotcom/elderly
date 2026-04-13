import { useEffect, useState } from "react";
import { ClipboardList, MapPin } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import apiClient from "../../lib/apiClient";

export default function TaskReportingHub() {
  const navigate = useNavigate();
  const [activeVisit, setActiveVisit] = useState(undefined);

  useEffect(() => {
    apiClient
      .get("/visits/active")
      .then((response) => {
        setActiveVisit(response.data);
      })
      .catch(() => {
        setActiveVisit(null);
      });
  }, []);

  useEffect(() => {
    if (activeVisit?.id) {
      navigate(`/worker/report/${activeVisit.id}`, { replace: true });
    }
  }, [activeVisit, navigate]);

  if (activeVisit === undefined) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-cyan-100 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-700">Task Reporting</p>
        <h2 className="mt-3 text-3xl font-semibold text-slate-900">Report tasks during an active visit</h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Task reporting opens after a successful geofenced check-in. Start a visit first, then you will be taken to the full report form for notes, mood photo, and voice note upload.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-cyan-100 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800">
              <ClipboardList size={20} />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">How this works</h3>
              <p className="text-sm text-slate-600">A worker can only submit task notes for an active visit session.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              1. Open Visit Schedule and choose an assigned elder.
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              2. Tap Start Visit to verify your GPS location against the elder's home.
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              3. After successful check-in, ELDERLY opens the task report form automatically.
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              4. Finish the visit with completed tasks, notes, mood photo, and Bengali voice note.
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-emerald-100 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Ready to report?</h3>
              <p className="text-sm text-slate-600">Go to your visit schedule and start the correct elder visit first.</p>
            </div>
          </div>

          <Link
            to="/worker/dashboard"
            className="mt-6 inline-flex rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-white shadow-[0_12px_30px_rgba(6,182,212,0.22)] transition hover:bg-cyan-600"
          >
            Open Visit Schedule
          </Link>
        </div>
      </section>
    </div>
  );
}
