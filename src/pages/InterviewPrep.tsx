import { useState, useLayoutEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Briefcase, MessageCircle, Code, Database, ArrowRight, ArrowLeft, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { INTERVIEW_COMPANIES, type CompanyId } from "@/data/companies";
import { cn } from "@/lib/utils";
import { getApiBase } from "@/lib/api-base";

const QUESTION_TYPES = [
  {
    id: "hr" as const,
    title: "Company-wise HR Questions",
    description: "Behavioral and HR round questions for this company.",
    icon: MessageCircle,
    slug: "hr",
  },
  {
    id: "dsa" as const,
    title: "Company-wise DSA Questions",
    description: "Data Structures & Algorithms questions asked in interviews.",
    icon: Code,
    slug: "dsa",
  },
  {
    id: "sql" as const,
    title: "Company-wise SQL Questions",
    description: "SQL and database questions for this company.",
    icon: Database,
    slug: "sql",
  },
] as const;

function scrollToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

const VALID_IDS = new Set(INTERVIEW_COMPANIES.map((c) => c.id));

export default function InterviewPrep() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const companyFromUrl = searchParams.get("company") || "";
  const [company, setCompany] = useState<CompanyId | "">(
    (VALID_IDS.has(companyFromUrl) ? companyFromUrl : "") as CompanyId | ""
  );
  const [companyOpen, setCompanyOpen] = useState(false);
  const [roleInput, setRoleInput] = useState("");
  const [topicsInput, setTopicsInput] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  useLayoutEffect(() => {
    scrollToTop();
  }, []);

  useLayoutEffect(() => {
    if (companyFromUrl && VALID_IDS.has(companyFromUrl) && company !== companyFromUrl) {
      setCompany(companyFromUrl as CompanyId);
    }
  }, [companyFromUrl]);


  const generateQuestions = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await fetch(`${getApiBase()}/api/interview/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: roleInput,
          company,
          topics: topicsInput,
          count: 8,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setGeneratedQuestions(Array.isArray(data.questions) ? data.questions : []);
    } catch {
      setGeneratedQuestions([]);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-16 md:pt-24 md:pb-20 bg-secondary/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-40" />
        <div className="container relative">
          <Button
            variant="ghost"
            size="sm"
            className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <motion.span
              className="sticker-green-soft mb-4 inline-block"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            >
              Interview Prep
            </motion.span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              <span className="underline-sketch">Company-wise</span> Questions
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Select a company to see HR, DSA, and SQL questions asked in their interviews.
            </p>
          </motion.div>

          <motion.div
            className="max-w-xl mx-auto mb-10"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <label className="block text-sm font-medium mb-2">Select Company</label>
            <p className="text-xs text-muted-foreground mb-2">
              Search by name or scroll to see all {INTERVIEW_COMPANIES.length} companies
            </p>
            <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={companyOpen}
                  className={cn(
                    "w-full h-12 justify-between border-2 border-foreground rounded-xl bg-background hover:border-primary/50 font-normal",
                    !company && "text-muted-foreground"
                  )}
                >
                  {company
                    ? INTERVIEW_COMPANIES.find((c) => c.id === company)?.name
                    : "Search or choose company..."}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search company..." className="h-11" />
                  <CommandList>
                    <CommandEmpty>No company found.</CommandEmpty>
                    <CommandGroup>
                      {INTERVIEW_COMPANIES.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.name}
                          onSelect={() => {
                            setCompany(c.id as CompanyId);
                            setCompanyOpen(false);
                          }}
                        >
                          {c.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </motion.div>

          <div className="max-w-4xl mx-auto mb-10 rounded-xl border-2 border-border bg-card p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">AI Question Generator</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Target role</label>
                <Input
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  placeholder="SDE / Data Analyst"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Topics (comma-separated)</label>
                <Input
                  value={topicsInput}
                  onChange={(e) => setTopicsInput(e.target.value)}
                  placeholder="DSA, SQL, System Design"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={generateQuestions} disabled={generating}>
                {generating ? "Generating..." : "Generate Questions"}
              </Button>
            </div>
            {generatedQuestions.length > 0 && (
              <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-semibold text-foreground mb-2">AI-generated questions</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  {generatedQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {company ? (
            <motion.div
              className="grid md:grid-cols-3 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {QUESTION_TYPES.map((type, index) => (
                <motion.div
                  key={type.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, type: "spring", stiffness: 200, damping: 20 }}
                >
                  <Link to={`/interview-prep/${company}/${type.slug}`} className="group block h-full">
                    <div
                      className="paper-card h-full p-6 border-2 border-border hover:border-primary/50 hover:shadow-lg hover:shadow-foreground/10 transition-all duration-300 flex flex-col"
                      style={{ transform: `rotate(${index % 2 === 0 ? -0.5 : 0.5}deg)` }}
                    >
                    <div className="p-3 w-fit rounded-lg bg-primary/10 border border-primary/20 mb-4">
                      <type.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                      {type.title}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4 flex-grow">
                      {type.description}
                    </p>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Open
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </Link>
                  </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-60" />
              <p className="text-muted-foreground">
                Select a company above to view HR, DSA & SQL questions.
              </p>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />

    </div>
  );
}
