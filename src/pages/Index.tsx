import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { HeroSection } from "@/components/sections/HeroSection";
import { StatsSection } from "@/components/sections/StatsSection";
import { ResourcesSection } from "@/components/sections/ResourcesSection";
import { BranchesSection } from "@/components/sections/BranchesSection";
import { MentorsSection } from "@/components/sections/MentorsSection";
import { AIAssistantSection } from "@/components/sections/AIAssistantSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { Footer } from "@/components/layout/Footer";

const Index = () => {
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash.slice(1); // e.g. "ai-assistant" or "resources"
    if (hash) {
      const el = document.getElementById(hash);
      if (el) {
        const t = setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
        return () => clearTimeout(t);
      }
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [location.pathname, location.hash]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <ResourcesSection />
        <BranchesSection />
        <MentorsSection />
        <AIAssistantSection />
        <AboutSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
