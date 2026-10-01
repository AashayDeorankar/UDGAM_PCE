import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { createJob } from "@/hooks/useJobs";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Briefcase, Plus, X, Building2, MapPin, GraduationCap,
  Users, Clock, ChevronLeft, Sparkles, Star,
} from "lucide-react";

function TagInput({
  label, placeholder, tags, onChange, color = "blue",
}: {
  label: string;
  placeholder: string;
  tags: string[];
  onChange: (t: string[]) => void;
  color?: string;
}) {
  const [val, setVal] = useState("");
  const add = () => {
    const trimmed = val.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setVal("");
  };
  const remove = (tag: string) => onChange(tags.filter((t) => t !== tag));

  const colorMap: Record<string, string> = {
    blue:  "bg-blue-500/20 text-blue-300 border-blue-500/30",
    green: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  };
  const chipClass = colorMap[color] || colorMap.blue;

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          className="flex-1 rounded-xl h-10 border-2 bg-background/60 focus-visible:ring-2 focus-visible:ring-primary/20"
        />
        <Button type="button" variant="outline" onClick={add} size="sm" className="h-10 rounded-xl px-3">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag) => (
            <span key={tag} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${chipClass}`}>
              {tag}
              <button type="button" onClick={() => remove(tag)} className="hover:opacity-70 ml-1">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CreateJob() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && role && role !== "recruiter") {
      navigate("/jobs", { replace: true });
    }
  }, [role, authLoading, navigate]);

  if (!authLoading && role && role !== "recruiter") {
    return null;
  }

  const [title, setTitle]       = useState("");
  const [company, setCompany]   = useState("");
  const [description, setDesc]  = useState("");
  const [reqSkills, setReqSkills] = useState<string[]>([]);
  const [prefSkills, setPrefSkills] = useState<string[]>([]);
  const [reqExp, setReqExp]     = useState("");
  const [prefExp, setPrefExp]   = useState("");
  const [education, setEdu]     = useState("");
  const [location, setLoc]      = useState("");
  const [workMode, setWorkMode] = useState("");
  const [shortlistSize, setShortlistSize] = useState(5);
  const [deadline, setDeadline] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !company.trim() || !description.trim()) {
      toast({ title: "Missing fields", description: "Title, company, and description are required.", variant: "destructive" });
      return;
    }
    if (reqSkills.length === 0) {
      toast({ title: "Add required skills", description: "At least one required skill is needed.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { job, error } = await createJob({
      title: title.trim(),
      description: description.trim(),
      companyName: company.trim(),
      requiredSkills: reqSkills,
      preferredSkills: prefSkills,
      requiredExperience: reqExp,
      preferredExperience: prefExp,
      education: education.trim(),
      location: location.trim(),
      workMode: workMode.trim(),
      shortlistSize,
      deadline: deadline || undefined,
      createdBy: user?.uid || "demo-recruiter",
      recruiterName: user?.displayName || "Recruiter",
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error creating job", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Job published! 🎉", description: `"${job?.title}" is now live for students.` });
    navigate("/recruiter");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-20 md:pt-24 pb-16">
        <div className="container max-w-3xl mx-auto px-4">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <button onClick={() => navigate("/recruiter")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
              <ChevronLeft className="h-4 w-4" /> Back to Dashboard
            </button>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-violet-500/15 border border-violet-500/25">
                <Briefcase className="h-6 w-6 text-violet-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Create New Job</h1>
                <p className="text-muted-foreground text-sm">Define requirements and publish for candidates</p>
              </div>
            </div>
          </motion.div>

          <motion.form initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }} onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="rounded-2xl border bg-card/80 backdrop-blur p-6 space-y-4">
              <h2 className="font-semibold text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-blue-400" /> Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title *</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Software Engineer Intern" className="rounded-xl h-11 border-2" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company Name *</Label>
                  <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="ABC Technologies" className="rounded-xl h-11 border-2" required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location"><MapPin className="h-3.5 w-3.5 inline mr-1" />Location</Label>
                  <Input id="location" value={location} onChange={(e) => setLoc(e.target.value)} placeholder="Bangalore / Remote" className="rounded-xl h-11 border-2" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workMode">Work Mode</Label>
                  <select id="workMode" value={workMode} onChange={(e) => setWorkMode(e.target.value)} className="w-full h-11 rounded-xl border-2 border-input bg-background px-3 text-sm">
                    <option value="">Select</option>
                    <option value="Remote">Remote</option>
                    <option value="On-site">On-site</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Job Description *</Label>
                <Textarea id="desc" value={description} onChange={(e) => setDesc(e.target.value)} placeholder="Describe the role, responsibilities, and what you're looking for..." rows={6} className="rounded-xl border-2 resize-none" required />
              </div>
            </div>

            {/* Skills */}
            <div className="rounded-2xl border bg-card/80 backdrop-blur p-6 space-y-5">
              <h2 className="font-semibold text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-400" /> Skills Requirements</h2>
              <TagInput label="Required Skills *" placeholder="e.g. Java (press Enter)" tags={reqSkills} onChange={setReqSkills} color="blue" />
              <TagInput label="Preferred Skills" placeholder="e.g. Docker (press Enter)" tags={prefSkills} onChange={setPrefSkills} color="green" />
            </div>

            {/* Experience & Education */}
            <div className="rounded-2xl border bg-card/80 backdrop-blur p-6 space-y-4">
              <h2 className="font-semibold text-base flex items-center gap-2"><GraduationCap className="h-4 w-4 text-emerald-400" /> Experience & Education</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reqExp"><Clock className="h-3.5 w-3.5 inline mr-1" />Required Experience</Label>
                  <Input id="reqExp" value={reqExp} onChange={(e) => setReqExp(e.target.value)} placeholder="0–2 years / Fresher" className="rounded-xl h-11 border-2" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prefExp">Preferred Experience</Label>
                  <Input id="prefExp" value={prefExp} onChange={(e) => setPrefExp(e.target.value)} placeholder="1 year internship" className="rounded-xl h-11 border-2" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edu">Education Requirement</Label>
                <Input id="edu" value={education} onChange={(e) => setEdu(e.target.value)} placeholder="B.Tech / B.E. (any branch)" className="rounded-xl h-11 border-2" />
              </div>
            </div>

            {/* Shortlist & Deadline */}
            <div className="rounded-2xl border bg-card/80 backdrop-blur p-6 space-y-4">
              <h2 className="font-semibold text-base flex items-center gap-2"><Users className="h-4 w-4 text-orange-400" /> Shortlist Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shortlist">
                    <Star className="h-3.5 w-3.5 inline mr-1 text-yellow-400" />
                    Shortlist Size *
                  </Label>
                  <Input
                    id="shortlist" type="number" min={1} max={100}
                    value={shortlistSize}
                    onChange={(e) => setShortlistSize(Math.max(1, parseInt(e.target.value) || 5))}
                    className="rounded-xl h-11 border-2"
                  />
                  <p className="text-xs text-muted-foreground">AI will select the top N candidates based on evidence</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Application Deadline</Label>
                  <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="rounded-xl h-11 border-2" />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => navigate("/recruiter")} className="rounded-xl h-11 px-6">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="rounded-xl h-11 px-8 bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-lg shadow-violet-500/25">
                {loading ? (
                  <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Publishing…</span>
                ) : (
                  <span className="inline-flex items-center gap-2"><Briefcase className="h-4 w-4" /> Publish Job</span>
                )}
              </Button>
            </div>
          </motion.form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
