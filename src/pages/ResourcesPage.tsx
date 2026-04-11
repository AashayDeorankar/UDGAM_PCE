import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ResourcesSection } from "@/components/sections/ResourcesSection";
import { BranchesSection } from "@/components/sections/BranchesSection";

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 md:pt-24">
        <ResourcesSection basePath="/resources" showCta={false} />
        <BranchesSection />
      </main>
      <Footer />
    </div>
  );
}
