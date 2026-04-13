import { subscribePlan } from "../api/api";

export default function Subscription() {
  const userId = 1;

  const handleSubscribe = async () => {
    const res = await subscribePlan(userId);
    alert(`Subscribed successfully for ₹${res.data.price}/month!`);
  };

  return (
    <div className="container">
      <h2>Monthly Subscription Plan</h2>
      <div className="card">
        <h3>Digital Concierge Plan</h3>
        <p>₹999/month</p>
        <ul>
          <li>Weekly Tech Check</li>
          <li>Device & WiFi Setup</li>
          <li>Grocery & Medicine Assistance</li>
          <li>Doctor & Family Video Calls</li>
        </ul>
        <button onClick={handleSubscribe}>Subscribe Now (Test Payment)</button>
      </div>
    </div>
  );
}