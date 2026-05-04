import React from "react";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-indigo-50 pt-24"
    >
      <video autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover brightness-30">
        <source src="/assets/elderly‑care‑assist.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <div className="relative z-10 max-w-5xl px-6 text-center md:text-left">
        <motion.h1
          className="mb-6 text-5xl font-extrabold leading-tight text-white md:text-6xl"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          Empowering Digital Confidence for Your Parents
        </motion.h1>

        <motion.p
          className="mb-8 max-w-2xl text-lg text-white/90 md:text-xl"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
        >
          Monthly care support from companionship visits to errands, video calls, transport, and wellness updates.
        </motion.p>

        <motion.div
          className="flex flex-col justify-center gap-6 md:flex-row md:justify-start"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.7 }}
        >
          <button
            onClick={() => document.getElementById("auth-panel")?.scrollIntoView({ behavior: "smooth" })}
            className="rounded-lg bg-indigo-600 px-8 py-4 font-semibold text-white shadow-md transition hover:bg-indigo-700"
          >
            Start Rs. 1,999/month
          </button>
          <button
            onClick={() => window.open("https://youtu.be/demo", "_blank")}
            className="rounded-lg border border-white px-8 py-4 font-semibold text-white transition hover:bg-white hover:text-cyan-700"
          >
            Watch Demo
          </button>
        </motion.div>
      </div>
    </section>
  );
}
