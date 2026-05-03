import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCheck, Clock3, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

import apiClient from "../../lib/apiClient";
import {
  formatVisitDateTime,
  getVisitPhase,
  getWorkerInitials,
  phaseLabel,
  sortVisitsByPhase,
} from "./visitBookingShared";

const TAB_OPTIONS = [
  { id: "upcoming", label: "Upcoming", icon: CalendarClock },
  { id: "ongoing", label: "Ongoing", icon: Clock3 },
  { id: "completed", label: "Completed", icon: CheckCheck },
];

function OtpPills({ otp }) {
  return (
    <div className="flex max-w-full flex-wrap items-center gap-1 rounded-xl bg-slate-950 px-2 py-1 text-[10px] font-semibold text-white">
      {(otp || "----").split("").map((digit, index) => (
        <span key={`${digit}-${index}`} className="rounded-md bg-white/10 px-1.5 py-1">
          {digit}
        </span>
      ))}
    </div>
  );
}

function AddressPreview({ text, expanded, onToggle }) {
  const value = text || "Visit";
  const shouldCollapse = value.length > 52;
  const preview = shouldCollapse && !expanded ? `${value.slice(0, 52)}...` : value;

  return (
    <div className="min-w-0 max-w-full">
      <p className={`${expanded ? "whitespace-normal break-words" : "truncate"} max-w-full text-xs font-semibold text-slate-900`}>{preview}</p>
      {shouldCollapse ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggle((current) => !current);
          }}
          className="mt-0.5 text-[10px] font-semibold text-cyan-700"
        >
          {expanded ? "..less" : "..more"}
        </button>
      ) : null}
    </div>
  );
}

function BookingCard({ item, phase, onOpen }) {
  const [addressExpanded, setAddressExpanded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onOpen(item.visit.id)}
      className="w-full overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white/90 px-3 py-2.5 text-left shadow-[0_14px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_45px_rgba(15,23,42,0.08)]"
    >
      <div className="flex min-h-[72px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-[11px] font-semibold text-white">
              {getWorkerInitials(item.visit.worker_name)}
            </div>
            <div className="min-w-0 flex-1">
              <AddressPreview
                text={item.visit.location_address_snapshot || "Visit"}
                expanded={addressExpanded}
                onToggle={setAddressExpanded}
              />
              <p className="mt-0.5 truncate text-[11px] text-slate-500">{item.elder_names.join(", ")}</p>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
            <span className="min-w-0 truncate">{formatVisitDateTime(item.visit.scheduled_start_time)}</span>
            {phase === "upcoming" && item.visit.start_otp ? <OtpPills otp={item.visit.start_otp} /> : null}
            {phase !== "upcoming" ? (
              <span className="inline-flex items-center gap-1 text-cyan-700">
                <MapPin size={12} />
                Live
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 justify-start sm:justify-end">
          {phase !== "upcoming" ? (
            <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
              {phaseLabel(phase)}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export default function VisitBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState("upcoming");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const response = await apiClient.get("/visits/customer/upcoming");
      if (!cancelled) {
        setBookings(response.data);
      }
    };

    load();
    const intervalId = window.setInterval(load, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const groupedBookings = useMemo(() => {
    const nextGroups = {
      upcoming: [],
      ongoing: [],
      completed: [],
    };
    bookings.forEach((item) => {
      const currentPhase = getVisitPhase(item);
      nextGroups[currentPhase].push(item);
    });
    return {
      upcoming: sortVisitsByPhase(nextGroups.upcoming, "upcoming"),
      ongoing: sortVisitsByPhase(nextGroups.ongoing, "ongoing"),
      completed: sortVisitsByPhase(nextGroups.completed, "completed"),
    };
  }, [bookings]);

  const activeItems = groupedBookings[activeTab];

  return (
    <div className="space-y-3">
      <section className="rounded-[1.5rem] border border-emerald-100 bg-white/90 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="grid grid-cols-3 gap-2">
          {TAB_OPTIONS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = groupedBookings[tab.id].length;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-[1.1rem] px-3 py-2.5 text-left transition ${
                  isActive ? "bg-slate-900 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon size={16} />
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isActive ? "bg-white/15 text-white" : "bg-white text-slate-500"}`}>
                    {count}
                  </span>
                </div>
                <p className="mt-1.5 text-xs font-semibold">{tab.label}</p>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-2.5">
        {activeItems.length ? (
          activeItems.map((item) => (
            <BookingCard key={item.visit.id} item={item} phase={activeTab} onOpen={(id) => navigate(`/customer/visits/${id}`)} />
          ))
        ) : (
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No {activeTab} bookings right now.
          </div>
        )}
      </div>
    </div>
  );
}
