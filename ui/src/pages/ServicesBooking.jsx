// src/pages/ServicesBooking.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const services = [
  { id: 1, title: "Digital Life", desc: "Pay bills, book Uber/Ola, order groceries", price: 499 },
  { id: 2, title: "Digital Health", desc: "Set up video calls with doctors/family", price: 399 },
  { id: 3, title: "Digital Safety", desc: "Set up CCTV and teach usage", price: 599 },
  { id: 4, title: "Tech Check", desc: "Weekly device & WiFi troubleshooting visit", price: 699 },
];

export default function ServicesBooking() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleBooking = async (service) => {
    setLoading(true);
    try {
      // Simulate API call
      await fetch("/api/book-service", {
        method: "POST",
        body: JSON.stringify(service),
        headers: { "Content-Type": "application/json" },
      });
      alert(`Service ${service.title} booked successfully!`);
    } catch (err) {
      alert("Booking failed. Try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Book a Service</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {services.map((s) => (
          <motion.div
            key={s.id}
            className="bg-white rounded-xl shadow-md p-6 flex flex-col justify-between hover:scale-105 transition-transform"
            whileHover={{ scale: 1.05 }}
          >
            <div>
              <h2 className="text-xl font-semibold mb-2">{s.title}</h2>
              <p className="text-gray-600 mb-4">{s.desc}</p>
              <p className="text-green-600 font-bold text-lg">₹{s.price}/month</p>
            </div>
            <button
              disabled={loading}
              onClick={() => handleBooking(s)}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold shadow-md transition"
            >
              {loading ? "Booking..." : "Book Now"}
            </button>
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