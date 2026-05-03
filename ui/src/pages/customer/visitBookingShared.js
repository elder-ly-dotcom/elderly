export function formatVisitDateTime(value) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatVisitTime(value) {
  if (!value) return "--";
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getVisitPhase(item) {
  const status = item?.visit?.status;
  if (status === "ACTIVE") return "ongoing";
  if (status === "COMPLETED") return "completed";
  return "upcoming";
}

export function sortVisitsByPhase(items, phase) {
  return [...items].sort((left, right) => {
    const leftDate =
      phase === "completed"
        ? new Date(left.visit.check_out_time || left.visit.scheduled_end_time || left.visit.created_at || 0).getTime()
        : new Date(left.visit.scheduled_start_time || left.visit.check_in_time || 0).getTime();
    const rightDate =
      phase === "completed"
        ? new Date(right.visit.check_out_time || right.visit.scheduled_end_time || right.visit.created_at || 0).getTime()
        : new Date(right.visit.scheduled_start_time || right.visit.check_in_time || 0).getTime();
    return phase === "completed" ? rightDate - leftDate : leftDate - rightDate;
  });
}

export function statusTone(phase) {
  if (phase === "ongoing") return "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200";
  if (phase === "completed") return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
  return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
}

export function phaseLabel(phase) {
  if (phase === "ongoing") return "Ongoing";
  if (phase === "completed") return "Completed";
  return "Upcoming";
}

export function getWorkerInitials(name) {
  return (name || "EL")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export function getCountdownLabel(value) {
  if (!value) return "Schedule pending";
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return "Service window has started";
  const totalMinutes = Math.max(1, Math.round(diff / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours) return `${hours}h ${minutes}m to go`;
  return `${minutes}m to go`;
}

export function getElapsedLabel(startTime) {
  if (!startTime) return "Timer will begin at check-in";
  const diff = Math.max(0, Date.now() - new Date(startTime).getTime());
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} elapsed`;
}

export function canEnableLiveTracking(startTime, phase) {
  if (phase === "ongoing" || phase === "completed") return true;
  if (!startTime) return false;
  return new Date(startTime).getTime() - Date.now() <= 10 * 60 * 1000;
}

export function getMapPoints(liveStatus) {
  const workerLat = Number(liveStatus?.worker_latitude);
  const workerLng = Number(liveStatus?.worker_longitude);
  const homeLat = Number(liveStatus?.destination_latitude);
  const homeLng = Number(liveStatus?.destination_longitude);
  if ([workerLat, workerLng, homeLat, homeLng].some((value) => Number.isNaN(value))) {
    return {
      home: { x: 78, y: 42 },
      worker: { x: 24, y: 68 },
      live: false,
    };
  }

  const xSpread = Math.max(Math.abs(homeLng - workerLng), 0.002);
  const ySpread = Math.max(Math.abs(homeLat - workerLat), 0.002);
  const minLng = Math.min(homeLng, workerLng) - xSpread * 0.35;
  const maxLng = Math.max(homeLng, workerLng) + xSpread * 0.35;
  const minLat = Math.min(homeLat, workerLat) - ySpread * 0.35;
  const maxLat = Math.max(homeLat, workerLat) + ySpread * 0.35;

  const projectX = (longitude) => ((longitude - minLng) / (maxLng - minLng)) * 100;
  const projectY = (latitude) => 100 - ((latitude - minLat) / (maxLat - minLat)) * 100;

  return {
    home: { x: projectX(homeLng), y: projectY(homeLat) },
    worker: { x: projectX(workerLng), y: projectY(workerLat) },
    live: true,
  };
}
