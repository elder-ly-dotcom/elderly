import React from "react";
import { motion } from "framer-motion";

const plans = [
  {
    name: "The Essential Care Plan",
    label: "Tier 1",
    price: "Rs. 1,999 / month",
    description: "Designed for families who want reliable support for daily errands and companionship.",
    features: [
      "Verified Companion Visits: Two scheduled visits per week for companionship, local walks, or neighborhood errands.",
      "Essential Shopping Support: Medicine and grocery procurement and doorstep delivery.",
      "Digital Connectivity: Assistance with setting up weekly video calls with family abroad.",
      "Transport Assistance: 24/7 booking and remote monitoring of taxis and Ubers for local travel.",
      "Vital Signs Monitoring: Basic blood pressure and pulse checks during every visit.",
      "Home Utility Audit: Basic check of Wi-Fi and essential appliances to ensure everything is functional.",
    ],
    cardClassName: "border border-slate-200 bg-white",
    buttonClassName: "bg-cyan-500 text-white hover:bg-cyan-600",
    buttonLabel: "Choose Essential",
  },
  {
    name: "The Premium Care Plan",
    label: "Tier 2",
    price: "Rs. 3,999 / month",
    description: "Designed for total peace of mind, including all Essential features plus specialized professional management.",
    features: [
      "Includes ALL Essential Care Plan services.",
      "Medical & Clinical Orchestration: Assistance with doctor appointments, hospital-grade transport, and on-site companion support during checkups.",
      "Proactive Home Maintenance: We manage repairmen, oversee service, and handle payments.",
      "Anytime Digital Concierge: Unlimited 24/7 access to our digital helpdesk for tech or navigation support.",
      "Proactive Wellness Reporting: Detailed health and mood reports sent to your dashboard after every visit.",
      "Smart Mobility Priority: Guaranteed 24/7 ambulance dispatch coordination and emergency hospital pre-registration.",
      "Utility & Bill Management: Digital payment support for electricity, water, and taxes to prevent service gaps.",
    ],
    cardClassName: "border border-cyan-200 bg-cyan-50/70",
    buttonClassName: "bg-slate-900 text-white hover:bg-slate-800",
    buttonLabel: "Choose Premium",
  },
  {
    name: "The Celebration Add-On",
    label: "Tier 3",
    price: "Available as an add-on",
    description: "This works as a booster for either care plan and mirrors the celebration module already available in the customer portal.",
    features: [
      "Celebration Packages: Specialized planning and execution for birthdays, anniversaries, and festive home celebrations.",
      "Includes cake delivery, home decoration, and virtual party hosting.",
    ],
    cardClassName: "border border-emerald-200 bg-emerald-50/70",
    buttonClassName: "bg-emerald-500 text-white hover:bg-emerald-600",
    buttonLabel: "Explore Add-On",
  },
];

export default function Pricing({ onSubscribe }) {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <motion.h2
          className="mb-12 text-3xl font-extrabold"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          Prices and Plans
        </motion.h2>

        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              className={`flex h-full flex-col rounded-[2rem] p-8 text-left shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition ${plan.cardClassName}`}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 1) }}
            >
              <div className="flex h-full flex-col">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{plan.label}</p>
                  <h3 className="mt-3 text-2xl font-semibold text-slate-900">{plan.name}</h3>
                  <p className="mt-3 text-3xl font-bold text-slate-900">{plan.price}</p>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{plan.description}</p>
                </div>

                <ul className="mt-6 flex-1 space-y-3 text-sm leading-6 text-slate-700">
                  {plan.features.map((feature) => (
                    <li key={feature} className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm">
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={onSubscribe}
                  className={`mt-6 w-full rounded-2xl px-5 py-3 text-sm font-semibold transition ${plan.buttonClassName}`}
                >
                  {plan.buttonLabel}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
