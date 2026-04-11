import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Upload, ArrowLeft, Loader2, FileUp } from "lucide-react";
import { BRANCH_CODE_TO_FIRESTORE, UPLOAD_CATEGORIES, addResourceToFirestore } from "@/lib/resources-firestore";
import { uploadResourceFile } from "@/lib/upload-file";

const BRANCH_NAMES: Record<string, string> = {
  CSE: "Computer Science",
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

const CATEGORY_LABEL: Record<string, string> = {
  "Handwritten-Notes": "Handwritten Notes",
  "PPTs": "Presentations",
  "Previous-Year-Papers": "Previous Year Papers",
};

export default function UploadPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [branch, setBranch] = useState("");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [creditName, setCreditName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    if (!isAdmin) {
      navigate("/", { replace: true });
      return;
    }
  }, [user, authLoading, isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch || !category || !title.trim() || !file) {
      toast({
        title: "Missing fields",
        description: "Please fill branch, category, title and choose a file.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const uploadResult = await uploadResourceFile(file, branch, category);
      if ("error" in uploadResult) {
        toast({
          title: "Upload failed",
          description: uploadResult.error,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      const addResult = await addResourceToFirestore({
        branchCode: branch,
        category,
        title: title.trim(),
        subject: subject.trim() || undefined,
        creditName: creditName.trim() || undefined,
        fileURL: uploadResult.url,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || undefined,
      });
      if ("error" in addResult) {
        toast({
          title: "Save failed",
          description: addResult.error,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      toast({
        title: "Uploaded to S3",
        description: `Saved to ${BRANCH_NAMES[branch] ?? branch}. It will show under "${CATEGORY_LABEL[category] ?? category}" on that branch page.`,
      });
      setTitle("");
      setSubject("");
      setCreditName("");
      setFile(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16 md:pt-24 md:pb-20">
        <div className="container max-w-xl">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <div className="rounded-xl border-2 border-border bg-card p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Upload className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">Upload resource</h1>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Add notes, PPTs or previous year papers to a branch. Credit & subject help students find them.
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="branch">Branch</Label>
                <Select value={branch} onValueChange={setBranch} required>
                  <SelectTrigger id="branch" className="mt-1.5">
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
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger id="category" className="mt-1.5">
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
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. DSA Unit 1 Notes"
                  className="mt-1.5"
                  required
                />
              </div>
              <div>
                <Label htmlFor="subject">Subject (optional)</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Data Structures"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="credit">Credit / Source (optional)</Label>
                <Input
                  id="credit"
                  value={creditName}
                  onChange={(e) => setCreditName(e.target.value)}
                  placeholder="e.g. Topper name, Myself"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="file">File</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.ppt,.pptx,.doc,.docx,image/*"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="cursor-pointer"
                  />
                  {file && (
                    <span className="text-xs text-muted-foreground truncate max-w-[140px]" title={file.name}>
                      {file.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, PPT, Word or images. Will be stored and linked in the branch.
                </p>
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full btn-punch"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <FileUp className="h-4 w-4" />
                    Upload resource
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
