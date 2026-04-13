import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";

const faqs = [
  {
    q: "What services are included in the monthly subscription?",
    a: "The subscription covers digital life tasks like bill payments, ride bookings, grocery orders, health support, device troubleshooting, and weekly tech visits.",
  },
  {
    q: "How does the weekly tech check visit work?",
    a: "A trained technician visits your parents weekly to ensure devices, WiFi, and CCTV systems work perfectly and address any issues.",
  },
  {
    q: "Can I customize the services for my parents?",
    a: "Yes! We tailor services according to your parents' specific needs for digital and health support.",
  },
  {
    q: "Is there a demo available before subscribing?",
    a: "Absolutely! You can watch our demo video linked in the Hero section to understand the service better.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleIndex = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-6">
        <motion.h2
          className="text-3xl font-extrabold mb-10 text-center"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          Frequently Asked Questions
        </motion.h2>

        <div className="space-y-4">
          {faqs.map(({ q, a }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-lg shadow p-5 cursor-pointer"
              onClick={() => toggleIndex(i)}
              aria-expanded={openIndex === i}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-800">{q}</h3>
                {openIndex === i ? (
                  <ChevronUp size={24} className="text-indigo-600" />
                ) : (
                  <ChevronDown size={24} className="text-gray-400" />
                )}
              </div>
              {openIndex === i && (
                <motion.p
                  className="mt-3 text-gray-600"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.3 }}
                >
                  {a}
                </motion.p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}