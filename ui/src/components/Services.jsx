import React from "react";
import { motion } from "framer-motion";
import { CalendarHeart, HeartPulse, ShieldCheck, ShoppingBag, Smartphone, Wrench } from "lucide-react";

const services = [
  {
    title: "Verified Companion Visits",
    desc: "Scheduled companionship visits for local walks, check-ins, and trusted neighborhood errands.",
    icon: CalendarHeart,
  },
  {
    title: "Essential Shopping Support",
    desc: "Medicine and grocery procurement with dependable doorstep delivery support for daily needs.",
    icon: ShoppingBag,
  },
  {
    title: "Digital Connectivity",
    desc: "Weekly family video-call setup plus ongoing tech guidance whenever parents need help.",
    icon: Smartphone,
  },
  {
    title: "Medical Coordination",
    desc: "Doctor appointment assistance, companion support during checkups, and transport coordination.",
    icon: HeartPulse,
  },
  {
    title: "Home Utility Management",
    desc: "Wi-Fi and appliance checks, repair follow-up, service oversight, and utility bill handling.",
    icon: Wrench,
  },
  {
    title: "Mobility & Emergency Support",
    desc: "24/7 taxi booking support, ambulance dispatch coordination, and emergency hospital pre-registration.",
    icon: ShieldCheck,
  },
];

export default function Services() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <motion.h2
          className="text-3xl font-extrabold text-gray-900 mb-[60px]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          Services Designed Around Daily Care
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 pt-[30px]  mx-auto">
          {services.map(({ title, desc, icon: Icon }, i) => (
            <motion.div
              key={title}
              className="group p-6 bg-gray-50 rounded-xl shadow hover:shadow-lg transition-all duration-300 cursor-default relative flex flex-col items-center justify-center text-center min-h-[230px]"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i + 0.3 }}
            >
              <div
                className="
    /* Positioning & Layout */
    absolute left-1/2 -translate-x-1/2 top-[-40px] w-[70px] h-[70px] 
    flex items-center justify-center rounded-full border-[3px] border-transparent 
    shadow-[0px_7px_29px_0px_rgba(100,100,111,0.2)]
    
    /* Default State (Gradient Border / White Center) */
    text-indigo-600
    [background-image:linear-gradient(white,white),linear-gradient(to_bottom,#4f39f6,#8e82eae0,#fff,#fff)]
    [background-origin:border-box]
    [background-clip:content-box,border-box]
    
    /* Hover State (Fills with Gradient, Icon turns White) */
    group-hover:text-white
    group-hover:[background:linear-gradient(to_bottom,#4f39f6,#8e82eae0)]
    group-hover:[background-image:linear-gradient(white,white),linear-gradient(to_bottom,#4f39f6,#8e82eae0,#8e82eae0,#8e82eae0)]
    
    /* Smooth Transition */
    transition-all duration-300 ease-in-out
  "
              >
                <Icon size={36} className="transition-colors duration-300" />
              </div>

              <h3 className="text-xl font-semibold mb-2">{title}</h3>
              <p className="text-gray-600">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
