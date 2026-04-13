import { useEffect, useState } from "react";

import apiClient from "../../lib/apiClient";
import { WS_BASE_URL } from "../../lib/runtimeConfig";
import { useAuthStore } from "../../store/authStore";

export default function SafetyCenter() {
  const { user } = useAuthStore();
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    apiClient.get("/emergency/history").then((response) => setAlerts(response.data));

    if (!user?.id) return undefined;
    const socket = new WebSocket(`${WS_BASE_URL}/emergency/ws/customer/${user.id}`);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      setAlerts((current) => [
        {
          id: payload.alert_id,
          message: payload.message,
          status: payload.status,
          start_time: new Date().toISOString(),
          responder_id: null,
        },
        ...current,
      ]);
    };
    const timer = setInterval(() => socket.readyState === WebSocket.OPEN && socket.send("ping"), 25000);
    return () => {
      clearInterval(timer);
      socket.close();
    };
  }, [user?.id]);

  return (
    <div className="rounded-[1.75rem] border border-rose-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <h2 className="text-2xl font-semibold text-slate-900">Safety Center</h2>
      <div className="mt-4 grid gap-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="rounded-3xl border border-rose-200 bg-rose-50 p-4">
            <p className="font-semibold text-slate-900">{alert.message}</p>
            <p className="mt-2 text-sm text-rose-700">
              {alert.status} • Triggered at {new Date(alert.start_time).toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-rose-700">
              {alert.responder_id ? `Responder ID: ${alert.responder_id}` : "Awaiting admin response"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
