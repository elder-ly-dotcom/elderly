// src/pages/TrackServices.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const trackingData = [
  { id: 1, service: "Digital Life", progress: 80, lastUpdate: "Today 10:30 AM" },
  { id: 2, service: "Digital Health", progress: 50, lastUpdate: "Yesterday 3:45 PM" },
  { id: 3, service: "Digital Safety", progress: 30, lastUpdate: "2 days ago" },
];

export default function TrackServices() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Track Your Services</h1>
      <div className="space-y-4">
        {trackingData.map((t) => (
          <motion.div
            key={t.id}
            className="bg-white shadow-md rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: t.id * 0.1 }}
          >
            <h2 className="text-xl font-semibold">{t.service}</h2>
            <p className="text-gray-600 mb-2">Last Update: {t.lastUpdate}</p>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-green-600 h-4 rounded-full transition-all duration-700"
                style={{ width: `${t.progress}%` }}
              />
            </div>
            <p className="text-right mt-1 font-medium text-green-700">{t.progress}% Complete</p>
          </motion.div>
        ))}
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