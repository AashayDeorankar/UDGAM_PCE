import { useState, useLayoutEffect, useEffect, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Calendar, Briefcase, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookSessionModal } from "@/components/BookSessionModal";
import { mentors } from "@/data/mentors";
import type { Mentor } from "@/data/mentors";
import { useAuth } from "@/contexts/AuthContext";
import { getMentorImageUrl } from "@/lib/mentor-image";
import { getApiBase } from "@/lib/api-base";
import { getFirestoreDb } from "@/integrations/firebase/config";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import {
  type MembershipTier,
  canBookMentor,
  getMentorPriceLabel,
  normalizeMembershipTier,
} from "@/lib/membership";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function MentorCard({
  mentor,
  index,
  isRecommended,
  reason,
  userTier,
  alumniSessionsUsed,
}: {
  mentor: Mentor;
  index: number;
  isRecommended?: boolean;
  reason?: string;
  userTier: MembershipTier;
  alumniSessionsUsed: number;
}) {
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const entitlement = canBookMentor(mentor.category, userTier, alumniSessionsUsed);
  const isBookBlocked = !entitlement.allowed;
  const isIndustryPaidForFree = mentor.category === "industry" && userTier === "free";
  const priceLabel = getMentorPriceLabel(mentor.category, userTier);

  return (
    <div
      className={`paper-card h-full flex flex-col transition-all duration-300 ${index === 0 ? "tape" : ""}`}
      style={{ transform: `rotate(${index % 2 === 0 ? -0.5 : 0.5}deg)` }}
    >
      <div className="flex justify-between items-start mb-4">
        {mentor.available ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            Available
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted text-muted-foreground text-xs font-semibold rounded-full">
            <Clock className="w-3 h-3" />
            Busy
          </span>
        )}
        {isRecommended && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-700 text-xs font-semibold rounded-full">
            AI Match
          </span>
        )}
        <span className="text-lg font-bold text-primary">{priceLabel}</span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        {imgError ? (
          <div
            className="w-20 h-20 rounded-full border-2 border-foreground shrink-0 bg-primary/20 flex items-center justify-center text-lg font-bold text-primary"
            aria-label={mentor.name}
          >
            {getInitials(mentor.name)}
          </div>
        ) : (
          <img
            src={getMentorImageUrl(mentor.image)}
            alt={mentor.name}
            className="w-20 h-20 rounded-full object-cover border-2 border-foreground shrink-0"
            onError={() => setImgError(true)}
          />
        )}
        <div>
          <h3 className="font-bold text-base leading-tight">{mentor.name}</h3>
          <p className="text-xs text-muted-foreground">{mentor.role}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Briefcase className="w-4 h-4" />
          <span className="font-medium">{mentor.experience} exp.</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4 flex-grow min-h-[4.25rem]">
        {mentor.expertise.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center justify-center px-2 py-0.5 bg-muted text-xs font-medium rounded-full whitespace-nowrap"
          >
            {skill}
          </span>
        ))}
      </div>

      {isRecommended && reason && (
        <p className="text-xs text-muted-foreground mb-3">
          {reason}
        </p>
      )}

      <Button
        variant={mentor.available ? "default" : "outline"}
        className="w-full mt-auto"
        disabled={!mentor.available || isBookBlocked}
        onClick={() => mentor.available && !isBookBlocked && setBookModalOpen(true)}
      >
        {!mentor.available ? (
          "Join Waitlist"
        ) : isBookBlocked ? (
          "Upgrade to Book"
        ) : isIndustryPaidForFree ? (
          <>
            <Calendar className="w-4 h-4" />
            Book Paid Session
          </>
        ) : (
          <>
            <Calendar className="w-4 h-4" />
            Book Session
          </>
        )}
      </Button>
      {isBookBlocked && (
        <p className="text-xs text-muted-foreground mt-2">{entitlement.reason}</p>
      )}
      <BookSessionModal
        open={bookModalOpen}
        onOpenChange={setBookModalOpen}
        mentorName={mentor.name}
        mentorCategory={mentor.category}
        mentorEmail={mentor.email}
        mentorWhatsapp={mentor.whatsapp}
      />
    </div>
  );
}

function scrollToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

type AlumniUserDoc = {
  email?: string;
  name?: string;
  domain?: string;
  companyName?: string;
  position?: string;
  profileImageUrl?: string;
  role?: "student" | "alumni";
};

function mapAlumniUserToMentor(data: AlumniUserDoc): Mentor {
  const email = String(data.email || "");
  const nameFromEmail = email ? email.split("@")[0] : "Alumni";
  const cleanName = String(data.name || "").trim() || nameFromEmail;
  const company = String(data.companyName || "").trim();
  const position = String(data.position || "").trim();
  const domain = String(data.domain || "").trim();
  const expertise = domain
    ? domain
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 6)
    : ["Career Guidance", "Interview Prep"];

  return {
    name: cleanName,
    role: position ? `${position}${company ? ` @ ${company}` : ""}` : company ? `Alumni Mentor @ ${company}` : "Alumni Mentor",
    category: "alumni",
    expertise: expertise.length > 0 ? expertise : ["Career Guidance", "Interview Prep"],
    experience: "1+ year",
    image: String(data.profileImageUrl || "/placeholder.svg"),
    available: true,
    price: "Free",
    email,
  };
}

