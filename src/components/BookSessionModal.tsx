import { useState } from "react";
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
  /** Optional: mentor email – they receive the request too */
  mentorEmail?: string;
  /** Optional: mentor WhatsApp (E.164) – they receive the same message on WhatsApp */
  mentorWhatsapp?: string;
};

export function BookSessionModal({ open, onOpenChange, mentorName, mentorEmail, mentorWhatsapp }: BookSessionModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const form = useForm<BookSessionFormValues>({
    defaultValues: {
      name: "",
      year: "",
      phone: "",
      email: "",
      reasonToConnect: "",
    },
  });

  async function onSubmit(values: BookSessionFormValues) {
    setSubmitting(true);
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/book-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorName,
          mentorEmail: mentorEmail || undefined,
          mentorWhatsapp: mentorWhatsapp || undefined,
          name: values.name,
          year: values.year,
          phone: values.phone,
          email: values.email,
          reasonToConnect: values.reasonToConnect,
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
      toast({
        title: "Request sent",
        description: "We’ll connect you with the mentor soon. Check your email for updates.",
      });
      form.reset();
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
