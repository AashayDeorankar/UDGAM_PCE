import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import {
  FileText,
  Presentation,
  FileClock,
  Download,
  ArrowLeft,
  Loader2,
  User,
  Eye,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { LoginRequiredModal } from "@/components/LoginRequiredModal";
import type { BranchMaterialsData, MaterialItem } from "@/types/branch-materials";
import {
  BRANCH_CODE_TO_FIRESTORE,
  UPLOAD_CATEGORIES,
  addResourceToFirestore,
  loadBranchResourcesFromFirestore,
} from "@/lib/resources-firestore";
import { getApiBase } from "@/lib/api-base";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  where,
} from "firebase/firestore";
import { getFirestoreDb } from "@/integrations/firebase/config";
import { uploadResourceFile } from "@/lib/upload-file";

const BRANCH_NAMES: Record<string, string> = {
  CSE: "Computer Science Engineering",
  "AI/ML": "AI & Machine Learning",
  DS: "Data Science",
  CS: "Cyber Security",
  ECE: "Electronics & Comm.",
  EE: "Electrical Engg.",
  ME: "Mechanical Engg.",
  CE: "Civil Engineering",
};

const BRANCH_OPTIONS = Object.entries(BRANCH_CODE_TO_FIRESTORE).map(([code]) => ({
  value: code,
  label: `${code} – ${BRANCH_NAMES[code] ?? code}`,
}));

const TAB_TO_CATEGORY: Record<TabKey, string> = {
  notes: "Handwritten-Notes",
  ppt: "PPTs",
  papers: "Previous-Year-Papers",
};

const CATEGORY_LABEL = UPLOAD_CATEGORIES.reduce<Record<string, string>>((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

type TabKey = "notes" | "ppt" | "papers";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "notes", label: "Handwritten Notes", icon: FileText },
  { key: "ppt", label: "Presentations", icon: Presentation },
  { key: "papers", label: "Previous Papers", icon: FileClock },
];

type ResourceRequest = {
  id: string;
  requesterEmail?: string;
  requesterName?: string;
  branch?: string;
  category?: string;
  title?: string;
  subject?: string;
  notes?: string;
  status?: string;
  fulfilledUrl?: string;
  fulfilledByEmail?: string;
  fulfilledByName?: string;
  createdAt?: { toDate?: () => Date } | Date | null;
  fulfilledAt?: { toDate?: () => Date } | Date | null;
};

/** Returns true if URL looks like S3 (private, would get Access Denied without presign) */
function isLikelyS3(url: string): boolean {
  return /amazonaws\.com/i.test(url) || /\.s3\./i.test(url);
}

