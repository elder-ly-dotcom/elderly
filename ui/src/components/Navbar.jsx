// src/components/Navbar.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "/assets/logo.svg"; // make sure path is correct
import { useAuthStore } from "../store/authStore";

const NAV_LINKS = [
  { id: "hero", label: "Home" },
  { id: "services", label: "Services" },
  { id: "story", label: "Story" },
  { id: "howitworks", label: "How It Works" },
  { id: "testimonials", label: "Testimonials" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "Contact" },
];

export default function Navbar() {
  const [active, setActive] = useState("hero");
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);

  const handleScroll = () => {
    NAV_LINKS.forEach(({ id }) => {
      const section = document.getElementById(id);
      if (section) {
        const top = section.offsetTop - 100;
        const bottom = top + section.offsetHeight;
        if (window.scrollY >= top && window.scrollY < bottom) {
          setActive(id);
        }
      }
    });
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav className="fixed top-0 w-full bg-white shadow-md z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <img
          src={logo}
          alt="ElderCare+ Logo"
          className="h-14 md:h-16 w-auto cursor-pointer hover:scale-105 transition-transform duration-200"
          onClick={() => scrollToSection("hero")}
        />

        {/* Navigation Links */}
        <ul className="hidden md:flex space-x-8 text-gray-700 font-semibold">
          {NAV_LINKS.map(({ id, label }) => (
            <li
              key={id}
              onClick={() => scrollToSection(id)}
              className={`cursor-pointer transition-colors duration-200 hover:text-indigo-300 ${
                active === id ? "text-indigo-700" : ""
              }`}
            >
              {label}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <button
            onClick={() => (token ? navigate("/app") : document.getElementById("auth-panel")?.scrollIntoView({ behavior: "smooth" }))}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            {token ? "Open Portal" : "Login / Register"}
          </button>
        </div>
      </div>
    </nav>
  );
}
