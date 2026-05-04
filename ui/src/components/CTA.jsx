import React from "react";

export default function CTA({ onOpenBooking }) {
  return (
    <section className="bg-gradient-to-r from-indigo-600 via-cyan-600 to-emerald-600 py-16 text-center text-white">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-4xl font-extrabold mb-4">
          Ready to Give Your Parents the Best Digital Care?
        </h2>
        <p className="mb-8 text-lg max-w-xl mx-auto">
          Join ElderCare+ today and start managing your elderly loved ones’ digital life with ease and compassion.
        </p>
        <button
          onClick={onOpenBooking}
          className="rounded-lg bg-white px-8 py-4 font-semibold text-indigo-700 transition hover:bg-indigo-50"
        >
          Book a Free Consultation
        </button>
      </div>
    </section>
  );
}
