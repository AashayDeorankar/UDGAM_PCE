import { motion } from "framer-motion";
import { TrendingUp, Zap, Clock, Heart } from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    title: "Updated regularly",
    description: "New notes and PYQs from toppers across colleges, added as we get them.",
  },
  {
    icon: Zap,
    title: "Mentors from top product companies",
    description: "Get guidance from engineers at top product-based companies like Adobe, Amazon, Oracle and more.",
  },
  {
    icon: Clock,
    title: "Study Buddy 24/7",
    description: "Stuck at 2 AM? Ask in plain language, get answers that stick.",
  },
  {
    icon: Heart,
    title: "Built with the same hustle",
    description: "Started from the same place—notes, confusion, branch switch. Built so you don’t have to run around.",
  },
];

export function StatsSection() {
  return (
    <section className="pt-4 pb-16 border-y border-border bg-muted/30">
      <div className="container">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group"
              style={{ transform: `rotate(${index % 2 === 0 ? -0.8 : 0.6}deg)` }}
            >
              <div className="paper-card p-5 h-full group-hover:shadow-lg group-hover:shadow-foreground/10 transition-shadow duration-300">
                <div className="p-2.5 w-fit rounded-lg bg-muted/80 border-2 border-foreground mb-4 group-hover:border-primary/60 transition-colors">
                  <feature.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="font-bold text-foreground mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
