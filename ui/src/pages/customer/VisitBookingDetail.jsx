import { useEffect, useMemo, useState } from "react";
import { Ellipsis, Home, MapPin, Phone, ShieldCheck } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import ModalDialog from "../../components/app/ModalDialog";
import apiClient from "../../lib/apiClient";
import {
  canEnableLiveTracking,
  formatVisitDateTime,
  formatVisitTime,
  getCountdownLabel,
  getElapsedLabel,
  getVisitPhase,
  getWorkerInitials,
  phaseLabel,
  statusTone,
} from "./visitBookingShared";

function FieldPair({ label, value, align = "left" }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-xs font-semibold text-slate-900 ${align === "right" ? "sm:text-right" : ""}`}>{value}</p>
    </div>
  );
}

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

function AddressPreview({ text, expanded, onToggle, compact = false }) {
  const value = text || "Visit";
  const limit = compact ? 44 : 68;
  const shouldCollapse = value.length > limit;
  const preview = shouldCollapse && !expanded ? `${value.slice(0, limit)}...` : value;

  return (
    <div className="min-w-0 max-w-full">
      <p className={`${compact ? "text-base" : "text-xs"} ${expanded ? "whitespace-normal break-words" : "truncate"} max-w-full font-semibold text-slate-900`}>
        {preview}
      </p>
      {shouldCollapse ? (
        <button type="button" onClick={onToggle} className="mt-0.5 text-[10px] font-semibold text-cyan-700">
          {expanded ? "..less" : "..more"}
        </button>
      ) : null}
    </div>
  );
}

function BookingMap({ liveStatus, enabled }) {
  const workerLat = liveStatus?.worker_latitude;
  const workerLng = liveStatus?.worker_longitude;
  const homeLat = liveStatus?.destination_latitude;
  const homeLng = liveStatus?.destination_longitude;
  const mapSrc =
    enabled && homeLat != null && homeLng != null
      ? `https://maps.google.com/maps?q=${workerLat != null && workerLng != null ? `${workerLat},${workerLng}` : `${homeLat},${homeLng}`}&z=15&output=embed`
      : "";

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-emerald-100 bg-white/90 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-3 py-2.5">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Live Visit Map</span>
          <span className="min-w-0 break-words text-[11px] text-slate-500">
            {enabled
              ? `${liveStatus?.eta_minutes ? `${liveStatus.eta_minutes} mins away` : "ETA syncing"}${liveStatus?.distance_km != null ? `  ${liveStatus.distance_km} km` : ""}`
              : "Opens 10 mins before service"}
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-500">
          <MapPin size={14} />
          <Home size={14} />
        </div>
      </div>

      <div className="h-[13.5rem] bg-slate-100">
        {enabled && mapSrc ? (
          <iframe title="Live visit location map" src={mapSrc} className="h-full w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        ) : (
          <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,_#eefbf4_0%,_#dff5ef_55%,_#f5efe3_100%)] px-4 text-center">
            <div>
              <p className="text-xs font-semibold text-slate-700">Map locked</p>
              <p className="mt-1 text-[11px] text-slate-500">Live map and distance appear shortly before the visit.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VisitBookingDetail() {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [liveStatus, setLiveStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [extendingMinutes, setExtendingMinutes] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [headerAddressExpanded, setHeaderAddressExpanded] = useState(false);
  const [detailAddressExpanded, setDetailAddressExpanded] = useState(false);
  const [actionDialog, setActionDialog] = useState("");
  const [slotOptions, setSlotOptions] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [actionBusy, setActionBusy] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async (showBusy = false) => {
      if (showBusy) setLoading(true);
      try {
        const detailsResponse = await apiClient.get(`/visits/${visitId}/details`);
        if (cancelled) return;
        setDetails(detailsResponse.data);

        if (detailsResponse.data.visit.status !== "COMPLETED") {
          const liveResponse = await apiClient.get(`/visits/${visitId}/live`);
          if (!cancelled) {
            setLiveStatus(liveResponse.data);
          }
        } else if (!cancelled) {
          setLiveStatus(null);
        }
      } catch {
        if (!cancelled) {
          setDetails(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load(true);
    const intervalId = window.setInterval(() => load(false), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [visitId]);

  const phase = useMemo(() => getVisitPhase(details), [details]);
  const workerName = details?.visit?.worker_name || "Assigned ELDERLY professional";
  const liveTrackingEnabled = useMemo(
    () => canEnableLiveTracking(details?.visit?.scheduled_start_time, phase),
    [details?.visit?.scheduled_start_time, phase]
  );
  const visitDate = details?.visit?.scheduled_start_time
    ? new Date(details.visit.scheduled_start_time).toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "--";
  const slotGroups = useMemo(() => {
    const grouped = {};
    for (const slot of slotOptions) {
      const date = new Date(slot.start_time);
      const key = date.toLocaleDateString("en-CA");
      if (!grouped[key]) {
        grouped[key] = {
          key,
          title: date.toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
          }),
          slots: [],
        };
      }
      grouped[key].slots.push(slot);
    }
    return Object.values(grouped);
  }, [slotOptions]);

  const openRescheduleDialog = async () => {
    setActionBusy("load-reschedule");
    try {
      const response = await apiClient.get("/visits/slots", {
        params: { location_address: details?.visit?.location_address_snapshot },
      });
      setSlotOptions(response.data);
      setSelectedSlot(response.data[0]?.start_time || "");
      setActionDialog("reschedule");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Unable to load alternate slots right now.");
    } finally {
      setActionBusy("");
    }
  };

  const submitReschedule = async () => {
    if (!selectedSlot) {
      toast.error("Select a new slot first.");
      return;
    }
    setActionBusy("reschedule");
    try {
      const response = await apiClient.post(`/visits/${visitId}/reschedule`, {
        scheduled_start_time: selectedSlot,
      });
      setDetails(response.data);
      setActionDialog("");
      toast.success("Visit rescheduled successfully.");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "This visit could not be rescheduled.");
    } finally {
      setActionBusy("");
    }
  };

  const submitCancellation = async () => {
    setActionBusy("cancel");
    try {
      await apiClient.post(`/visits/${visitId}/cancel`, {
        reason: cancelReason || null,
      });
      toast.success("Visit cancelled.");
      navigate("/customer/visits");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "This visit could not be cancelled.");
    } finally {
      setActionBusy("");
    }
  };

  if (loading) {
    return <div className="rounded-[1.5rem] border border-emerald-100 bg-white/90 p-6 text-sm text-slate-500">Loading visit details...</div>;
  }

  if (!details) {
    return <div className="rounded-[1.5rem] border border-rose-100 bg-white/90 p-6 text-sm text-rose-600">This visit could not be loaded right now.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] border border-emerald-100 bg-white/90 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-700">Single Visit</p>
            <AddressPreview
              text={details.visit.location_address_snapshot || "Visit"}
              expanded={headerAddressExpanded}
              onToggle={() => setHeaderAddressExpanded((current) => !current)}
              compact
            />
          </div>
          {phase === "upcoming" && details.visit.start_otp ? (
            <div className="min-w-0">
              <p className="mb-1 truncate text-[10px] text-slate-500">Share this OTP when the worker arrives.</p>
              <div className="flex flex-wrap items-center gap-2">
                <OtpPills otp={details.visit.start_otp} />
                <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusTone(phase)}`}>{phaseLabel(phase)}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusTone(phase)}`}>{phaseLabel(phase)}</span>
            </div>
          )}
        </div>
      </div>

      <section className="rounded-[1.5rem] border border-emerald-100 bg-white/90 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-sm font-semibold text-white">
                {getWorkerInitials(workerName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{workerName}</p>
                <p className="truncate text-[11px] text-slate-500">{details.elder_names.join(", ")}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {details.worker_phone ? (
                <a
                  href={`tel:${details.worker_phone}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
                >
                  <Phone size={15} />
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => toast.info("Support help can be connected from the operations team if needed.")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-700 transition hover:bg-cyan-100"
              >
                <ShieldCheck size={15} />
              </button>
              <button
                type="button"
                onClick={() => setShowMore((current) => !current)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
              >
                <Ellipsis size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <FieldPair label="Time" value={phase === "ongoing" ? getElapsedLabel(details.visit.check_in_time) : getCountdownLabel(details.visit.scheduled_start_time)} />
            <FieldPair label="Date" value={visitDate} />
            <FieldPair label="Start" value={formatVisitTime(details.visit.scheduled_start_time)} />
            <FieldPair label="End" value={formatVisitTime(details.visit.scheduled_end_time)} />
            <FieldPair label="Booked For" value={details.elder_names.join(", ")} />
            <FieldPair label="Req. By" value={details.customer_name || "--"} />
          </div>

          {showMore ? (
            <div className="space-y-2 overflow-hidden rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Address</p>
              <AddressPreview
                text={details.visit.location_address_snapshot || "Address unavailable"}
                expanded={detailAddressExpanded}
                onToggle={() => setDetailAddressExpanded((current) => !current)}
              />
            </div>
          ) : null}
        </div>
      </section>

      <BookingMap liveStatus={liveStatus} enabled={liveTrackingEnabled} />

      {(details.can_reschedule || details.can_cancel) && phase === "upcoming" ? (
        <section className="rounded-[1.5rem] border border-cyan-200 bg-cyan-50/80 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-700">Booking Controls</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                Changes allowed until {details.can_modify_until ? formatVisitDateTime(details.can_modify_until) : "10 minutes before start"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                You can reschedule or cancel this visit until 10 minutes before the booked service time.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {details.can_reschedule ? (
                <button
                  type="button"
                  disabled={actionBusy === "load-reschedule"}
                  onClick={openRescheduleDialog}
                  className="rounded-xl bg-cyan-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionBusy === "load-reschedule" ? "Loading..." : "Reschedule"}
                </button>
              ) : null}
              {details.can_cancel ? (
                <button
                  type="button"
                  onClick={() => setActionDialog("cancel")}
                  className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  Cancel Visit
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {phase === "ongoing" ? (
        <section className="rounded-[1.5rem] border border-cyan-200 bg-cyan-50/80 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-700">Visit Running</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{getElapsedLabel(details.visit.check_in_time)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[15, 30, 60].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  disabled={Boolean(extendingMinutes)}
                  onClick={async () => {
                    setExtendingMinutes(minutes);
                    try {
                      const response = await apiClient.post(`/visits/${visitId}/extend`, {
                        extend_minutes: minutes,
                      });
                      setDetails(response.data);
                      toast.success(`Visit extended by ${minutes} minutes.`);
                    } catch (error) {
                      toast.error(error?.response?.data?.detail || "This visit could not be extended.");
                    } finally {
                      setExtendingMinutes(0);
                    }
                  }}
                  className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {extendingMinutes === minutes ? "..." : `+${minutes}m`}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <ModalDialog
        open={actionDialog === "reschedule"}
        title="Reschedule Visit"
        onClose={() => {
          if (actionBusy === "reschedule") return;
          setActionDialog("");
          setSlotOptions([]);
          setSelectedSlot("");
        }}
      >
        <div className="space-y-4">
          <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-4">
            <p className="text-sm text-cyan-700">Current booking</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{formatVisitDateTime(details.visit.scheduled_start_time)}</p>
            <p className="mt-2 text-sm text-slate-600">Choose a new available slot for the same home.</p>
          </div>

          {slotGroups.length ? (
            <div className="space-y-3">
              {slotGroups.map((group) => (
                <div key={group.key} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">{group.title}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {group.slots.map((slot) => (
                      <button
                        key={slot.start_time}
                        type="button"
                        onClick={() => setSelectedSlot(slot.start_time)}
                        className={`rounded-2xl border px-3 py-3 text-left transition ${
                          selectedSlot === slot.start_time
                            ? "border-cyan-300 bg-white text-slate-900"
                            : "border-slate-200 bg-white/80 text-slate-700 hover:border-cyan-200"
                        }`}
                      >
                        <p className="text-sm font-semibold">{formatVisitTime(slot.start_time)}</p>
                        <p className="mt-1 text-xs text-slate-500">{slot.available_workers} worker(s) available</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No alternate slots are available right now for this location.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setActionDialog("");
                setSlotOptions([]);
                setSelectedSlot("");
              }}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              disabled={!selectedSlot || actionBusy === "reschedule"}
              onClick={submitReschedule}
              className="rounded-2xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionBusy === "reschedule" ? "Saving..." : "Confirm Reschedule"}
            </button>
          </div>
        </div>
      </ModalDialog>

      <ModalDialog
        open={actionDialog === "cancel"}
        title="Cancel Visit"
        onClose={() => {
          if (actionBusy === "cancel") return;
          setActionDialog("");
          setCancelReason("");
        }}
        widthClass="max-w-lg"
      >
        <div className="space-y-4">
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm text-rose-700">Cancellation window</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              This booking can be cancelled until {details.can_modify_until ? formatVisitDateTime(details.can_modify_until) : "10 minutes before start"}.
            </p>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Reason (optional)</span>
            <textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              rows={4}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              placeholder="Add a short note for your records or the operations team."
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setActionDialog("");
                setCancelReason("");
              }}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Keep Booking
            </button>
            <button
              type="button"
              disabled={actionBusy === "cancel"}
              onClick={submitCancellation}
              className="rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionBusy === "cancel" ? "Cancelling..." : "Confirm Cancel"}
            </button>
          </div>
        </div>
      </ModalDialog>
    </div>
  );
}
