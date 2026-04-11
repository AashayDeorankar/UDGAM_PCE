import { useEffect, useState, useMemo } from "react";
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
import { useToast } from "@/hooks/use-toast";
import type { BranchMaterialsData, MaterialItem } from "@/types/branch-materials";
import { loadBranchResourcesFromFirestore } from "@/lib/resources-firestore";
import { getApiBase } from "@/lib/api-base";

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

type TabKey = "notes" | "ppt" | "papers";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "notes", label: "Handwritten Notes", icon: FileText },
  { key: "ppt", label: "Presentations", icon: Presentation },
  { key: "papers", label: "Previous Papers", icon: FileClock },
];

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
  const { code } = useParams<{ code: string }>();
  const [data, setData] = useState<BranchMaterialsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("notes");
  const [search, setSearch] = useState("");

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
          </>
        )}
      </div>
    </div>
  );
}
