// src/components/Footer.jsx
import React from "react";

export default function Footer() {
  return (
    <footer className="bg-gray-50 py-8 mt-24">
      <div className="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} ElderCare+. All rights reserved.
      </div>
    </footer>
  );
}