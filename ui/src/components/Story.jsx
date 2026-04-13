import React from "react";
import { motion } from "framer-motion";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
};

export default function Story() {
  return (
    <section className="py-20 bg-gray-100">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
        <motion.div
          className="flex-1"
          initial="initial"
          animate="animate"
          variants={fadeInUp}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-3xl font-extrabold mb-6">
            Why ElderCare+ Is The Support We Stay Close to Them
          </h2>
          <p className="text-gray-700 leading-relaxed mb-6">
            We understand how challenging it can be for elderly parents to stay
            connected and manage the digital world. Our personalized services
            provide peace of mind to families living far apart, with patient,
            caring, and trusted assistance.
          </p>
          <ul className="list-disc pl-5 text-gray-600 space-y-2">
            <li>Verified Experts with real empathy and experience</li>
            <li>Patient & Caring tech support tailored to seniors</li>
            <li>Weekly home visits to ensure seamless service</li>
            <li>Custom solutions for digital health, safety & device support</li>
          </ul>
        </motion.div>
        <motion.div
          className="flex-1 rounded-lg overflow-hidden shadow-lg"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          <img
            src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=80"
            alt="Family digital care"
            className="w-full object-cover"
            loading="lazy"
          />
        </motion.div>
      </div>
    </section>
  );
}