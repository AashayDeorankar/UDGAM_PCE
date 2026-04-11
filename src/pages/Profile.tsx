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
        };
        setName(data.name || "");
        setDomain(data.domain || "");
        setTarget(data.target || "");
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
            <div>
              <label className="text-xs font-medium text-muted-foreground">Target</label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="SDE-1, Data Analyst" />
            </div>
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
