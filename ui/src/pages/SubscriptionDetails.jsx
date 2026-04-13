// src/pages/SubscriptionDetails.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function SubscriptionDetails() {
  const navigate = useNavigate();
  const subscription = {
    plan: "Monthly Digital Support",
    price: 999,
    nextBilling: "2026-05-03",
    usedServices: 3,
    totalServices: 4,
  };

  const progress = (subscription.usedServices / subscription.totalServices) * 100;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Your Subscription</h1>
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow-md p-6 space-y-4">
        <p className="text-gray-600">Plan: <span className="font-semibold">{subscription.plan}</span></p>
        <p className="text-gray-600">Price: <span className="font-semibold">₹{subscription.price}/month</span></p>
        <p className="text-gray-600">Next Billing: <span className="font-semibold">{subscription.nextBilling}</span></p>

        <div className="mt-4">
          <p className="text-gray-700 mb-1">Service Usage</p>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-green-600 h-4 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-right font-medium text-green-700 mt-1">{subscription.usedServices}/{subscription.totalServices} services used</p>
        </div>

        <button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold mt-6 shadow-md transition">
          Renew / Upgrade Plan
        </button>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => navigate("/")}
          className="text-green-600 underline font-medium"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}