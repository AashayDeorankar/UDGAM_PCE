import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiBase } from "@/lib/api-base";
import { useAuth } from "@/contexts/AuthContext";
import { getFirestoreDb } from "@/integrations/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import {
  FREE_ALUMNI_SESSION_LIMIT,
  type MembershipTier,
  canBookMentor,
  isPriorityTier,
  normalizeMembershipTier,
} from "@/lib/membership";

const YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Final Year / Passed Out"] as const;

export const REASON_TO_CONNECT_OPTIONS = [
  "Career guidance and roadmap",
  "Interview preparation (technical / HR)",
  "Resume review and feedback",
  "Placement and project strategy",
  "DSA and coding practice guidance",
  "Transition to new role (e.g. SDE to PM)",
] as const;

export type BookSessionFormValues = {
  name: string;
  year: string;
  phone: string;
  email: string;
  reasonToConnect: string;
};

type BookSessionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mentorName: string;
  mentorCategory?: "industry" | "alumni";
  /** Optional: mentor email – they receive the request too */
  mentorEmail?: string;
  /** Optional: mentor WhatsApp (E.164) – they receive the same message on WhatsApp */
  mentorWhatsapp?: string;
};

export function BookSessionModal({ open, onOpenChange, mentorName, mentorCategory = "industry", mentorEmail, mentorWhatsapp }: BookSessionModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [userTier, setUserTier] = useState<MembershipTier>("free");
  const [alumniSessionsUsed, setAlumniSessionsUsed] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();
  const db = getFirestoreDb();
  const form = useForm<BookSessionFormValues>({
    defaultValues: {
      name: "",
      year: "",
      phone: "",
      email: user?.email || "",
      reasonToConnect: "",
    },
  });

  useEffect(() => {
    if (!user) return;
    form.setValue("email", user.email || "");
  }, [form, user]);

  useEffect(() => {
    const loadMembership = async () => {
      if (!open || !user) return;
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) {
          setUserTier("free");
          setAlumniSessionsUsed(0);
          return;
        }
        const data = snap.data() as { membershipTier?: string; alumniSessionsUsed?: number };
        setUserTier(normalizeMembershipTier(data.membershipTier));
        setAlumniSessionsUsed(typeof data.alumniSessionsUsed === "number" ? data.alumniSessionsUsed : 0);
      } catch {
        setUserTier("free");
        setAlumniSessionsUsed(0);
      }
    };
    loadMembership();
  }, [db, open, user]);

  async function onSubmit(values: BookSessionFormValues) {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to book a session.",
        variant: "destructive",
      });
      return;
    }

    const entitlement = canBookMentor(mentorCategory, userTier, alumniSessionsUsed);
    if (!entitlement.allowed) {
      toast({
        title: "Upgrade required",
        description: entitlement.reason,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const apiBase = getApiBase();
      const idToken = await user.getIdToken();
      const res = await fetch(`${apiBase}/api/book-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          mentorName,
          mentorEmail: mentorEmail || undefined,
          mentorWhatsapp: mentorWhatsapp || undefined,
          name: values.name,
          year: values.year,
          phone: values.phone,
          email: values.email,
          reasonToConnect: values.reasonToConnect,
          mentorCategory,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || "Something went wrong. Try again.";
        toast({
          title: "Could not send request",
          description: msg,
          variant: "destructive",
        });
        console.error("[Book Session] Server error:", res.status, msg);
        return;
      }

      if (mentorCategory === "alumni" && userTier === "free") {
        setAlumniSessionsUsed((v) => v + 1);
      }

      toast({
        title: "Request sent",
        description:
          mentorCategory === "industry" && userTier === "free"
            ? "Paid session request sent. Team will share payment and scheduling details on email."
            : "We’ll connect you with the mentor soon. Check your email for updates.",
      });
      form.reset({
        name: "",
        year: "",
        phone: "",
        email: user?.email || "",
        reasonToConnect: "",
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Session with {mentorName}</DialogTitle>
          <DialogDescription>
            Fill in your details and we’ll connect you with this mentor.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Current Plan: {userTier.toUpperCase()}</p>
          {mentorCategory === "alumni" && userTier === "free" && (
            <p>
              Free tier alumni usage: {alumniSessionsUsed}/{FREE_ALUMNI_SESSION_LIMIT}
            </p>
          )}
          {mentorCategory === "industry" && userTier === "free" && (
            <p>This is a paid industry mentor session for Free users.</p>
          )}
          {isPriorityTier(userTier) && <p>Platinum priority is automatically applied.</p>}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: "Name is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="year"
              rules={{ required: "Please select your year" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Year</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {YEAR_OPTIONS.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              rules={{ required: "Phone number is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="Your phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              rules={{
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Please enter a valid email",
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reasonToConnect"
              rules={{ required: "Please select a reason" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason to connect with mentor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REASON_TO_CONNECT_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
