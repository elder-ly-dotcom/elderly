import { useEffect, useState } from "react";
import { getRequests, rescheduleRequest, cancelRequest } from "../api/api";

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const userId = 1;

  const fetchRequests = () => {
    getRequests(userId).then(res => setRequests(res.data));
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleReschedule = async (req) => {
    const newDate = prompt("Enter new date (YYYY-MM-DD):", req.scheduled_date);
    if (newDate) {
      await rescheduleRequest(req.id, newDate);
      alert("Rescheduled successfully!");
      fetchRequests();
    }
  };

  const handleCancel = async (req) => {
    if (window.confirm("Are you sure you want to cancel?")) {
      await cancelRequest(req.id);
      alert("Request canceled!");
      fetchRequests();
    }
  };

  return (
    <div className="container">
      <h2>Your Service Requests</h2>
      {requests.length === 0 && <p>No requests yet.</p>}
      {requests.map(r => (
        <div key={r.id} className="card">
          <h3>{r.service_name}</h3>
          <p>Scheduled Date: {r.scheduled_date}</p>
          <p>Status: {r.status}</p>
          <p>Notes: {r.notes}</p>
          <button onClick={() => handleReschedule(r)}>Reschedule</button>
          <button onClick={() => handleCancel(r)} style={{marginLeft: "10px", background: "red"}}>Cancel</button>
        </div>
      ))}
    </div>
  );
}