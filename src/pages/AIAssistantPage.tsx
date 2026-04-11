import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AIAssistantSection } from "@/components/sections/AIAssistantSection";

export default function AIAssistantPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 md:pt-24">
        <AIAssistantSection />
      </main>
      <Footer />
    </div>
  );
}
