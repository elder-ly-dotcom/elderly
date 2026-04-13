// src/pages/Home.jsx
import React from "react";
import { Gift, Share2, Video } from "lucide-react";
import { toast } from "sonner";
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
  const openBooking = () => document.getElementById("auth-panel")?.scrollIntoView({ behavior: "smooth" });
  const shareReferral = async () => {
    const message = "Share ELDERLY with a family who wants dependable senior visits, emergency support, and heartfelt celebration services.";
    if (navigator.share) {
      try {
        await navigator.share({ title: "ELDERLY Referral", text: message, url: window.location.origin });
        return;
      } catch {
        // fall through
      }
    }
    await navigator.clipboard.writeText(`${message} ${window.location.origin}`);
    toast.success("Referral message copied. Share it with your contacts.");
  };

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
      <section className="mx-auto mt-10 max-w-6xl px-4">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-rose-100 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
              <Gift size={14} />
              Emotional care add-on
            </div>
            <h3 className="mt-4 text-3xl font-semibold text-slate-900">Celebrate birthdays, festivals, and anniversaries from anywhere</h3>
            <p className="mt-3 text-base text-slate-600">
              Even if you are far away from your loved ones, you can celebrate with them without any headache as ELDERLY arranges valet visits, decoration, cake, candles, favourite food, celebration photos, and optional family video-call assisted moments inside the app.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openBooking}
                className="rounded-2xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-600"
              >
                Explore Celebration Packages
              </button>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-700">
                <Video size={16} />
                Family video-call assisted visit available
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-emerald-100 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Referral offer</p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">Invite another family to ELDERLY</h3>
            <p className="mt-3 text-sm text-slate-600">
              Share ELDERLY with your contacts or social platforms and help another family discover senior care, emergency support, and celebration services.
            </p>
            <button
              type="button"
              onClick={shareReferral}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              <Share2 size={16} />
              Share Referral Offer
            </button>
          </div>
        </div>
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
