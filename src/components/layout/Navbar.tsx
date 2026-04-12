import { useState, useEffect, type MouseEvent as ReactMouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight, LogOut, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import logoImage from "@/assets/logo.png";
import { UpgradePlanModal } from "@/components/UpgradePlanModal";
import { getFirestoreDb } from "@/integrations/firebase/config";
import { doc, onSnapshot } from "firebase/firestore";
import { type MembershipTier, normalizeMembershipTier } from "@/lib/membership";

const studentLinks = [
  { name: "Connect", href: "/connect" },
  { name: "Resources", href: "/#branches" },
  { name: "Interview Prep", href: "/interview-prep" },
  { name: "AI Mock Interview", href: "/mock-interview" },
  { name: "Mentors", href: "/mentors" },
  { name: "AI Assistant", href: "/#ai-assistant" },
  { name: "About", href: "/#about" },
];

const alumniLinks = [
  { name: "Connect", href: "/connect" },
  { name: "Inbox", href: "/alumni/inbox" },
  { name: "AI Assistant", href: "/ai-assistant" },
  { name: "Resources", href: "/resources" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, signOut, loading, isAdmin, role } = useAuth();
  const navigate = useNavigate();
  const db = getFirestoreDb();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [membershipTier, setMembershipTier] = useState<MembershipTier>("free");
  const navLinks = role === "alumni" ? alumniLinks : studentLinks;

  useEffect(() => {
    if (!user) {
      setMembershipTier("free");
      return;
    }
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (!snap.exists()) {
          setMembershipTier("free");
          return;
        }
        const data = snap.data() as { membershipTier?: string };
        setMembershipTier(normalizeMembershipTier(data.membershipTier));
      },
      () => {
        setMembershipTier("free");
      },
    );
    return () => unsub();
  }, [db, user]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const onClick = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-profile-menu]")) {
        setProfileMenuOpen(false);
      }
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [profileMenuOpen]);

  const handleAuthClick = () => {
    navigate("/auth");
  };

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  const handleNavClick = (event: ReactMouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    const [path, hash] = href.split("#");
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        navigate(path || "/");
        if (hash) {
          requestAnimationFrame(() => {
            const target = document.getElementById(hash);
            if (target) {
              target.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          });
        }
      });
    });
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4"
    >
      {/* Floating Pill Navbar */}
      <nav
        className={`relative flex items-center justify-between gap-2 px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-full transition-all duration-300 overflow-hidden ${
          scrolled
            ? "bg-background/95 backdrop-blur-md shadow-lg shadow-foreground/5"
            : "bg-background/90 backdrop-blur-sm shadow-md shadow-foreground/5"
        } border border-border/50 max-w-6xl w-full`}
      >
        {/* Logo - Left */}
        <Link to="/" className="flex items-center gap-1.5 pl-1.5 flex-shrink-0 min-w-0">
          <img src={logoImage} alt="TechPrep" className="h-8 w-auto" />
          <span className="text-[1rem] font-bold hidden sm:inline leading-8">
            Tech<span className="text-primary">Prep</span>
          </span>
          <span className="hidden xl:inline text-xs handwritten text-muted-foreground/80 ml-0.5">for students</span>
        </Link>

        {/* Desktop Navigation - Center */}
        <div className="hidden lg:flex items-center gap-1 px-2 min-w-0 flex-1 justify-center">
          {[...navLinks, ...(isAdmin ? [{ name: "Upload", href: "/upload" }] : [])].map((link) => {
            const isHashLink = link.href.startsWith("/#");
            const isPageLink = link.href.startsWith("/") && !isHashLink;
            const linkClass = "px-2 py-1 text-[13px] xl:text-sm text-muted-foreground hover:text-primary link-underline transition-all duration-200 whitespace-nowrap";
            if (isPageLink) {
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={linkClass}
                  onClick={(e) => handleNavClick(e, link.href)}
                >
                  {link.name}
                </Link>
              );
            }
            if (isHashLink) {
              return (
                <Link key={link.name} to={link.href} className={linkClass}>
                  {link.name}
                </Link>
              );
            }
            return (
              <a key={link.name} href={link.href} className={linkClass}>
                {link.name}
              </a>
            );
          })}
          <button
            type="button"
            onClick={() => setUpgradeModalOpen(true)}
            className="px-2 py-1 text-[13px] xl:text-sm text-primary hover:text-primary/80 link-underline transition-all duration-200 whitespace-nowrap"
          >
            Upgrade
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden p-2 rounded-full hover:bg-muted/50 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 left-4 right-4 lg:hidden"
          >
            <div className="bg-background/95 backdrop-blur-md rounded-2xl shadow-lg shadow-foreground/5 border border-border/50 p-4 max-w-4xl mx-auto">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  className="px-4 py-3 text-primary hover:text-primary/80 hover:bg-muted/50 rounded-xl transition-colors text-left"
                  onClick={() => {
                    setIsOpen(false);
                    setUpgradeModalOpen(true);
                  }}
                >
                  Upgrade
                </button>
                {[...navLinks, ...(isAdmin ? [{ name: "Upload", href: "/upload" }] : [])].map((link) => {
                  const isHashLink = link.href.startsWith("/#");
                  const isPageLink = link.href.startsWith("/") && !isHashLink;
                  const linkClass = "px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-colors whitespace-nowrap";
                  if (isPageLink) {
                    return (
                      <Link
                        key={link.name}
                        to={link.href}
                        className={linkClass}
                        onClick={(e) => {
                          setIsOpen(false);
                          handleNavClick(e, link.href);
                        }}
                      >
                        {link.name}
                      </Link>
                    );
                  }
                  if (isHashLink) {
                    return (
                      <Link key={link.name} to={link.href} className={linkClass} onClick={() => setIsOpen(false)}>
                        {link.name}
                      </Link>
                    );
                  }
                  return (
                    <a key={link.name} href={link.href} className={linkClass} onClick={() => setIsOpen(false)}>
                      {link.name}
                    </a>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-border/50">
                {!loading && user ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground flex items-center gap-2 px-4">
                      <User className="h-4 w-4" />
                      {user.email}
                      {role && (
                        <span className="ml-1 text-[10px] uppercase tracking-wide text-primary/70">{role}</span>
                      )}
                    </p>
                    <Button
                      className="w-full rounded-full"
                      variant="outline"
                      onClick={() => {
                        setIsOpen(false);
                        navigate("/dashboard");
                      }}
                    >
                      Dashboard
                    </Button>
                    <Button
                      className="w-full rounded-full"
                      variant="outline"
                      onClick={() => {
                        setIsOpen(false);
                        navigate("/profile");
                      }}
                    >
                      Profile
                    </Button>
                    <Button
                      className="w-full rounded-full"
                      variant="outline"
                      onClick={() => {
                        setIsOpen(false);
                        navigate("/personal-analysis");
                      }}
                    >
                      Personal analysis
                    </Button>
                    <Button
                      className="w-full rounded-full"
                      variant="outline"
                      onClick={() => {
                        setIsOpen(false);
                        navigate("/requests");
                      }}
                    >
                      Requests
                    </Button>
                    <Button
                      className="w-full rounded-full"
                      variant="outline"
                      onClick={handleSignOut}
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full rounded-full btn-punch hover:scale-[1.02] active:scale-[0.98]"
                    onClick={() => {
                      setIsOpen(false);
                      handleAuthClick();
                    }}
                  >
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && !user && (
        <div
          className={`hidden lg:flex items-center gap-1.5 px-1.5 py-1 rounded-full border border-border/50 transition-all duration-300 absolute right-4 top-4 ${
            scrolled
              ? "bg-background/95 backdrop-blur-md shadow-md shadow-foreground/5"
              : "bg-background/90 backdrop-blur-sm shadow-sm shadow-foreground/5"
          }`}
        >
          <Button
            size="sm"
            className="rounded-full px-5 h-8 bg-foreground text-background hover:bg-foreground/90 btn-punch hover:scale-105 active:scale-95 transition-transform"
            onClick={handleAuthClick}
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!loading && user && (
        <div
          data-profile-menu
          className={`hidden lg:flex items-center gap-1.5 px-1.5 py-1 rounded-full border border-border/50 transition-all duration-300 absolute right-4 top-4 ${
            scrolled
              ? "bg-background/95 backdrop-blur-md shadow-md shadow-foreground/5"
              : "bg-background/90 backdrop-blur-sm shadow-sm shadow-foreground/5"
          }`}
        >
          <button
            type="button"
            onClick={() => setProfileMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 px-2 h-7 rounded-full hover:bg-muted/60 transition-colors"
          >
            <User className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground max-w-[90px] truncate" title={user.email ?? undefined}>
              {user.email?.split("@")[0]}
            </span>
            {role && (
              <span className="text-[10px] uppercase tracking-wide text-primary/70">{role}</span>
            )}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          {profileMenuOpen && (
            <div
              data-profile-menu
              className="absolute right-2 top-11 w-44 rounded-xl border border-border bg-background shadow-lg overflow-hidden"
            >
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  setUpgradeModalOpen(true);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
              >
                Upgrade plan
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  navigate("/dashboard");
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  navigate("/profile");
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
              >
                Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  navigate("/personal-analysis");
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
              >
                Personal analysis
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  navigate("/requests");
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
              >
                Requests
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  handleSignOut();
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      )}

      <UpgradePlanModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        currentTier={membershipTier}
        isLoggedIn={!!user}
        onLoginClick={() => {
          setUpgradeModalOpen(false);
          navigate("/auth?redirect=%2Fmentors");
        }}
      />
    </motion.header>
  );
}