/** Sirf notes dabbe – same shape/size, title, subject, date, credit, Download + View */
function MaterialCard({
  item,
  icon: Icon,
}: {
  item: MaterialItem;
  icon: React.ElementType;
}) {
  const [loading, setLoading] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const { toast } = useToast();

  const openViewPage = async () => {
    if (viewLoading) return;
    setViewLoading(true);
    try {
      if (item.url.startsWith("/")) {
        const token = `n${Date.now()}`;
        localStorage.setItem(
          `noteView_${token}`,
          JSON.stringify({ url: item.url, title: item.name, subject: item.subject || "" })
        );
        window.open(`/view?pending=${token}`, "_blank", "noopener,noreferrer");
        setViewLoading(false);
        return;
      }
      const res = await fetch(`${getApiBase()}/api/presign?url=${encodeURIComponent(item.url)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        if (isLikelyS3(item.url)) {
          toast({
            title: "Cannot open note",
            description: data.error || "API not running. Try npm run dev.",
            variant: "destructive",
          });
        } else {
          toast({ title: "Error", description: data.error || "Could not open", variant: "destructive" });
        }
        return;
      }
      const token = `n${Date.now()}`;
      localStorage.setItem(
        `noteView_${token}`,
        JSON.stringify({ url: data.url, title: item.name, subject: item.subject || "" })
      );
      window.open(`/view?pending=${token}`, "_blank", "noopener,noreferrer");
    } catch {
      toast({
        title: "Cannot open note",
        description: "Network error. Try again.",
        variant: "destructive",
      });
    } finally {
      setViewLoading(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (item.url.startsWith("/")) {
        const a = document.createElement("a");
        a.href = item.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.download = item.name + ".pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setLoading(false);
        return;
      }
      const res = await fetch(`${getApiBase()}/api/presign?url=${encodeURIComponent(item.url)}`);
      const data = await res.json().catch(() => ({}));
      const targetUrl = res.ok && data.url ? data.url : res.ok ? item.url : null;
      if (targetUrl) {
        const a = document.createElement("a");
        a.href = targetUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else if (!res.ok && isLikelyS3(item.url)) {
        const is404 = res.status === 404;
        toast({
          title: "Cannot open file",
          description: is404
            ? "API server not running. In terminal run: cd techprep && npm run dev:all"
            : "Run with npm run dev:all and set AWS keys in .env",
          variant: "destructive",
        });
      } else if (!res.ok) {
        toast({ title: "Error", description: data.error || "Could not open file", variant: "destructive" });
      }
    } catch {
      if (isLikelyS3(item.url)) {
        toast({
          title: "Cannot open file",
          description: "API not running. Terminal: cd techprep && npm run dev:all",
          variant: "destructive",
        });
      } else {
        const a = document.createElement("a");
        a.href = item.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="p-6 rounded-xl border border-border bg-card flex flex-col min-h-[240px] shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2">
            {item.name}
          </h3>
          {item.subject && (
            <p className="text-primary font-medium text-sm mb-1">{item.subject}</p>
          )}
          {item.date && (
            <p className="text-sm text-muted-foreground">{item.date}</p>
          )}
        </div>
        <Icon className="h-7 w-7 text-primary shrink-0 ml-2" />
      </div>
      {item.credit && (
        <p className="text-sm text-muted-foreground italic flex items-center gap-2 mb-4">
          <User className="h-4 w-4 shrink-0" />
          Credit: {item.credit}
        </p>
      )}
      <div className="flex gap-2 mt-auto pt-4">
        <Button
          size="sm"
          className="flex-1"
          onClick={handleDownload}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-1.5" />
          )}
          Download
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="shrink-0 h-9 w-9"
          onClick={openViewPage}
          disabled={viewLoading}
          title={viewLoading ? "Opening…" : "View with AI assistant"}
        >
          {viewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}


const EMPTY_MATERIALS: BranchMaterialsData = {
  handwrittenNotes: [],
  ppt: [],
  prevYearPapers: [],
};

export default function BranchMaterials() {
  const { user } = useAuth();
  const db = getFirestoreDb();
  const { code } = useParams<{ code: string }>();
  const [data, setData] = useState<BranchMaterialsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("notes");
  const [search, setSearch] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestSubject, setRequestSubject] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [fulfillOpen, setFulfillOpen] = useState(false);
  const [fulfillTarget, setFulfillTarget] = useState<ResourceRequest | null>(null);
  const [fulfillBranch, setFulfillBranch] = useState("");
  const [fulfillCategory, setFulfillCategory] = useState("");
  const [fulfillTitle, setFulfillTitle] = useState("");
  const [fulfillSubject, setFulfillSubject] = useState("");
  const [fulfillCredit, setFulfillCredit] = useState("");
  const [fulfillNotes, setFulfillNotes] = useState("");
  const [fulfillFile, setFulfillFile] = useState<File | null>(null);
  const [fulfillSubmitting, setFulfillSubmitting] = useState(false);
  const [userName, setUserName] = useState("");
  const { toast } = useToast();

  const branchCode = code ? decodeURIComponent(code) : "";
  const branchName = BRANCH_NAMES[branchCode] || branchCode;

  useEffect(() => {
    if (!branchCode) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadBranchResourcesFromFirestore(branchCode)
      .then((firestoreData) => {
        if (cancelled) return;
        if (firestoreData) {
          setData(firestoreData);
        } else {
          setData(EMPTY_MATERIALS);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Could not load materials");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchCode]);

  const loadRequests = async () => {
    if (!branchCode) return;
    setRequestsLoading(true);
    try {
      const requestsRef = collection(db, "resourceRequests");
      const q = query(requestsRef, where("branch", "==", branchCode));
      const snap = await getDocs(q);
      const getTime = (val?: { toDate?: () => Date } | Date | null) => {
        if (!val) return 0;
        if (typeof (val as { toDate?: () => Date }).toDate === "function") {
          return (val as { toDate: () => Date }).toDate().getTime();
        }
        if (val instanceof Date) return val.getTime();
        return 0;
      };
      const next = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ResourceRequest, "id">),
      }));
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const batch = writeBatch(db);
      let hasBatch = false;
      next.forEach((req) => {
        const fulfilledAt = getTime(req.fulfilledAt);
        if (req.status === "fulfilled" && fulfilledAt && fulfilledAt < weekAgo) {
          batch.set(doc(db, "resourceRequests", req.id), { status: "closed" }, { merge: true });
          req.status = "closed";
          hasBatch = true;
        }
      });
      if (hasBatch) {
        await batch.commit();
      }
      next.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
      setRequests(next);
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, [branchCode]);

  useEffect(() => {
    const loadUserName = async () => {
      if (!user) {
        setUserName("");
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) {
          setUserName((user.displayName || "").trim());
          return;
        }
        const data = snap.data() as { name?: string };
        setUserName((data.name || user.displayName || "").trim());
      } catch {
        setUserName((user.displayName || "").trim());
      }
    };
    void loadUserName();
  }, [db, user]);

  const currentItems = useMemo(() => {
    const materials = data ?? EMPTY_MATERIALS;
    if (activeTab === "notes") return materials.handwrittenNotes;
    if (activeTab === "ppt") return materials.ppt;
    return materials.prevYearPapers;
  }, [data, activeTab]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return currentItems;
    const q = search.trim().toLowerCase();
    return currentItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.subject?.toLowerCase().includes(q) ?? false)
    );
  }, [currentItems, search]);

  const tabIcon = TABS.find((t) => t.key === activeTab)?.icon ?? FileText;
  const activeTabLabel = TABS.find((t) => t.key === activeTab)?.label ?? "Resource";
  const activeCategoryValue = TAB_TO_CATEGORY[activeTab];

  const openRequest = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setRequestOpen(true);
  };

  const submitRequest = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (!requestTitle.trim()) {
      toast({
        title: "Missing title",
        description: "Please enter the resource title you need.",
        variant: "destructive",
      });
      return;
    }
    setRequestSubmitting(true);
    setRequestOpen(false);
    try {
      await addDoc(collection(db, "resourceRequests"), {
        requesterId: user.uid,
        requesterEmail: user.email || "",
        requesterName: userName || user.displayName || "",
        branch: branchCode,
        category: activeCategoryValue,
        title: requestTitle.trim(),
        subject: requestSubject.trim() || null,
        notes: requestNotes.trim() || null,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      toast({
        title: "Request submitted",
        description: "We have recorded your resource request.",
      });
      setRequestTitle("");
      setRequestSubject("");
      setRequestNotes("");
      void loadRequests();
    } catch (err) {
      toast({
        title: "Request failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      setRequestOpen(true);
    } finally {
      setRequestSubmitting(false);
    }
  };

  const openFulfill = (req: ResourceRequest) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setFulfillTarget(req);
    setFulfillBranch(branchCode);
    setFulfillCategory(
      UPLOAD_CATEGORIES.some((c) => c.value === req.category)
        ? String(req.category)
        : activeCategoryValue,
    );
    setFulfillTitle(req.title || "");
    setFulfillSubject(req.subject || "");
    setFulfillCredit("");
    setFulfillNotes("");
    setFulfillFile(null);
    setFulfillOpen(true);
  };

  const submitFulfill = async () => {
    if (!user || !fulfillTarget) return;
    if (!fulfillBranch || !fulfillCategory || !fulfillTitle.trim() || !fulfillFile) {
      toast({
        title: "Missing fields",
        description: "Please fill branch, category, title and choose a file.",
        variant: "destructive",
      });
      return;
    }
    setFulfillSubmitting(true);
    try {
      const uploadResult = await uploadResourceFile(fulfillFile, fulfillBranch, fulfillCategory);
      if ("error" in uploadResult) {
        toast({
          title: "Upload failed",
          description: uploadResult.error,
          variant: "destructive",
        });
        setFulfillSubmitting(false);
        return;
      }

      const addResult = await addResourceToFirestore({
        branchCode: fulfillBranch,
        category: fulfillCategory,
        title: fulfillTitle.trim(),
        subject: fulfillSubject.trim() || undefined,
        creditName: fulfillCredit.trim() || undefined,
        fileURL: uploadResult.url,
        fileName: fulfillFile.name,
        fileSize: fulfillFile.size,
        fileType: fulfillFile.type || undefined,
      });

      if ("error" in addResult) {
        toast({
          title: "Save failed",
          description: addResult.error,
          variant: "destructive",
        });
        setFulfillSubmitting(false);
        return;
      }

      await setDoc(
        doc(db, "resourceRequests", fulfillTarget.id),
        {
          status: "fulfilled",
          fulfilledUrl: uploadResult.url,
          fulfilledResourceId: addResult.id,
          fulfilledNotes: fulfillNotes.trim() || null,
          fulfilledById: user.uid,
          fulfilledByEmail: user.email || "",
          fulfilledByName: userName || user.displayName || "",
          fulfilledAt: serverTimestamp(),
        },
        { merge: true },
      );
      const updatedMaterials = await loadBranchResourcesFromFirestore(fulfillBranch);
      if (updatedMaterials) {
        setData(updatedMaterials);
      }
      toast({ title: "Request fulfilled", description: "Thanks for contributing!" });
      setFulfillOpen(false);
      setFulfillTarget(null);
      void loadRequests();
    } catch (err) {
      toast({
        title: "Could not fulfill",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setFulfillSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh] pt-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !branchCode) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 gap-4 pt-16">
          <p className="text-muted-foreground">{error || "Branch not found."}</p>
          <Link to="/#branches">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Branches
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const materials = data ?? EMPTY_MATERIALS;
  const hasAny =
    materials.handwrittenNotes.length > 0 ||
    materials.ppt.length > 0 ||
    materials.prevYearPapers.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Simple header – app jaisa */}
      <div className="border-b border-border bg-card/50 pt-16">
        <div className="container py-6">
          <Link
            to="/#branches"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            All branches
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold">{branchName}</h1>
          <p className="text-muted-foreground">
            Handwritten notes, PPTs & previous year papers
          </p>
        </div>
      </div>

      <div className="container py-8">
        {!hasAny ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <p className="text-muted-foreground mb-4">
              Materials for this branch are being added. Check back soon.
            </p>
            <Link to="/#branches">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Branches
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Tabs + Search – simple app style */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
              <Button
                variant="outline"
                className="btn-punch"
                onClick={openRequest}
              >
                Request {activeTabLabel}
              </Button>
            </div>
            <div className="relative max-w-md mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by subject or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Sirf notes/cards dabbe mein – uniform card grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.length === 0 ? (
                <p className="col-span-full text-center text-muted-foreground py-8">
                  {search.trim()
                    ? "No materials match your search."
                    : `No ${TABS.find((t) => t.key === activeTab)?.label ?? "items"} yet.`}
                </p>
              ) : (
                filteredItems.map((item, i) => (
                  <MaterialCard
                    key={`${item.url}-${i}`}
                    item={item}
                    icon={tabIcon}
                  />
                ))
              )}
            </div>

            <div className="mt-10 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Open requests</h2>
                  <p className="text-sm text-muted-foreground">Anyone can fulfill these by sharing a resource link.</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadRequests} disabled={requestsLoading}>
                  {requestsLoading ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
              {requests.filter((r) => r.status !== "fulfilled" && r.status !== "closed").length === 0 ? (
                <p className="text-sm text-muted-foreground">No open requests for this branch.</p>
              ) : (
                <div className="space-y-3">
                  {requests
                    .filter((r) => r.status !== "fulfilled" && r.status !== "closed")
                    .map((req) => (
                      <div key={req.id} className="border border-border rounded-lg p-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{req.title || "Untitled request"}</p>
                            <p className="text-xs text-muted-foreground">
                              {CATEGORY_LABEL[req.category || ""] || req.category || "Resource"}
                              {req.subject ? ` · ${req.subject}` : ""}
                            </p>
                            {req.notes && <p className="text-xs text-muted-foreground mt-1">{req.notes}</p>}
                            <p className="text-xs text-muted-foreground mt-1">
                              Requested by {req.requesterName || "User"}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => openFulfill(req)}>
                            Fulfill request
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request a resource</DialogTitle>
            <DialogDescription>
              Ask for a missing file in {branchName}. We will review and upload it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Input value={activeTabLabel} readOnly className="mt-1.5" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Resource title</label>
              <Input
                value={requestTitle}
                onChange={(e) => setRequestTitle(e.target.value)}
                placeholder="e.g. DSA Unit 2 Notes"
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Subject (optional)</label>
              <Input
                value={requestSubject}
                onChange={(e) => setRequestSubject(e.target.value)}
                placeholder="e.g. Data Structures"
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
              <Textarea
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                placeholder="Any details about the resource you need"
                className="mt-1.5"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
              <Button onClick={submitRequest} disabled={requestSubmitting}>
                {requestSubmitting ? "Submitting..." : "Submit request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={fulfillOpen} onOpenChange={setFulfillOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Fulfill request</DialogTitle>
            <DialogDescription>
              Upload the resource so others can access it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Branch</label>
              <Select value={fulfillBranch} onValueChange={setFulfillBranch}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {BRANCH_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select value={fulfillCategory} onValueChange={setFulfillCategory}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Notes / PPT / Papers" />
                </SelectTrigger>
                <SelectContent>
                  {UPLOAD_CATEGORIES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <Input
                value={fulfillTitle}
                onChange={(e) => setFulfillTitle(e.target.value)}
                placeholder="e.g. DSA Unit 2 Notes"
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Subject (optional)</label>
              <Input
                value={fulfillSubject}
                onChange={(e) => setFulfillSubject(e.target.value)}
                placeholder="e.g. Data Structures"
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Credit / Source (optional)</label>
              <Input
                value={fulfillCredit}
                onChange={(e) => setFulfillCredit(e.target.value)}
                placeholder="e.g. Shared by Rahul"
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">File</label>
              <div className="mt-1.5 flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.ppt,.pptx,.doc,.docx,image/*"
                  onChange={(e) => setFulfillFile(e.target.files?.[0] ?? null)}
                  className="cursor-pointer"
                />
                {fulfillFile && (
                  <span className="text-xs text-muted-foreground truncate max-w-[140px]" title={fulfillFile.name}>
                    {fulfillFile.name}
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
              <Textarea
                value={fulfillNotes}
                onChange={(e) => setFulfillNotes(e.target.value)}
                placeholder="Any context about the file"
                className="mt-1.5"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFulfillOpen(false)}>Cancel</Button>
              <Button onClick={submitFulfill} disabled={fulfillSubmitting}>
                {fulfillSubmitting ? "Submitting..." : "Mark as fulfilled"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <LoginRequiredModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        redirect={`/branches/${encodeURIComponent(branchCode)}`}
      />
    </div>
  );
}
