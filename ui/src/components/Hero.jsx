// src/components/Hero.jsx
import React from "react";
import { motion } from "framer-motion";

export default function Hero({ onStart }) {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center bg-green-50 pt-24 overflow-hidden"
    >
      {/* Background video (concept‑focused) */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover brightness-30"
      >
        <source
          src="/assets/elderly‑care‑assist.mp4"
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>

      {/* Overlay content */}
      <div className="relative z-10 max-w-5xl px-6 text-center md:text-left">
        <motion.h1
          className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          Empowering Digital Confidence for Your Parents
        </motion.h1>

        <motion.p
          className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
        >
          Monthly Digital Support — from paying bills to setting up video calls, and everything in between.
        </motion.p>

        <motion.div
          className="flex flex-col md:flex-row justify-center md:justify-start gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.7 }}
        >
          <button
            onClick={() => document.getElementById("auth-panel")?.scrollIntoView({ behavior: "smooth" })}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-lg font-semibold shadow-md transition"
          >
            Start ₹999/month
          </button>
          <button
            onClick={() => window.open("https://youtu.be/demo", "_blank")}
            className="border border-white text-white hover:bg-white hover:text-green-700 px-8 py-4 rounded-lg font-semibold transition"
          >
            Watch Demo
          </button>
        </motion.div>
      </div>
    </section>
  );
}