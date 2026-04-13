import { useEffect, useMemo, useState } from "react";
import { Gift, PhoneCall, Share2, Video } from "lucide-react";
import { toast } from "sonner";

import ModalDialog from "../../components/app/ModalDialog";
import apiClient from "../../lib/apiClient";
import { useAuthStore } from "../../store/authStore";

const SLOT_HOURS = [10, 13, 16, 19];

function normalizeAddress(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function dayLabel(isoString) {
  const date = new Date(isoString);
  return {
    key: date.toLocaleDateString("en-CA"),
    dayName: date.toLocaleDateString([], { weekday: "short" }),
    dayNumber: date.getDate(),
    monthLabel: date.toLocaleDateString([], { month: "long", year: "numeric" }),
  };
}

export default function Celebrations() {
  const user = useAuthStore((state) => state.user);
  const [elders, setElders] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [slotOptions, setSlotOptions] = useState([]);
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [bookingDateWindowStart, setBookingDateWindowStart] = useState(0);
  const [busyAction, setBusyAction] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [specialNotes, setSpecialNotes] = useState("");

  const load = async () => {
    const [elderRes, catalogRes, bookingRes] = await Promise.all([
      apiClient.get("/elders"),
      apiClient.get("/occasions/catalog"),
      apiClient.get("/occasions/customer"),
    ]);
    setElders(elderRes.data);
    setCatalog(catalogRes.data);
    setBookings(bookingRes.data);
  };

  useEffect(() => {
    load();
  }, []);

  const locations = useMemo(
    () =>
      Object.values(
        elders.reduce((acc, elder) => {
          const key = normalizeAddress(elder.home_address);
          if (!acc[key]) {
            acc[key] = {
              key,
              home_address: elder.home_address,
              elders: [],
            };
          }
          acc[key].elders.push(elder);
          return acc;
        }, {})
      ),
    [elders]
  );

  const slotCalendar = useMemo(() => {
    const grouped = {};
    for (const slot of slotOptions) {
      const labels = dayLabel(slot.start_time);
      if (!grouped[labels.key]) {
        grouped[labels.key] = { ...labels, slots: {} };
      }
      grouped[labels.key].slots[new Date(slot.start_time).getHours()] = slot;
    }
    return Object.values(grouped).sort((a, b) => a.key.localeCompare(b.key));
  }, [slotOptions]);

  const mobileWindow = useMemo(
    () => slotCalendar.slice(bookingDateWindowStart, bookingDateWindowStart + 4),
    [bookingDateWindowStart, slotCalendar]
  );

  const selectedDate = useMemo(
    () => slotCalendar.find((item) => item.key === selectedDateKey) || slotCalendar[0] || null,
    [selectedDateKey, slotCalendar]
  );

  const pendingBookingModalOpen = Boolean(selectedPackage && selectedLocation);

  const openPackageBooking = async (pkg) => {
    if (!locations.length) {
      toast.error("Add an elder location before booking a celebration service.");
      return;
    }
    setSelectedPackage(pkg);
    setSelectedLocation(locations[0]);
    setSpecialNotes("");
    setBusyAction("load-occasion-slots");
    try {
      const response = await apiClient.get("/occasions/slots", {
        params: { location_address: locations[0].home_address },
      });
      setSlotOptions(response.data);
      const firstDate = response.data[0] ? dayLabel(response.data[0].start_time).key : "";
      setSelectedDateKey(firstDate);
      setBookingDateWindowStart(0);
    } finally {
      setBusyAction("");
    }
  };

  const updateLocation = async (location) => {
    setSelectedLocation(location);
    setBusyAction("load-occasion-slots");
    try {
      const response = await apiClient.get("/occasions/slots", {
        params: { location_address: location.home_address },
      });
      setSlotOptions(response.data);
      const firstDate = response.data[0] ? dayLabel(response.data[0].start_time).key : "";
      setSelectedDateKey(firstDate);
      setBookingDateWindowStart(0);
    } finally {
      setBusyAction("");
    }
  };

  const shareReferral = async () => {
    const message = `I use ELDERLY to coordinate care, emergency support, and special celebrations for my loved ones. Join with my referral code ELDERLY-${user?.id || "CARE"}.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "ELDERLY Referral", text: message, url: window.location.origin });
        return;
      } catch {
        // fall back below
      }
    }
    await navigator.clipboard.writeText(`${message} ${window.location.origin}`);
    toast.success("Referral message copied. Share it with your contacts.");
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] border border-emerald-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-emerald-700">Special Moments</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Festival, birthday, and anniversary visits</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Even if you are far away from your loved ones, you can celebrate with them without any headache because ELDERLY arranges everything for you.
            </p>
          </div>
          <button
            type="button"
            onClick={shareReferral}
            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            <Share2 size={16} />
            Refer
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-3">
          {catalog.map((item) => (
            <div key={item.code} className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm uppercase tracking-[0.12em] text-emerald-700">{item.occasion_type}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{item.name}</p>
                  <p className="mt-2 text-sm text-slate-600">{item.emotional_line}</p>
                  <p className="mt-3 text-sm text-slate-600">{item.inclusions.join(" | ")}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Value Added</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">Rs. {item.price}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
                  {item.includes_video_call ? <Video size={14} /> : <Gift size={14} />}
                  {item.includes_video_call ? "Includes family video-call assist" : "Celebration update service"}
                </div>
                <button
                  type="button"
                  onClick={() => openPackageBooking(item)}
                  className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
                >
                  Book This Package
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[1.75rem] border border-cyan-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <p className="text-xs uppercase tracking-[0.12em] text-cyan-700">Confirmed Bookings</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-900">Your celebration schedule</h3>
          <div className="mt-4 grid gap-3">
            {bookings.length ? (
              bookings.map((item) => {
                const canJoin = item.includes_video_call && new Date(item.scheduled_start_time).getTime() - 15 * 60 * 1000 <= Date.now();
                return (
                  <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-lg font-semibold text-slate-900">{item.package_name}</p>
                        <p className="mt-1 text-sm text-slate-600">{item.location_address_snapshot}</p>
                        <p className="mt-1 text-sm text-slate-600">{new Date(item.scheduled_start_time).toLocaleString()}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          Worker: {item.worker_name || "Assigned soon"}{item.worker_phone ? ` | ${item.worker_phone}` : ""}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">{item.status}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const response = await apiClient.get(`/occasions/${item.id}/details`);
                          setSelectedBooking(response.data);
                        }}
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        View Details
                      </button>
                      {canJoin ? (
                        <button
                          type="button"
                          onClick={async () => {
                            const response = await apiClient.get(`/occasions/${item.id}/details`);
                            setSelectedBooking(response.data);
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-600"
                        >
                          <Video size={15} />
                          Join Celebration
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No special celebration bookings yet.
              </p>
            )}
          </div>
        </div>
      </section>

      <ModalDialog
        open={pendingBookingModalOpen}
        title="Book Celebration Service"
        onClose={() => {
          setSelectedPackage(null);
          setSelectedLocation(null);
          setSlotOptions([]);
          setSelectedDateKey("");
          setSpecialNotes("");
        }}
        widthClass="max-w-5xl"
      >
        {selectedPackage && selectedLocation ? (
          <div className="space-y-4">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-700">{selectedPackage.occasion_type}</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{selectedPackage.name}</p>
              <p className="mt-2 text-sm text-slate-600">{selectedPackage.emotional_line}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <span className="text-sm font-medium text-slate-700">Location</span>
                <select
                  value={selectedLocation.key}
                  onChange={(event) => {
                    const next = locations.find((item) => item.key === event.target.value);
                    if (next) {
                      updateLocation(next);
                    }
                  }}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none"
                >
                  {locations.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.home_address}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700">Package highlights</p>
                <p className="mt-2 text-sm text-slate-600">{selectedPackage.inclusions.join(" | ")}</p>
                <p className="mt-3 text-lg font-semibold text-slate-900">Rs. {selectedPackage.price}</p>
              </div>
            </div>

            {slotCalendar.length ? (
              <>
                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-base font-semibold text-slate-900">{selectedDate?.monthLabel}</p>
                    <p className="text-xs text-slate-500">Book at least 1 day early</p>
                  </div>
                  <div className="mt-4 hidden grid-cols-7 gap-2 text-center sm:grid">
                    {slotCalendar.map((day) => {
                      const active = day.key === (selectedDate?.key || selectedDateKey);
                      return (
                        <button
                          key={day.key}
                          type="button"
                          onClick={() => setSelectedDateKey(day.key)}
                          className={`rounded-3xl px-2 py-3 transition ${
                            active ? "bg-slate-900 text-white" : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <p className={`text-[11px] ${active ? "text-white/80" : "text-slate-500"}`}>{day.dayName}</p>
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
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-50 text-cyan-700 disabled:opacity-40"
                      >
                        ‹
                      </button>
                      <div className="grid flex-1 grid-cols-4 gap-1">
                        {mobileWindow.map((day) => {
                          const active = day.key === (selectedDate?.key || selectedDateKey);
                          return (
                            <button
                              key={day.key}
                              type="button"
                              onClick={() => setSelectedDateKey(day.key)}
                              className={`rounded-[1rem] px-1 py-2 transition ${
                                active ? "bg-slate-900 text-white" : "border border-slate-200 bg-slate-50 text-slate-700"
                              }`}
                            >
                              <p className={`text-[9px] ${active ? "text-white/80" : "text-slate-500"}`}>{day.dayName}</p>
                              <p className="mt-1 text-sm font-semibold">{day.dayNumber}</p>
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        disabled={bookingDateWindowStart + 4 >= slotCalendar.length}
                        onClick={() => setBookingDateWindowStart((current) => Math.min(current + 1, Math.max(slotCalendar.length - 4, 0)))}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-50 text-cyan-700 disabled:opacity-40"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {SLOT_HOURS.map((hour) => {
                    const slot = selectedDate?.slots?.[hour] || null;
                    const label = `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`;
                    return (
                      <button
                        key={hour}
                        type="button"
                        disabled={!slot || busyAction === `book-${slot?.start_time}`}
                        onClick={async () => {
                          if (!slot) return;
                          setBusyAction(`book-${slot.start_time}`);
                          try {
                            await apiClient.post("/occasions/book", {
                              location_address: selectedLocation.home_address,
                              package_code: selectedPackage.code,
                              scheduled_start_time: slot.start_time,
                              special_notes: specialNotes,
                            });
                            toast.success("Celebration booking confirmed.");
                            setSelectedPackage(null);
                            setSelectedLocation(null);
                            setSlotOptions([]);
                            setSelectedDateKey("");
                            setSpecialNotes("");
                            await load();
                          } finally {
                            setBusyAction("");
                          }
                        }}
                        className={`rounded-3xl px-4 py-4 text-left transition ${
                          slot ? "border border-cyan-200 bg-cyan-50 hover:bg-cyan-100" : "border border-slate-200 bg-slate-100 text-slate-400"
                        }`}
                      >
                        <p className={`text-base font-semibold ${slot ? "text-slate-900" : "text-slate-400"}`}>{slot ? new Date(slot.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : label}</p>
                        <p className={`mt-1 text-xs ${slot ? "text-slate-600" : "text-slate-400"}`}>{slot ? `${slot.available_workers} worker(s)` : "Unavailable"}</p>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No celebration slots are available right now for this location.
              </p>
            )}

            <textarea
              value={specialNotes}
              onChange={(event) => setSpecialNotes(event.target.value)}
              placeholder="Favourite food, preferred decor, call timing preference, or any other special note."
              className="min-h-28 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
            />
          </div>
        ) : null}
      </ModalDialog>

      <ModalDialog
        open={Boolean(selectedBooking)}
        title="Celebration Booking Details"
        onClose={() => setSelectedBooking(null)}
        widthClass="max-w-5xl"
      >
        {selectedBooking ? (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Package</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{selectedBooking.booking.package_name}</p>
                <p className="mt-2 text-sm text-slate-600">{selectedBooking.booking.package_summary}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Worker: {selectedBooking.booking.worker_name || "Pending"}{selectedBooking.booking.worker_phone ? ` | ${selectedBooking.booking.worker_phone}` : ""}
                </p>
                {selectedBooking.booking.worker_phone ? (
                  <a
                    href={`tel:${selectedBooking.booking.worker_phone}`}
                    className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
                  >
                    <PhoneCall size={15} />
                    Call Worker
                  </a>
                ) : null}
              </div>

              {selectedBooking.can_join_video_call && selectedBooking.booking.video_room_name ? (
                <div className="overflow-hidden rounded-3xl border border-cyan-200 bg-white">
                  <iframe
                    title="Celebration video call"
                    src={`https://meet.jit.si/${selectedBooking.booking.video_room_name}#config.prejoinPageEnabled=false`}
                    className="h-[26rem] w-full border-0"
                    allow="camera; microphone; fullscreen; display-capture"
                  />
                </div>
              ) : (
                <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-4">
                  <p className="text-sm text-cyan-700">Family video-call assisted visit</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {selectedBooking.booking.includes_video_call ? "Join button will open near the scheduled time." : "This package does not include a live call."}
                  </p>
                  {selectedBooking.booking.video_room_name ? (
                    <p className="mt-2 text-sm text-slate-600">Room code: {selectedBooking.booking.video_room_name}</p>
                  ) : null}
                </div>
              )}
            </div>
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-slate-700">
              Amount paid in this value-added booking flow: <span className="font-semibold text-slate-900">Rs. {selectedBooking.booking.total_price}</span>. A confirmation email has been sent to {user?.email}.
            </div>
          </div>
        ) : null}
      </ModalDialog>
    </div>
  );
}
