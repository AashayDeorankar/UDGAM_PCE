import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, Briefcase, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookSessionModal } from "@/components/BookSessionModal";
import { LoginRequiredModal } from "@/components/LoginRequiredModal";
import { useAuth } from "@/contexts/AuthContext";
import { mentors as allMentors } from "@/data/mentors";
import type { Mentor } from "@/data/mentors";
import { getMentorImageUrl } from "@/lib/mentor-image";

const mentors = allMentors.slice(0, 4);

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function MentorAvatar({ mentor }: { mentor: Mentor }) {
  const [imgError, setImgError] = useState(false);
  return (
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
  );
}

export function MentorsSection() {
  const { user } = useAuth();
  const [bookModalMentor, setBookModalMentor] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <section id="mentors" className="section-padding pt-12 md:pt-16 lg:pt-20 pb-12 md:pb-16 lg:pb-20 bg-secondary/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-dots opacity-40" />
      
      <div className="container relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="sticker-green-soft mb-4 inline-block">Mentors from Top Product Companies</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl mb-4">
            Expert mentors from leading <span className="underline-sketch">product companies.</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Book 1:1 sessions with engineers from Google, Microsoft, Amazon and more.
            Career guidance, interview prep, and placement advice—direct and actionable.
          </p>
        </motion.div>

        {/* Mentors Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mentors.map((mentor, index) => (
            <motion.div
              key={mentor.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <div 
                className={`paper-card h-full flex flex-col transition-all duration-300 hover:shadow-lg hover:shadow-foreground/10 hover:scale-[1.02] ${index === 0 ? 'tape' : ''}`}
                style={{ transform: `rotate(${index % 2 === 0 ? -0.5 : 0.5}deg)` }}
              >
                {/* Availability Badge */}
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
                  <span className="text-lg font-bold text-primary">{mentor.price}</span>
                </div>

                {/* Profile */}
                <MentorAvatar mentor={mentor} />

                {/* Experience */}
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Briefcase className="w-4 h-4" />
                    <span className="font-medium">{mentor.experience} exp.</span>
                  </div>
                </div>

                {/* Expertise Tags - min-height so all cards align */}
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

                {/* Book Button */}
                <Button
                  variant={mentor.available ? "default" : "outline"}
                  className="w-full mt-auto"
                  disabled={!mentor.available}
                  onClick={() => {
                  if (!mentor.available) return;
                  if (!user) {
                    setShowLoginModal(true);
                    return;
                  }
                  setBookModalMentor(mentor.name);
                }}
                >
                  {mentor.available ? (
                    <>
                      <Calendar className="w-4 h-4" />
                      Book Session
                    </>
                  ) : (
                    "Join Waitlist"
                  )}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        <BookSessionModal
          open={!!bookModalMentor}
          onOpenChange={(open) => !open && setBookModalMentor(null)}
          mentorName={bookModalMentor ?? ""}
          mentorEmail={allMentors.find((m) => m.name === bookModalMentor)?.email}
          mentorWhatsapp={allMentors.find((m) => m.name === bookModalMentor)?.whatsapp}
        />

        <LoginRequiredModal
          open={showLoginModal}
          onOpenChange={setShowLoginModal}
          redirect="/mentors"
        />

        {/* View all + Apply CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button variant="outline" className="rounded-full" asChild>
            <Link to="/mentors">
              View all {allMentors.length} mentors
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
