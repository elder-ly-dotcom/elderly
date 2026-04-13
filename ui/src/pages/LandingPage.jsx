import { useEffect } from "react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Home from "./Home";
import AuthPanel from "../components/auth/AuthPanel";

export default function LandingPage() {
  useEffect(() => {
    document.title = "ELDERLY | Companion Care for Seniors";
  }, []);

  return (
    <>
      <Navbar />
      <Home />
      <AuthPanel />
      <Footer />
    </>
  );
}
