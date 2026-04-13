import React from "react";
import { motion } from "framer-motion";
import { Footprints, LogIn, Wallet } from "lucide-react";

export default function HowItWorks() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <motion.h2
          className="text-3xl font-extrabold mb-10"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          How We Serve You
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto">
          <motion.div
            className="p-8 border rounded-lg shadow hover:shadow-lg transition cursor-default"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="text-indigo-600 mb-4">
              <LogIn size={50} />
            </div>
            <h3 className="text-xl font-semibold mb-2">App Registration</h3>
            <p className="text-gray-600">Register in our app and explore services we offer</p>
          </motion.div>
          <motion.div
            className="p-8 border rounded-lg shadow hover:shadow-lg transition cursor-default"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-indigo-600 mb-4">
              <Wallet size={50} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Subscribe & Pay</h3>
            <p className="text-gray-600">
              Choose your specific slot and subscribe to our services with easy payment options
            </p>
          </motion.div>
          <motion.div
            className="p-8 border rounded-lg shadow hover:shadow-lg transition cursor-default"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="text-indigo-600 mb-4">
              <Footprints size={50} />
            </div>
            <h3 className="text-xl font-semibold mb-2">We go to you</h3>
            <p className="text-gray-600">
              We provide home visits as per your subscriptions and ensure your parents are digitally safe and healthy.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}