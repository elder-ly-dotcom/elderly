// src/pages/Home.jsx
import React, { useState } from "react";
import Hero from "../components/Hero";
import HeroCards from "../components/HeroCards";
import Services from "../components/Services";
import Story from "../components/Story";
import HowItWorks from "../components/HowItWorks";
import Testimonials from "../components/Testimonials";
import Pricing from "../components/Pricing";
import FAQ from "../components/FAQ";
import CTA from "../components/CTA";

export default function Home() {
  const [isBookingOpen, setBookingOpen] = useState(false);
  const openBooking = () => setBookingOpen(true);
  const closeBooking = () => setBookingOpen(false);

  return (
    <main className="pt-16">
      <section id="hero">
        <Hero onStart={openBooking} />
      </section>
      <HeroCards />
      <section id="services">
        <Services />
      </section>
      <section id="story">
        <Story />
      </section>
      <section id="howitworks">
        <HowItWorks />
      </section>
      <section id="testimonials">
        <Testimonials />
      </section>
      <section id="pricing">
        <Pricing onSubscribe={openBooking} />
      </section>
      <section id="faq">
        <FAQ />
      </section>
      <section id="contact">
        <CTA onOpenBooking={openBooking} />
      </section>
    </main>
  );
}
