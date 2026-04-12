import { Inbox } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const hiddenPrefixes = ["/auth", "/inbox", "/alumni/inbox"];

export function InboxFab() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (!user) return null;
  if (hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))) return null;

  return (
    <Link
      to="/inbox"
      className="fixed bottom-6 right-6 z-[950] inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[6px_6px_0_0_rgba(0,0,0,0.85)] transition-transform hover:-translate-y-0.5"
      aria-label="Open inbox"
    >
      <Inbox className="h-5 w-5" />
    </Link>
  );
}
