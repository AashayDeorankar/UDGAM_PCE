import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

type LoginRequiredModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where to send user after login (e.g. "/mentors", "/#ai-assistant") */
  redirect?: string;
};

export function LoginRequiredModal({
  open,
  onOpenChange,
  redirect = "/",
}: LoginRequiredModalProps) {
  const navigate = useNavigate();

  const handleLogin = () => {
    onOpenChange(false);
    const path = redirect.startsWith("/") ? redirect : "/";
    navigate(`/auth?redirect=${encodeURIComponent(path)}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Login required</DialogTitle>
          <DialogDescription>
            Please log in or sign up to use this feature.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleLogin}>
            <LogIn className="h-4 w-4 mr-2" />
            Login / Sign up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
