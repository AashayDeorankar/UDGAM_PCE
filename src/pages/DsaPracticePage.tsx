import { useParams, Link } from "react-router-dom";
import { useLayoutEffect, Suspense, lazy } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ArrowLeft } from "lucide-react";
import { INTERVIEW_COMPANIES } from "@/data/companies";
import { getCompanyDsaQuestions } from "@/data/companyDsaQuestions";
import { getQuestionDescription } from "@/data/dsaQuestionDescriptions";
import { cn } from "@/lib/utils";

const DsaCodeEditor = lazy(() =>
  import("@/components/DsaCodeEditor").then((m) => ({ default: m.DsaCodeEditor })),
);

function scrollToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export default function DsaPracticePage() {
  const { company, questionIndex } = useParams<{ company: string; questionIndex: string }>();

  useLayoutEffect(() => {
    scrollToTop();
  }, [company, questionIndex]);

  const companyName = INTERVIEW_COMPANIES.find((c) => c.id === company)?.name ?? company;
  const dsaSet = getCompanyDsaQuestions(company);
  const questions = [...dsaSet.easy, ...dsaSet.medium, ...dsaSet.hard];
  const difficulties: ("easy" | "medium" | "hard")[] = [
    ...dsaSet.easy.map(() => "easy" as const),
    ...dsaSet.medium.map(() => "medium" as const),
    ...dsaSet.hard.map(() => "hard" as const),
  ];

  const index = Math.max(0, parseInt(questionIndex ?? "0", 10));
  const safeIndex = Math.min(index, questions.length - 1);
  const question = questions[safeIndex] ?? "";
  const difficulty = difficulties[safeIndex];
  const description = getQuestionDescription(question);

  const difficultyLabel =
    difficulty === "easy" ? "Easy" : difficulty === "medium" ? "Medium" : "Hard";
  const difficultyClass =
    difficulty === "easy"
      ? "bg-green-500/15 text-green-700 dark:text-green-400"
      : difficulty === "medium"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
        : "bg-red-500/15 text-red-700 dark:text-red-400";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-16 md:pt-24 md:pb-20 bg-secondary/30 relative overflow-hidden min-h-[calc(100vh-8rem)]">
        <div className="absolute inset-0 bg-dots opacity-40" />
        <div className="container relative h-full">
          <Link
            to={`/interview-prep/${company}/dsa`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {companyName} DSA Questions
          </Link>

          <div className="grid grid-cols-1 grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] gap-6 lg:gap-8 min-h-[calc(100vh-14rem)]">
            {/* Left: Question + static description */}
            <section className="flex flex-col min-h-0">
              <div className="rounded-xl border-2 border-border bg-card p-5 md:p-6 shadow-sm flex flex-col gap-4">
                <div>
                  <span
                    className={cn(
                      "inline-block text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide mb-3",
                      difficultyClass,
                    )}
                  >
                    {difficultyLabel}
                  </span>
                  <h1 className="text-xl md:text-2xl font-bold text-foreground leading-snug">
                    {question}
                  </h1>
                </div>

                <div className="border-t border-border pt-4 space-y-4">
                  {description ? (
                    <>
                      <div>
                        <h2 className="text-sm font-semibold text-foreground mb-1">Problem</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {description.problem}
                        </p>
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-foreground mb-1">Constraints</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {description.constraints}
                        </p>
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-foreground mb-1">Examples</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {description.examples}
                        </p>
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-foreground mb-1">Approach</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {description.approach}
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Code your solution in the editor on the right. Use the problem title as reference.
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Right: Code editor — fill available height */}
            <section className="flex flex-col flex-1 min-h-0">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center flex-1 min-h-[400px] rounded-xl border-2 border-border bg-card text-muted-foreground text-sm">
                    Loading code editor…
                  </div>
                }
              >
                <DsaCodeEditor
                  question={question}
                  height="100%"
                  className="border-2 border-border shadow-sm flex-1 min-h-0 flex flex-col"
                />
              </Suspense>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
