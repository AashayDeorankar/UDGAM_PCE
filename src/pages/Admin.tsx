import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { getApiBase } from "@/lib/api-base";

export default function Admin() {
  const { isAdmin } = useAuth();
  const [metrics, setMetrics] = useState<{
    totalUsers: number;
    totalInterviews: number;
    averageScore: number;
    activeUsers: number;
    engagementRate: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!isAdmin) return;
      setLoading(true);
      try {
        const res = await fetch(`${getApiBase()}/api/analytics/admin`);
        const data = await res.json().catch(() => null);
        if (data && typeof data.totalUsers === "number") {
          setMetrics(data);
        }
      } catch {
        setMetrics(null);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [isAdmin]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16 md:pt-24 md:pb-20 bg-secondary/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-40" />
        <div className="container relative">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Admin Panel</h1>
          <p className="text-muted-foreground mb-6">Hidden metrics for internal use.</p>

          {!isAdmin && (
            <div className="rounded-xl border-2 border-border bg-card p-6 text-sm text-muted-foreground">
              You do not have access to this page.
            </div>
          )}

          {isAdmin && (
            <div className="rounded-xl border-2 border-border bg-card p-6">
              {loading && <p className="text-sm text-muted-foreground">Loading metrics…</p>}
              {!loading && metrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-foreground">Total users</p>
                    <p className="text-muted-foreground">{metrics.totalUsers}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Total interviews</p>
                    <p className="text-muted-foreground">{metrics.totalInterviews}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Average score</p>
                    <p className="text-muted-foreground">{metrics.averageScore}/100</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Engagement</p>
                    <p className="text-muted-foreground">
                      {metrics.activeUsers} active users ({metrics.engagementRate}%)
                    </p>
                  </div>
                </div>
              )}
              {!loading && !metrics && (
                <p className="text-sm text-muted-foreground">No metrics available yet.</p>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
