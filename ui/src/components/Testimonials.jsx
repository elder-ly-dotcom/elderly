import React, { useState } from "react";
import { motion } from "framer-motion";

const testimonials = [
  {
    name: "Anita Sharma",
    city: "Bangalore",
    feedback:
      "ElderCare+ has been a lifesaver! My parents can now easily stay connected and manage their digital tasks without stress.",
  },
  {
    name: "Rajesh Kumar",
    city: "US",
    feedback:
      "The weekly tech visits ensure my parents' devices work perfectly. Highly recommend for anyone with elderly parents abroad!",
  },
  {
    name: "Sunita Joshi",
    city: "Europe",
    feedback:
      "From health video calls to grocery orders, the service is seamless. Truly peace of mind for me and my family.",
  },
];

export default function Testimonials() {
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  function prevTestimonial() {
    setTestimonialIndex((i) => (i === 0 ? testimonials.length - 1 : i - 1));
  }
  function nextTestimonial() {
    setTestimonialIndex((i) => (i === testimonials.length - 1 ? 0 : i + 1));
  }

  return (
    <section className="py-20 bg-gray-100">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <motion.h2
          className="text-3xl font-extrabold mb-12"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          What Our Clients Say
        </motion.h2>

        <div className="relative">
          <button
            onClick={prevTestimonial}
            aria-label="Previous testimonial"
            className="absolute left-0 top-1/2 -translate-y-1/2 bg-white rounded-full p-3 shadow hover:bg-indigo-50 transition"
          >
            ‹
          </button>

          <motion.div
            key={testimonialIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-lg p-8 max-w-xl mx-auto shadow-lg"
          >
            <p className="text-gray-700 italic mb-4">
              "{testimonials[testimonialIndex].feedback}"
            </p>
            <h4 className="font-semibold text-indigo-600">
              {testimonials[testimonialIndex].name}
            </h4>
            <p className="text-sm text-gray-500">
              {testimonials[testimonialIndex].city}
            </p>
          </motion.div>

          <button
            onClick={nextTestimonial}
            aria-label="Next testimonial"
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-white rounded-full p-3 shadow hover:bg-indigo-50 transition"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  );
}