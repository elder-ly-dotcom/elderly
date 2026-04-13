import React from "react";
import { motion } from "framer-motion";

export default function Pricing({ onSubscribe }) {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <motion.h2
          className="text-3xl font-extrabold mb-12"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          Subscription Pricing
        </motion.h2>

        <div className="flex flex-col md:flex-row justify-center gap-10 max-w-5xl mx-auto">
          <motion.div
            className="border rounded-lg shadow-lg p-8 flex-1 hover:shadow-indigo-300 transition cursor-default"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex flex-col gap-3 justify-between items-center h-full">
                <div>
                <h3 className="text-2xl font-semibold mb-4">Monthly Plan</h3>
                <p className="text-gray-600 mb-6">
                    ₹999 / month — All services + weekly tech check visits
                </p>
                <ul className="mb-6 text-left list-disc list-inside text-gray-700 space-y-2">
                    <li>Digital life management</li>
                    <li>Health & safety support</li>
                    <li>Device troubleshooting</li>
                    <li>Weekly technician visits</li>
                </ul>
                </div>
                <button
                onClick={onSubscribe}
                className="w-full bg-indigo-600 text-white py-3 rounded hover:bg-indigo-700 transition"
                >
                Subscribe Now
                </button>
            </div>
          </motion.div>

          <motion.div
            className="border rounded-lg shadow-lg p-8 flex-1 bg-indigo-400 text-white cursor-default"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          ><div className="flex flex-col gap-3 justify-between items-center h-full">
                <div>
                    <h3 className="text-2xl font-semibold mb-4">Annual Plan</h3>
                    <p className="mb-6 text-lg font-bold">₹10,999 / year</p>
                    <p className="mb-6">
                    Save 8% and enjoy continuous support all year round with extra
                    perks.
                    </p>
                    <ul className="mb-6 list-disc list-inside space-y-2">
                    <li>All monthly plan features</li>
                    <li>Priority support & faster response</li>
                    <li>Discounted add-on services</li>
                    <li>Exclusive webinars & demos</li>
                    </ul>
                </div>
                <button
                onClick={onSubscribe}
                className="w-full bg-white text-indigo-600 py-3 rounded hover:bg-gray-100 transition"
                >
                Subscribe Now
                </button>
            </div>
          </motion.div>

          <motion.div
            className="border rounded-lg shadow-lg p-8 flex-1 bg-indigo-400 text-white cursor-default"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          ><div className="flex flex-col gap-3 justify-between items-center h-full">
                <div>
                    <h3 className="text-2xl font-semibold mb-4">Customized Plan</h3>
                    <p className="mb-6 text-lg font-bold">Reach out to Us</p>
                    <p className="mb-6">
                    Save 8% and enjoy continuous support all year round with extra
                    perks.
                    </p>
                    <ul className="mb-6 list-disc list-inside space-y-2">
                    <li>All monthly plan features</li>
                    <li>Priority support & faster response</li>
                    <li>Discounted add-on services</li>
                    <li>Exclusive webinars & demos</li>
                    </ul>
                </div>
                <button
                onClick={onSubscribe}
                className="w-full bg-white text-indigo-600 py-3 rounded hover:bg-gray-100 transition"
                >
                Connect wth us
                </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}