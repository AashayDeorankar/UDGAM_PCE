import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FivetranGridFooter } from "@/components/FivetranGridFooter";
import logoImage from "@/assets/logo.png";

const links = {
  resources: [
    { label: "Study Notes", href: "/#resources" },
    { label: "Previous Papers", href: "/#resources" },
    { label: "Presentations", href: "/#resources" },
    { label: "Interview Prep", href: "/interview-prep" },
  ],
  branches: [
    { label: "Computer Science", href: "/#branches" },
    { label: "AI & ML", href: "/#branches" },
    { label: "Electronics", href: "/#branches" },
    { label: "Mechanical", href: "/#branches" },
  ],
  company: [
    { label: "About", href: "/#about" },
    { label: "Contact", href: "#" },
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer id="footer" className="border-t border-border relative w-full overflow-x-hidden bg-background">
      {/* Upper area – text only, no grid (Fivetran-style) */}
      <div className="relative z-10 w-full bg-background flex flex-col items-center justify-center gap-6 px-4 pt-5 pb-0 md:pt-6 md:pb-0">
        <motion.h2
          className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground text-center max-w-2xl"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          Let’s get you studying smarter.
        </motion.h2>
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Button size="lg" variant="default" className="rounded-full btn-punch hover:scale-[1.02] active:scale-[0.98]" asChild>
            <Link to="/#resources" className="cursor-pointer">Explore resources</Link>
          </Button>
          <Link
            to="/mentors"
            className="text-sm font-semibold text-foreground hover:text-primary inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            Find a mentor
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
      {/* 3D grid – design neeche, text ke baad */}
      <div className="relative w-full h-40 md:h-56 overflow-hidden -mt-6 md:-mt-8">
        <FivetranGridFooter />
        <div
          className="absolute inset-x-0 bottom-0 h-8 md:h-12 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, hsl(var(--background)) 100%)",
          }}
          aria-hidden
        />
      </div>
      {/* Footer content – moving green grid (subtle) */}
      <div className="relative overflow-hidden" style={{ backgroundColor: "hsl(var(--background))" }}>
        {/* Moving grid layer – same animation, subtle so text stays readable */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            backgroundImage: `
              linear-gradient(hsla(158, 42%, 40%, 0.07) 1px, transparent 1px),
              linear-gradient(90deg, hsla(158, 42%, 40%, 0.07) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            willChange: "background-position",
          }}
          animate={{ backgroundPosition: ["0 0", "0 40px"] }}
          transition={{ duration: 2, ease: "linear", repeat: Infinity, repeatType: "loop" }}
        />
        <div className="container relative z-10 py-12 md:py-14 px-4 sm:px-6 max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10 mb-10 md:mb-12">
          {/* Brand */}
          <motion.div
            className="col-span-2 md:col-span-1"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <a href="/" className="flex items-center gap-2 mb-4">
              <img src={logoImage} alt="TechPrep" className="h-8 w-auto" />
              <span className="text-lg font-bold">
                Tech<span className="text-primary">Prep</span>
              </span>
            </a>
            <motion.p
              className="text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.35 }}
            >
              One login. Notes, PYQs, mentors & study buddy—all in one place.
            </motion.p>
            <motion.p
              className="text-lg mt-1 text-muted-foreground/90 handwritten"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.35 }}
            >
              — built with care, for students
            </motion.p>
          </motion.div>

          {/* Links - staggered */}
          {Object.entries(links).map(([title, items], colIndex) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.35, delay: 0.05 * (colIndex + 1), ease: "easeOut" }}
            >
              <p className="font-semibold mb-4 capitalize">{title}</p>
              <ul className="space-y-2">
                {items.map((item, i) => (
                  <motion.li
                    key={item.label}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.25, delay: 0.08 * (colIndex + 1) + i * 0.03 }}
                  >
                    <a
                      href={item.href}
                      className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 group"
                    >
                      {item.label}
                      <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom bar */}
        <motion.div
          className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 md:pt-8 border-t border-border/80"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: 0.15, ease: "easeOut" }}
        >
          <p className="text-sm text-muted-foreground text-center md:text-left">
            © 2026 TechPrep. Built so you study smarter—no runaround.
          </p>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5 flex-wrap justify-center md:justify-end">
            <span className="inline-flex items-center gap-1">
              Made with <Heart className="h-3.5 w-3.5 text-destructive fill-destructive" /> and <span className="handwritten text-base">a lot of chai</span>
            </span>
            <span className="hidden sm:inline text-border">·</span>
            <span className="text-muted-foreground/90">Crafted for B.Tech students</span>
          </p>
        </motion.div>
        </div>
      </div>
    </footer>
  );
}
