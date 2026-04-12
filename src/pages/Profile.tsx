import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getFirestoreDb } from "@/integrations/firebase/config";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { uploadProfileImage } from "@/lib/upload-file";
import { Upload } from "lucide-react";
import { FREE_ALUMNI_SESSION_LIMIT, type MembershipTier, normalizeMembershipTier } from "@/lib/membership";

export default function Profile() {
  const { user, role, isAdmin } = useAuth();
  const { toast } = useToast();
  const db = getFirestoreDb();
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [target, setTarget] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [year, setYear] = useState("");
  const [branch, setBranch] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [membershipTier, setMembershipTier] = useState<MembershipTier>("free");
  const [alumniSessionsUsed, setAlumniSessionsUsed] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const isEditingRef = useRef(false);

  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  const applyProfileData = (data: {
    name?: string;
    domain?: string;
    target?: string;
    collegeName?: string;
    year?: string;
    branch?: string;
    companyName?: string;
    position?: string;
    profileImageUrl?: string;
    membershipTier?: string;
    alumniSessionsUsed?: number;
  }) => {
    setName(data.name || "");
    setDomain(data.domain || "");
    setTarget(data.target || "");
    setCollegeName(data.collegeName || "");
    setYear(data.year || "");
    setBranch(data.branch || "");
    setCompanyName(data.companyName || "");
    setPosition(data.position || "");
    setProfileImageUrl(data.profileImageUrl || "");
    setMembershipTier(normalizeMembershipTier(data.membershipTier));
    setAlumniSessionsUsed(typeof data.alumniSessionsUsed === "number" ? data.alumniSessionsUsed : 0);
  };

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(
      userRef,
      async (snap) => {
        const data = snap.exists()
          ? (snap.data() as {
              name?: string;
              domain?: string;
              target?: string;
              collegeName?: string;
              year?: string;
              branch?: string;
              companyName?: string;
              position?: string;
              profileImageUrl?: string;
              membershipTier?: string;
              alumniSessionsUsed?: number;
            })
          : null;

        if (data && !isEditingRef.current) {
          applyProfileData(data);
        }

        const hasCoreProfile = Boolean(
          data?.name || data?.collegeName || data?.domain || data?.target || data?.companyName || data?.position,
        );

        // Backward-compatible fallback if older accounts only have role-specific docs,
        // or if the main user doc exists but is missing core profile fields.
        if (hasCoreProfile) return;
        try {
          const roleHint = role || data?.role;
          const tryRoleDoc = async (collectionName: "students" | "alumni") => {
            const roleSnap = await getDoc(doc(db, collectionName, user.uid));
            if (!roleSnap.exists()) return null;
            return roleSnap.data() as {
              name?: string;
              domain?: string;
              target?: string;
              collegeName?: string;
              year?: string;
              branch?: string;
              companyName?: string;
              position?: string;
              profileImageUrl?: string;
              membershipTier?: string;
              alumniSessionsUsed?: number;
            };
          };

          let roleData = roleHint === "alumni"
            ? await tryRoleDoc("alumni")
            : roleHint === "student"
              ? await tryRoleDoc("students")
              : null;

          if (!roleData) {
            roleData = await tryRoleDoc("students");
          }
          if (!roleData) {
            roleData = await tryRoleDoc("alumni");
          }
          if (!roleData) return;

          if (!isEditingRef.current) {
            applyProfileData(roleData);
          }

          await setDoc(
            userRef,
            {
              email: user.email || "",
              role: roleHint || role || data?.role || "student",
              ...roleData,
              membershipTier: normalizeMembershipTier(roleData.membershipTier),
              alumniSessionsUsed: typeof roleData.alumniSessionsUsed === "number" ? roleData.alumniSessionsUsed : 0,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        } catch {
          // ignore
        }
      },
      () => {
        // ignore
      },
    );

    return () => unsub();
  }, [db, role, user]);

  const handleProfilePhotoUpload = async (file: File | null) => {
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    setUploadingPhoto(true);
    try {
      const idToken = await user.getIdToken();
      const uploaded = await uploadProfileImage(file, idToken);
      if ("error" in uploaded) {
        toast({
          title: "Upload failed",
          description: uploaded.error,
          variant: "destructive",
        });
        return;
      }

      setProfileImageUrl(uploaded.url);
      await setDoc(
        doc(db, "users", user.uid),
        {
          profileImageUrl: uploaded.url,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      toast({
        title: "Photo uploaded",
        description: "Profile picture saved successfully.",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };


  const saveProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const payload = {
        name,
        email: user.email || "",
        domain,
        target,
        collegeName,
        year,
        branch,
        companyName,
        position,
        profileImageUrl,
        membershipTier,
        alumniSessionsUsed,
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "users", user.uid), payload, { merge: true });

      if (role) {
        await setDoc(
          doc(db, role === "alumni" ? "alumni" : "students", user.uid),
          {
            ...payload,
            role,
          },
          { merge: true },
        );
      }

      toast({ title: "Profile updated", description: "Your changes have been saved." });
      setIsEditing(false);
      isEditingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16 md:pt-24 md:pb-20 bg-secondary/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-40" />
        <div className="container relative max-w-3xl">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Profile</h1>
          <p className="text-muted-foreground mb-6">
            Update your profile details. Role: {role || "unknown"}
          </p>

          <div className="rounded-xl border-2 border-border bg-card p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Profile picture</label>
              <div className="mt-2 flex items-center gap-4">
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt={name || user?.email || "Profile"}
                    className="h-16 w-16 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full border border-border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    No photo
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={uploadingPhoto}
                    onChange={(e) => handleProfilePhotoUpload(e.target.files?.[0] ?? null)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP. Stored securely on AWS S3.</p>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Membership plan</label>
              <Select
                value={membershipTier}
                onValueChange={(value: MembershipTier) => setMembershipTier(value)}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Free: up to {FREE_ALUMNI_SESSION_LIMIT} alumni sessions and paid industry sessions. Gold: full access. Platinum: full access with priority.
              </p>
              {!isAdmin && (
                <p className="text-xs text-muted-foreground">Plan upgrades are managed by billing/admin.</p>
              )}
              {membershipTier === "free" && (
                <p className="text-xs text-muted-foreground">Alumni sessions used: {alumniSessionsUsed}/{FREE_ALUMNI_SESSION_LIMIT}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Full name</label>
              <Input
                value={name}
                onChange={(e) => {
                  setIsEditing(true);
                  isEditingRef.current = true;
                  setName(e.target.value);
                }}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input value={user?.email || ""} readOnly />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Domain</label>
              <Input
                value={domain}
                onChange={(e) => {
                  setIsEditing(true);
                  isEditingRef.current = true;
                  setDomain(e.target.value);
                }}
                placeholder="Backend, AI/ML, Product"
              />
            </div>
            {role === "student" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Target</label>
                <Input
                  value={target}
                  onChange={(e) => {
                    setIsEditing(true);
                    isEditingRef.current = true;
                    setTarget(e.target.value);
                  }}
                  placeholder="SDE-1, Data Analyst"
                />
              </div>
            )}
            {role === "student" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">College name</label>
                  <Input
                    value={collegeName}
                    onChange={(e) => {
                      setIsEditing(true);
                      isEditingRef.current = true;
                      setCollegeName(e.target.value);
                    }}
                    placeholder="Your college"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Year</label>
                  <Input
                    value={year}
                    onChange={(e) => {
                      setIsEditing(true);
                      isEditingRef.current = true;
                      setYear(e.target.value);
                    }}
                    placeholder="3rd year"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Branch</label>
                  <Input
                    value={branch}
                    onChange={(e) => {
                      setIsEditing(true);
                      isEditingRef.current = true;
                      setBranch(e.target.value);
                    }}
                    placeholder="CSE, ECE"
                  />
                </div>
              </>
            )}
            {role === "alumni" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Company name</label>
                  <Input
                    value={companyName}
                    onChange={(e) => {
                      setIsEditing(true);
                      isEditingRef.current = true;
                      setCompanyName(e.target.value);
                    }}
                    placeholder="Your company"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Position in company</label>
                  <Input
                    value={position}
                    onChange={(e) => {
                      setIsEditing(true);
                      isEditingRef.current = true;
                      setPosition(e.target.value);
                    }}
                    placeholder="SDE-2, PM"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">College name</label>
                  <Input
                    value={collegeName}
                    onChange={(e) => {
                      setIsEditing(true);
                      isEditingRef.current = true;
                      setCollegeName(e.target.value);
                    }}
                    placeholder="Your college"
                  />
                </div>
              </>
            )}
            <div className="flex justify-end">
              <Button onClick={saveProfile} disabled={loading || uploadingPhoto}>
                {uploadingPhoto ? (
                  <>
                    <Upload className="h-4 w-4 animate-pulse" />
                    Uploading photo...
                  </>
                ) : loading ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