export default function Mentors() {
  const { user } = useAuth();
  const db = getFirestoreDb();
  const [skills, setSkills] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [weakAreas, setWeakAreas] = useState("");
  const [matchLoading, setMatchLoading] = useState(false);
  const [recommendedNames, setRecommendedNames] = useState<string[]>([]);
  const [recommendationReasons, setRecommendationReasons] = useState<Record<string, string>>({});
  const [userAlumniMentors, setUserAlumniMentors] = useState<Mentor[]>([]);
  const [userTier, setUserTier] = useState<MembershipTier>("free");
  const [alumniSessionsUsed, setAlumniSessionsUsed] = useState(0);

  useLayoutEffect(() => {
    scrollToTop();
    const t1 = setTimeout(scrollToTop, 0);
    const t2 = setTimeout(scrollToTop, 50);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(scrollToTop, 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "alumni"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((docSnap) => mapAlumniUserToMentor(docSnap.data() as AlumniUserDoc));
        setUserAlumniMentors(next);
      },
      () => setUserAlumniMentors([]),
    );
    return () => unsub();
  }, [db]);

  useEffect(() => {
    if (!user) {
      setUserTier("free");
      setAlumniSessionsUsed(0);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (!snap.exists()) {
          setUserTier("free");
          setAlumniSessionsUsed(0);
          return;
        }
        const data = snap.data() as { membershipTier?: string; alumniSessionsUsed?: number };
        setUserTier(normalizeMembershipTier(data.membershipTier));
        setAlumniSessionsUsed(typeof data.alumniSessionsUsed === "number" ? data.alumniSessionsUsed : 0);
      },
      () => {
        setUserTier("free");
        setAlumniSessionsUsed(0);
      },
    );
    return () => unsub();
  }, [db, user]);

  const { alumniMentors, industryMentors } = useMemo(() => {
    const alumniList = mentors.filter((m) => m.category === "alumni");
    const industryList = mentors.filter((m) => m.category !== "alumni");
    return { alumniMentors: alumniList, industryMentors: industryList };
  }, []);

  const combinedAlumniMentors = useMemo(() => {
    const byKey = new Map<string, Mentor>();
    [...userAlumniMentors, ...alumniMentors].forEach((mentor) => {
      const key = (mentor.email || mentor.name).trim().toLowerCase();
      if (!byKey.has(key)) byKey.set(key, mentor);
    });
    return Array.from(byKey.values());
  }, [userAlumniMentors, alumniMentors]);

  const rankedMentors = useMemo(() => {
    if (recommendedNames.length === 0) return industryMentors;
    const order = new Map(recommendedNames.map((name, index) => [name, index]));
    return [...industryMentors].sort((a, b) => {
      const aRank = order.has(a.name) ? order.get(a.name) : Number.MAX_SAFE_INTEGER;
      const bRank = order.has(b.name) ? order.get(b.name) : Number.MAX_SAFE_INTEGER;
      if (aRank !== bRank) return aRank - bRank;
      return 0;
    });
  }, [recommendedNames, industryMentors]);

  const runMatchmaking = async () => {
    if (matchLoading) return;
    setMatchLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/matchmaking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skills: skills.split(","),
          targetRole,
          weakAreas: weakAreas.split(","),
          mentors: mentors.map((m) => ({
            name: m.name,
            role: m.role,
            expertise: m.expertise,
            experience: m.experience,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      const ranked = Array.isArray(data.ranked) ? data.ranked : [];
      const top = Array.isArray(data.top) ? data.top : ranked.map((r) => r.name).slice(0, 3);
      const reasons = ranked.reduce((acc, item) => {
        if (item?.name && item?.reason) acc[item.name] = item.reason;
        return acc;
      }, {} as Record<string, string>);
      setRecommendedNames(top);
      setRecommendationReasons(reasons);
    } catch {
      setRecommendedNames([]);
      setRecommendationReasons({});
    } finally {
      setMatchLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-16 md:pt-24 md:pb-20 bg-secondary/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-40" />

        <div className="container relative">
          <div className="text-center mb-12">
            <span className="sticker-green-soft mb-4 inline-block">Mentors from Top Product Companies</span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Expert mentors from leading <span className="underline-sketch">product companies.</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Book 1:1 sessions with engineers from Google, Microsoft, Amazon and more.
              Career guidance, interview prep, and placement advice—direct and actionable.
            </p>
          </div>

          <div className="max-w-4xl mx-auto mb-10 rounded-xl border-2 border-border bg-card p-4 md:p-5">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Your skills (comma-separated)</label>
                <Input
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="DSA, React, SQL"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Target role</label>
                <Input
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="Backend Developer"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Weak areas (comma-separated)</label>
                <Input
                  value={weakAreas}
                  onChange={(e) => setWeakAreas(e.target.value)}
                  placeholder="System design, Communication"
                />
              </div>
              <Button className="gap-2" onClick={runMatchmaking} disabled={matchLoading}>
                {matchLoading ? "Matching..." : "Find Best Mentor (AI)"}
              </Button>
            </div>
          </div>

          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Alumni Mentors</h2>
              <p className="text-xs text-muted-foreground">All platform alumni are listed here.</p>
            </div>
            {combinedAlumniMentors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No alumni mentors available yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {combinedAlumniMentors.map((mentor, index) => (
                  <MentorCard
                    key={`alumni-${mentor.name}-${index}`}
                    mentor={mentor}
                    index={index}
                    userTier={userTier}
                    alumniSessionsUsed={alumniSessionsUsed}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Industry Level Mentors</h2>
              <p className="text-xs text-muted-foreground">AI matching picks the best fit.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {rankedMentors.map((mentor, index) => (
                <MentorCard
                  key={`${mentor.name}-${index}`}
                  mentor={mentor}
                  index={index}
                  isRecommended={recommendedNames.includes(mentor.name)}
                  reason={recommendationReasons[mentor.name]}
                  userTier={userTier}
                  alumniSessionsUsed={alumniSessionsUsed}
                />
              ))}
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
