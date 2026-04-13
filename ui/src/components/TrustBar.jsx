import { ShieldCheck, HeartHandshake, Wifi } from "lucide-react";
import { motion } from "framer-motion";

export default function TrustBar() {
  const items = [
    { icon: <ShieldCheck size={20} />, text: "Verified Experts" },
    { icon: <HeartHandshake size={20} />, text: "Patient & Caring" },
    { icon: <Wifi size={20} />, text: "Weekly Home Visits" },
  ];

  return (
    <motion.div
      className="flex justify-center gap-16 py-12 bg-gray-50 text-gray-600"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          {item.icon}
          <span className="font-medium">{item.text}</span>
        </div>
      ))}
    </motion.div>
  );
}