import React from "react";

export default function CTA({ onOpenBooking }) {
  return (
    <section className="bg-indigo-300 py-16 text-white text-center">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-4xl font-extrabold mb-4">
          Ready to Give Your Parents the Best Digital Care?
        </h2>
        <p className="mb-8 text-lg max-w-xl mx-auto">
          Join ElderCare+ today and start managing your elderly loved ones’ digital life with ease and compassion.
        </p>
        <button
          onClick={onOpenBooking}
          className="bg-indigo-500 hover:bg-indigo-400 px-8 py-4 rounded-lg font-semibold transition"
        >
          Book a Free Consultation
        </button>
      </div>
    </section>
  );
}