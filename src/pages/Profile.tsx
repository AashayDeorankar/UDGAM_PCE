import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirestoreDb } from "@/integrations/firebase/config";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export default function Profile() {
  const { user, role } = useAuth();
  const db = getFirestoreDb();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [target, setTarget] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [year, setYear] = useState("");
  const [branch, setBranch] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) return;
        const data = snap.data() as {
          name?: string;
          domain?: string;
          target?: string;
          collegeName?: string;
          year?: string;
          branch?: string;
          companyName?: string;
          position?: string;
        };
        setName(data.name || "");
        setDomain(data.domain || "");
        setTarget(data.target || "");
        setCollegeName(data.collegeName || "");
        setYear(data.year || "");
        setBranch(data.branch || "");
        setCompanyName(data.companyName || "");
        setPosition(data.position || "");
      } catch {
        // ignore
      }
    };
    loadProfile();
  }, [db, user]);

  const saveProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          name,
          email: user.email || "",
          domain,
          target,
          collegeName,
          year,
          branch,
          companyName,
          position,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16 md:pt-24 md:pb-20 bg-secondary/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-40" />
        <div className="container relative max-w-3xl">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Profile</h1>
          <p className="text-muted-foreground mb-6">
            Update your profile details. Role: {role || "unknown"}
          </p>

          <div className="rounded-xl border-2 border-border bg-card p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Full name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input value={user?.email || ""} readOnly />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Domain</label>
              <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="Backend, AI/ML, Product" />
            </div>
            {role === "student" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Target</label>
                <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="SDE-1, Data Analyst" />
              </div>
            )}
            {role === "student" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">College name</label>
                  <Input value={collegeName} onChange={(e) => setCollegeName(e.target.value)} placeholder="Your college" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Year</label>
                  <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="3rd year" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Branch</label>
                  <Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="CSE, ECE" />
                </div>
              </>
            )}
            {role === "alumni" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Company name</label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your company" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Position in company</label>
                  <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="SDE-2, PM" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">College name</label>
                  <Input value={collegeName} onChange={(e) => setCollegeName(e.target.value)} placeholder="Your college" />
                </div>
              </>
            )}
            <div className="flex justify-end">
              <Button onClick={saveProfile} disabled={loading}>
                {loading ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
