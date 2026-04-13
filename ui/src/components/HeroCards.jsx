// src/components/HeroCards.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const cards = [
  {
    title: "Monthly Digital Support",
    description:
      "Book elder care digital services: bill payments, WhatsApp calls, tech checkups.",
    link: "/services-booking",
  },
  {
    title: "Track Services",
    description:
      "Check which services were completed for your parents each week.",
    link: "/track-services",
  },
  {
    title: "Subscription Details",
    description:
      "View your subscription, billing history, and manage preferences.",
    link: "/subscription-details",
  },
];

export default function HeroCards() {
  const navigate = useNavigate();

  return (
    <section className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
      {cards.map((card, idx) => (
        <motion.div
          key={idx}
          whileHover={{ scale: 1.05 }}
          className="bg-white rounded-xl shadow-lg p-6 cursor-pointer transition transform"
          onClick={() => navigate(card.link)}
        >
          <h3 className="text-xl font-semibold text-indigo-900 mb-4">
            {card.title}
          </h3>
          <p className="text-gray-700">{card.description}</p>
        </motion.div>
      ))}
    </section>
  );
}