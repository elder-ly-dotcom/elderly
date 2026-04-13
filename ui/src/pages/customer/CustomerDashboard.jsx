import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CirclePlus, Info, MapPin, Siren, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";

import ModalDialog from "../../components/app/ModalDialog";
import ElderFormDialog from "../../components/customer/ElderFormDialog";
import apiClient from "../../lib/apiClient";
import { WS_BASE_URL } from "../../lib/runtimeConfig";
import { useAuthStore } from "../../store/authStore";

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

function normalizeAddress(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function stageLabel(stage) {
  return STAGE_LABELS[stage] || stage?.replaceAll("_", " ") || "Unknown";
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function slotHourLabel(isoString) {
  return new Date(isoString).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CustomerDashboard() {
  const user = useAuthStore((state) => state.user);
  const [elders, setElders] = useState([]);
  const [overview, setOverview] = useState(null);
  const [usage, setUsage] = useState(null);
  const [emergencies, setEmergencies] = useState([]);
  const [busyAction, setBusyAction] = useState("");
  const [selectedLocationKey, setSelectedLocationKey] = useState("");
  const [selectedEmergencyId, setSelectedEmergencyId] = useState(null);
  const [selectedPanel, setSelectedPanel] = useState("");
  const [chargeNoticeShown, setChargeNoticeShown] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [slotOptions, setSlotOptions] = useState([]);
  const [bookingLocation, setBookingLocation] = useState(null);
  const [bookingPreview, setBookingPreview] = useState(null);
  const [selectedBookingDate, setSelectedBookingDate] = useState("");
  const [bookingDateWindowStart, setBookingDateWindowStart] = useState(0);

  const load = async () => {
    const [eldersRes, overviewRes, usageRes, emergencyRes] = await Promise.allSettled([
      apiClient.get("/elders"),
      apiClient.get("/payments/overview"),
      apiClient.get("/reports/usage/monthly"),
      apiClient.get("/emergency/history"),
    ]);

    setElders(eldersRes.status === "fulfilled" ? eldersRes.value.data : []);
    setOverview(overviewRes.status === "fulfilled" ? overviewRes.value.data : null);
    setUsage(usageRes.status === "fulfilled" ? usageRes.value.data : null);
    setEmergencies(emergencyRes.status === "fulfilled" ? emergencyRes.value.data : []);

    const failedSections = [
      eldersRes.status === "rejected" ? "elders" : null,
      overviewRes.status === "rejected" ? "subscription overview" : null,
      usageRes.status === "rejected" ? "visit usage" : null,
      emergencyRes.status === "rejected" ? "emergency updates" : null,
    ].filter(Boolean);

    if (failedSections.length) {
      toast.error(`Some dashboard sections could not load: ${failedSections.join(", ")}.`);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;
    const socket = new WebSocket(`${WS_BASE_URL}/emergency/ws/customer/${user.id}`);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "emergency") {
        toast.error(payload.message || "Emergency update received.");
      }
      if (payload.type === "emergency_stage_update") {
        toast.success(`SOS updated: ${stageLabel(payload.stage)}`);
      }
      load();
    };
    const timer = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send("ping");
      }
    }, 25000);
    return () => {
      clearInterval(timer);
      socket.close();
    };
  }, [user?.id]);

  const locations = useMemo(
    () =>
      Object.values(
        elders.reduce((acc, elder) => {
          const key = normalizeAddress(elder.home_address);
          if (!acc[key]) {
            acc[key] = {
              key,
              home_address: elder.home_address,
              home_latitude: elder.home_latitude,
              home_longitude: elder.home_longitude,
              pod_name: elder.pod_name,
              elders: [],
            };
          }
          acc[key].elders.push(elder);
          return acc;
        }, {})
      ),
    [elders]
  );

  const emergencySummaryByLocation = useMemo(() => {
    const summary = {};
    for (const item of emergencies) {
      const key = normalizeAddress(item.location_address || "");
      if (!key) continue;
      if (!summary[key]) {
        summary[key] = {
          latest: item,
          resolvedCount: item.location_emergency_count || 0,
        };
      }
      if (new Date(item.start_time) > new Date(summary[key].latest.start_time)) {
        summary[key].latest = item;
      }
      summary[key].resolvedCount = Math.max(summary[key].resolvedCount, item.location_emergency_count || 0);
    }
    return summary;
  }, [emergencies]);

  const selectedLocation = useMemo(
    () => locations.find((location) => location.key === selectedLocationKey) || null,
    [locations, selectedLocationKey]
  );

  const selectedEmergency = useMemo(
    () => emergencies.find((item) => item.id === selectedEmergencyId) || null,
    [emergencies, selectedEmergencyId]
  );

  const subscribedAddressStats = useMemo(
    () =>
      locations.map((location) => ({
        key: location.key,
        address: location.home_address,
        count: emergencySummaryByLocation[location.key]?.resolvedCount || 0,
        latest: emergencySummaryByLocation[location.key]?.latest || null,
        unpaidCount: emergencies.filter(
          (item) =>
            normalizeAddress(item.location_address || "") === location.key &&
            item.status === "RESPONDED" &&
            !item.service_fee_paid
        ).length,
      })),
    [locations, emergencySummaryByLocation, emergencies]
  );

  const unpaidResolvedEmergencies = useMemo(
    () => emergencies.filter((item) => item.status === "RESPONDED" && !item.service_fee_paid),
    [emergencies]
  );

  const unpaidChargesByAddress = useMemo(() => {
    const grouped = {};
    for (const item of unpaidResolvedEmergencies) {
      const key = normalizeAddress(item.location_address || "");
      if (!key) continue;
      if (!grouped[key]) {
        grouped[key] = {
          key,
          address: item.location_address,
          count: 0,
          amount: 0,
        };
      }
      grouped[key].count += 1;
      grouped[key].amount += Number(item.service_fee_amount || 399);
    }
    return Object.values(grouped);
  }, [unpaidResolvedEmergencies]);

  const totalUnpaidSosAmount = useMemo(
    () => unpaidChargesByAddress.reduce((sum, item) => sum + item.amount, 0),
    [unpaidChargesByAddress]
  );

  const slotCalendar = useMemo(() => {
    const grouped = {};
    for (const slot of slotOptions) {
      const date = new Date(slot.start_time);
      const dateKey = date.toLocaleDateString("en-CA");
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          dateKey,
          monthLabel: date.toLocaleDateString([], { month: "long", year: "numeric" }),
          dayLabel: date.toLocaleDateString([], { weekday: "short" }),
          dayNumber: date.getDate(),
          slots: {},
        };
      }
      grouped[dateKey].slots[date.getHours()] = slot;
    }
    return Object.values(grouped).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [slotOptions]);

  const selectedDateSlots = useMemo(
    () => slotCalendar.find((item) => item.dateKey === selectedBookingDate) || slotCalendar[0] || null,
    [slotCalendar, selectedBookingDate]
  );

  const mobileDateWindow = useMemo(
    () => slotCalendar.slice(bookingDateWindowStart, bookingDateWindowStart + 4),
    [bookingDateWindowStart, slotCalendar]
  );

  useEffect(() => {
    if (unpaidResolvedEmergencies.length && !chargeNoticeShown) {
      setSelectedPanel("sos-charges");
      setChargeNoticeShown(true);
    }
    if (!unpaidResolvedEmergencies.length) {
      setChargeNoticeShown(false);
    }
  }, [unpaidResolvedEmergencies.length, chargeNoticeShown]);

  const openVisitScheduler = async (location) => {
    setBusyAction(`visit-${location.key}`);
    try {
      const response = await apiClient.get("/visits/slots", {
        params: { location_address: location.home_address },
      });
      setBookingLocation(location);
      setSlotOptions(response.data);
      if (response.data.length) {
        const firstDate = new Date(response.data[0].start_time).toLocaleDateString("en-CA");
        setSelectedBookingDate(firstDate);
        setBookingDateWindowStart(0);
      } else {
        setSelectedBookingDate("");
        setBookingDateWindowStart(0);
      }
      setSelectedPanel("visit-slots");
    } finally {
      setBusyAction("");
    }
  };

  const triggerReverseSOS = (location) => {
    setBusyAction(`sos-${location.key}`);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          await apiClient.post("/emergency/trigger", {
            location_address: location.home_address,
            message: `Customer triggered urgent assistance for ${location.home_address}. Assigned worker callback needed immediately.`,
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
          toast.error("Reverse SOS sent to admin and the nearest worker.");
          await load();
        } finally {
          setBusyAction("");
        }
      },
      async () => {
        try {
          await apiClient.post("/emergency/trigger", {
            location_address: location.home_address,
            message: `Customer triggered urgent assistance for ${location.home_address}. Assigned worker callback needed immediately.`,
          });
          toast.error("Reverse SOS sent to admin and the nearest worker.");
          await load();
        } finally {
          setBusyAction("");
        }
      }
    );
  };

  return (
    <div className="space-y-4 overflow-hidden">
      <section className="rounded-[1.75rem] border border-emerald-100 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 pr-2">
            <p className="text-[11px] uppercase tracking-[0.1em] text-emerald-700">Customer Command</p>
            <h2 className="mt-1 text-lg font-semibold leading-snug text-slate-900 sm:text-[1.35rem]">
              Peace of mind command center
            </h2>
          </div>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowInfoTooltip((current) => !current)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
            >
              <Info size={16} />
            </button>
            <div
              className={`absolute right-0 top-[calc(100%+0.5rem)] z-10 w-72 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600 shadow-[0_18px_40px_rgba(15,23,42,0.1)] ${
                showInfoTooltip ? "block" : "hidden"
              }`}
            >
              1. Add elders. 2. Subscribe a plan. 3. Request visits when needed. 4. Trigger SOS for urgent support. 5. Review updates and charges from this dashboard.
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedPanel("create-elder")}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            <CirclePlus size={16} />
            Add Elder
          </button>
          <button
            type="button"
            onClick={() => setSelectedPanel("subscription")}
            className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Subscription Details
          </button>
          {totalUnpaidSosAmount > 0 ? (
            <button
              type="button"
              onClick={() => setSelectedPanel("sos-charges")}
              className="shrink-0 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600"
            >
              Pay SOS Charges
            </button>
          ) : null}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Managed Elders" value={elders.length} hint="Family profiles linked" />
        <MetricCard label="Locations" value={locations.length} hint="Care addresses tracked" />
        <MetricCard
          label="Visits Done"
          value={usage?.completed_visits_this_month ?? 0}
          hint={`${usage?.subscribed_locations ?? 0} subscribed location(s)`}
        />
        <MetricCard
          label="Visits Left"
          value={usage?.remaining_visits_this_month ?? 0}
          hint={`${usage?.monthly_visit_limit ?? 0} monthly total`}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.75rem] border border-emerald-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">Locations</h3>
            <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <MapPin size={18} />
              <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[11px] font-semibold text-white">
                {locations.length}
              </span>
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {locations.length ? (
              locations.map((location) => {
                const safetySummary = emergencySummaryByLocation[location.key];
                const currentAlert = safetySummary?.latest;
                return (
                  <div key={location.key} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-slate-900">{location.home_address}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {location.elders.length} elder{location.elders.length > 1 ? "s" : ""} | {currentAlert ? stageLabel(currentAlert.current_stage) : "No active SOS"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLocationKey(location.key);
                            setSelectedPanel("location");
                          }}
                          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openVisitScheduler(location)}
                          disabled={busyAction === `visit-${location.key}`}
                          className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <UserRoundCheck size={15} />
                          {busyAction === `visit-${location.key}` ? "Loading..." : "Schedule Visit"}
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerReverseSOS(location)}
                          disabled={busyAction === `sos-${location.key}`}
                          className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Siren size={15} />
                          {busyAction === `sos-${location.key}` ? "Sending..." : "SOS"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No elder locations found yet. Use the Add Elder button to create the first family profile.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-amber-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">Emergency Responses By Address</h3>
            <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <Siren size={18} />
              <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-semibold text-white">
                {subscribedAddressStats.reduce((sum, item) => sum + item.count, 0)}
              </span>
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {subscribedAddressStats.length ? (
              subscribedAddressStats.map((item) => (
                <div key={item.key} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-slate-900">{item.address}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {item.count} resolved emergency response{item.count === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Due now: Rs. {item.unpaidCount * 399}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.latest ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEmergencyId(item.latest.id);
                            setSelectedPanel("emergency");
                          }}
                          className="rounded-2xl border border-amber-200 bg-white px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50"
                        >
                          View Latest
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No emergency response history for subscribed addresses yet.
              </p>
            )}
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
              <p className="text-sm text-slate-500">Address</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{selectedLocation.home_address}</p>
              <p className="mt-2 text-sm text-slate-600">
                Elders: {selectedLocation.elders.map((elder) => elder.full_name).join(", ")}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Units: {selectedLocation.elders.map((elder) => elder.flat_label).filter(Boolean).join(", ") || "Not added"}
              </p>
              <p className="mt-1 text-sm text-slate-600">Pod: {selectedLocation.pod_name || "Unassigned Pod"}</p>
              <p className="mt-1 text-sm text-slate-600">
                Emergency responses completed here: {emergencySummaryByLocation[selectedLocation.key]?.resolvedCount || 0}
              </p>
            </div>

            {emergencySummaryByLocation[selectedLocation.key]?.latest ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-rose-700">Latest SOS</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {stageLabel(emergencySummaryByLocation[selectedLocation.key].latest.current_stage)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEmergencyId(emergencySummaryByLocation[selectedLocation.key].latest.id);
                      setSelectedPanel("emergency");
                    }}
                    className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                  >
                    View Audit Trail
                  </button>
                </div>
                <p className="mt-3 text-sm text-slate-700">
                  Worker: {emergencySummaryByLocation[selectedLocation.key].latest.assigned_worker_name || "Assigning"}{" "}
                  {emergencySummaryByLocation[selectedLocation.key].latest.assigned_worker_phone
                    ? `| ${emergencySummaryByLocation[selectedLocation.key].latest.assigned_worker_phone}`
                    : ""}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </ModalDialog>

      <ModalDialog
        open={selectedPanel === "subscription"}
        title="Subscription Details"
        onClose={() => setSelectedPanel("")}
        widthClass="max-w-2xl"
      >
        {overview?.current_plan ? (
          <div className="space-y-4">
            <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-4">
              <p className="text-sm text-cyan-700">Active Plan</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{overview.current_plan.service_tier_name}</p>
              <p className="mt-2 text-sm text-slate-600">
                Elders covered: {overview.current_plan.elders.map((item) => item.elder_name).filter(Boolean).join(", ")}
              </p>
              <p className="mt-2 text-sm text-slate-600">Active total: Rs. {overview.current_plan.total_price}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Monthly Visits Used"
                value={usage?.completed_visits_this_month ?? 0}
                hint={`${usage?.monthly_visit_limit ?? 0} total allowed`}
              />
              <MetricCard
                label="Locations Covered"
                value={usage?.subscribed_locations ?? 0}
                hint="Tracked under current plan"
              />
            </div>
          </div>
        ) : (
          <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No active subscription yet. Open the Subscriptions tab to start a plan.
          </p>
        )}
      </ModalDialog>

      <ElderFormDialog
        open={selectedPanel === "create-elder"}
        title="Add Elder"
        onClose={() => setSelectedPanel("")}
        onSuccess={load}
      />

      <ModalDialog
        open={selectedPanel === "visit-slots" && Boolean(bookingLocation)}
        title="Choose Visit Time"
        onClose={() => {
          setSelectedPanel("");
          setBookingLocation(null);
          setSlotOptions([]);
          setSelectedBookingDate("");
          setBookingDateWindowStart(0);
        }}
      >
        <div className="space-y-4">
          <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-4">
            <p className="text-sm text-cyan-700">Location</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{bookingLocation?.home_address}</p>
          </div>
          {slotCalendar.length ? (
            <>
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-slate-900">{selectedDateSlots?.monthLabel}</p>
                  <p className="text-xs text-slate-500">Next 7 days</p>
                </div>
                <div className="mt-4 hidden grid-cols-7 gap-2 text-center sm:grid">
                  {slotCalendar.map((day) => {
                    const isSelected = (selectedDateSlots?.dateKey || selectedBookingDate) === day.dateKey;
                    return (
                      <button
                        key={day.dateKey}
                        type="button"
                        onClick={() => setSelectedBookingDate(day.dateKey)}
                        className={`rounded-3xl px-2 py-3 transition ${
                          isSelected
                            ? "bg-slate-900 text-white"
                            : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <p className={`text-[11px] ${isSelected ? "text-white/80" : "text-slate-500"}`}>{day.dayLabel}</p>
                        <p className="mt-1 text-lg font-semibold">{day.dayNumber}</p>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 sm:hidden">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={bookingDateWindowStart === 0}
                      onClick={() => setBookingDateWindowStart((current) => Math.max(current - 1, 0))}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-50 text-cyan-700 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div className="grid flex-1 grid-cols-4 gap-1 overflow-hidden text-center">
                      {mobileDateWindow.map((day) => {
                        const isSelected = (selectedDateSlots?.dateKey || selectedBookingDate) === day.dateKey;
                        return (
                          <button
                            key={day.dateKey}
                            type="button"
                            onClick={() => setSelectedBookingDate(day.dateKey)}
                            className={`min-w-0 rounded-[1rem] px-1 py-2 transition ${
                              isSelected
                                ? "bg-slate-900 text-white"
                                : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <p className={`text-[9px] leading-none ${isSelected ? "text-white/80" : "text-slate-500"}`}>{day.dayLabel}</p>
                            <p className="mt-1 text-sm font-semibold leading-none">{day.dayNumber}</p>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      disabled={bookingDateWindowStart + 4 >= slotCalendar.length}
                      onClick={() =>
                        setBookingDateWindowStart((current) =>
                          Math.min(current + 1, Math.max(slotCalendar.length - 4, 0))
                        )
                      }
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-50 text-cyan-700 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[10, 13, 16, 19].map((hour) => {
                  const slot = selectedDateSlots?.slots?.[hour] || null;
                  return (
                    <button
                      key={hour}
                      type="button"
                      disabled={!slot || busyAction === `book-${slot?.start_time}`}
                      onClick={async () => {
                        if (!slot) return;
                        setBusyAction(`book-${slot.start_time}`);
                        try {
                          const response = await apiClient.post("/visits/schedule", {
                            location_address: bookingLocation.home_address,
                            scheduled_start_time: slot.start_time,
                            notes: `Scheduled customer visit for ${bookingLocation.home_address}.`,
                          });
                          const details = await apiClient.get(`/visits/${response.data.id}/details`);
                          setBookingPreview(details.data);
                          setSelectedPanel("visit-booked");
                          await load();
                        } finally {
                          setBusyAction("");
                        }
                      }}
                      className={`rounded-3xl px-4 py-4 text-left transition ${
                        slot
                          ? "border border-cyan-200 bg-cyan-50 hover:bg-cyan-100"
                          : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                      } disabled:cursor-not-allowed disabled:opacity-70`}
                    >
                      <p className={`text-base font-semibold ${slot ? "text-slate-900" : "text-slate-400"}`}>
                        {slot ? slotHourLabel(slot.start_time) : `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`}
                      </p>
                      <p className={`mt-1 text-xs ${slot ? "text-slate-600" : "text-slate-400"}`}>
                        {slot ? `${slot.available_workers} worker(s)` : "Unavailable"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No slots available in the next 1 week for this location.
            </p>
          )}
        </div>
      </ModalDialog>

      <ModalDialog
        open={selectedPanel === "visit-booked" && Boolean(bookingPreview)}
        title="Booking Confirmed"
        onClose={() => {
          setSelectedPanel("");
          setBookingPreview(null);
          setBookingLocation(null);
          setSlotOptions([]);
          setSelectedBookingDate("");
          setBookingDateWindowStart(0);
        }}
      >
        {bookingPreview ? (
          <div className="space-y-4">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-700">Current Status</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{bookingPreview.status_label}</p>
              <p className="mt-2 text-sm text-slate-600">
                Scheduled for {bookingPreview.visit.scheduled_start_time ? new Date(bookingPreview.visit.scheduled_start_time).toLocaleString() : "TBD"}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Location</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{bookingPreview.visit.location_address_snapshot}</p>
              <p className="mt-2 text-sm text-slate-600">Elders: {bookingPreview.elder_names.join(", ")}</p>
              <p className="mt-1 text-sm text-slate-600">
                Worker: {bookingPreview.visit.worker_name || "Pending"}{bookingPreview.worker_phone ? ` | ${bookingPreview.worker_phone}` : ""}
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedPanel("");
                  setBookingPreview(null);
                }}
                className="rounded-2xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-600"
              >
                Done
              </button>
            </div>
          </div>
        ) : null}
      </ModalDialog>

      <ModalDialog
        open={selectedPanel === "sos-charges"}
        title="Pending SOS Charges"
        onClose={() => setSelectedPanel("")}
        widthClass="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm text-rose-700">Pending amount</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">Rs. {totalUnpaidSosAmount}</p>
            <p className="mt-2 text-sm text-slate-600">
              Every resolved SOS is charged at Rs. 399. Clear the pending amount to keep regular visits uninterrupted.
            </p>
          </div>

          <div className="space-y-3">
            {unpaidChargesByAddress.length ? (
              unpaidChargesByAddress.map((item) => (
                <div key={item.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{item.address}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.count} resolved SOS response{item.count === 1 ? "" : "s"} x Rs. 399
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">Subtotal: Rs. {item.amount}</p>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No pending SOS charges right now.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            If you don&apos;t clear this amount by next 7 days your next visits will be paused till you clear the pending SOS amount.
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setSelectedPanel("")}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              disabled={busyAction === "pay-sos-all" || unpaidChargesByAddress.length === 0}
              onClick={async () => {
                setBusyAction("pay-sos-all");
                try {
                  for (const item of unpaidChargesByAddress) {
                    await apiClient.post("/emergency/pay", { location_address: item.address });
                  }
                  toast.success(`Paid pending SOS charges of Rs. ${totalUnpaidSosAmount}.`);
                  setSelectedPanel("");
                  await load();
                } finally {
                  setBusyAction("");
                }
              }}
              className="rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busyAction === "pay-sos-all" ? "Paying..." : "Pay Now"}
            </button>
          </div>
        </div>
      </ModalDialog>

      <ModalDialog
        open={selectedPanel === "emergency" && Boolean(selectedEmergency)}
        title="SOS Details"
        onClose={() => setSelectedPanel("")}
      >
        {selectedEmergency ? (
          <div className="space-y-4">
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm text-rose-700">Current Status</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{stageLabel(selectedEmergency.current_stage)}</p>
              <p className="mt-2 text-sm text-slate-600">{selectedEmergency.location_address}</p>
              <p className="mt-1 text-sm text-slate-600">{selectedEmergency.elder_names?.join(", ") || selectedEmergency.elder_name}</p>
              <p className="mt-2 text-sm text-slate-700">
                Worker: {selectedEmergency.assigned_worker_name || "Assigning"}
                {selectedEmergency.assigned_worker_phone ? ` | ${selectedEmergency.assigned_worker_phone}` : ""}
              </p>
            </div>
            <div className="space-y-2">
              {selectedEmergency.stage_updates
                ?.slice()
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                .map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">{stageLabel(entry.stage)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {entry.updated_by_name || "System"}
                      {entry.updated_by_phone ? ` | ${entry.updated_by_phone}` : ""}
                      {` | ${new Date(entry.created_at).toLocaleString()}`}
                    </p>
                    {entry.note ? <p className="mt-1 text-sm text-slate-600">{entry.note}</p> : null}
                  </div>
                ))}
            </div>
          </div>
        ) : null}
      </ModalDialog>
    </div>
  );
}
