import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/api-config";

import {
  User, Mail, Camera, Trash2, LogOut, ShieldCheck,
  Save, Loader2, Eye, EyeOff, AlertTriangle, Check
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const BACKEND = API_BASE_URL;

type Section = "profile" | "email" | "danger";

export default function Settings() {
  const { user, logout, updateUser } = useStore();
  const navigate = useNavigate();

  // -- Profile tab state --
  const [name, setName] = useState(user?.name || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.profilePicture || null);
  const [savingProfile, setSavingProfile] = useState(false);

  // -- Email change state --
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [showOtpField, setShowOtpField] = useState(false);

  // -- UI state --
  const [activeSection, setActiveSection] = useState<Section>("profile");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Avatar Selection ---
  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  // --- Save Profile ---
  const handleSaveProfile = async () => {
    if (!user) return;
    if (!name.trim()) return toast.error("Name cannot be empty");
    setSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append("userId", user.id);
      formData.append("name", name.trim());
      if (avatarFile) formData.append("profilePicture", avatarFile);

      const res = await fetch(`${BACKEND}/api/user/profile`, {
        method: "PUT",
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to update profile");

      updateUser({ name: data.user.name, profilePicture: data.user.profilePicture });
      toast.success("✅ Profile updated successfully!");
      setAvatarFile(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // --- Send Email OTP ---
  const handleSendEmailOtp = async () => {
    if (!user) return;
    if (!newEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return toast.error("Please enter a valid email address");
    }
    if (newEmail === user.email) {
      return toast.error("New email must be different from current email");
    }
    setSendingOtp(true);
    try {
      const res = await fetch(`${BACKEND}/api/user/change-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, newEmail }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to send OTP");
      setOtpSent(true);
      setShowOtpField(true);
      toast.success("📧 Verification code sent to your new email!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  // --- Verify Email OTP ---
  const handleVerifyEmailOtp = async () => {
    if (!user) return;
    if (!otp.trim()) return toast.error("Please enter the OTP");
    setVerifyingOtp(true);
    try {
      const res = await fetch(`${BACKEND}/api/user/change-email-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, newEmail, otp }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Invalid OTP");
      updateUser({ email: newEmail });
      toast.success("✅ Email updated successfully!");
      setNewEmail("");
      setOtp("");
      setOtpSent(false);
      setShowOtpField(false);
    } catch (err: any) {
      toast.error(err.message || "Invalid or expired OTP");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // --- Sign Out ---
  const handleSignOut = () => {
    logout();
    navigate("/");
    toast.success("Signed out successfully");
  };

  // --- Delete Account ---
  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!deletePassword.trim()) return toast.error("Please enter your password to confirm");
    setDeletingAccount(true);
    try {
      const res = await fetch(`${BACKEND}/api/user/delete-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, password: deletePassword }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to delete account");
      logout();
      navigate("/");
      toast.success("Account deleted. We're sorry to see you go.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
    } finally {
      setDeletingAccount(false);
      setDeletePassword("");
    }
  };

  const avatar = avatarPreview || user?.profilePicture;
  const initial = (user?.name?.charAt(0) || "U").toUpperCase();

  const sections: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "email", label: "Change Email", icon: Mail },
    { id: "danger", label: "Account", icon: ShieldCheck },
  ];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your profile and account preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Nav */}
          <nav className="lg:w-56 shrink-0">
            <div className="bg-card border border-border rounded-2xl p-2 flex flex-row lg:flex-col gap-1">
              {sections.map((s) => {
                const Icon = s.icon;
                const active = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full text-left ${
                      active
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline lg:inline">{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick actions */}
            <div className="mt-3 bg-card border border-border rounded-2xl p-2 flex flex-col gap-1 hidden lg:flex">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-amber-500 hover:bg-amber-500/10 transition-all w-full text-left"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </nav>

          {/* Main Panel */}
          <div className="flex-1 space-y-6">

            {/* ====== PROFILE SECTION ====== */}
            {activeSection === "profile" && (
              <div className="bg-card border border-border rounded-2xl p-6 lg:p-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Edit Profile</h2>
                </div>

                {/* Avatar */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt="Profile"
                        className="w-28 h-28 rounded-full object-cover border-4 border-primary/30 shadow-lg"
                      />
                    ) : (
                      <div className="w-28 h-28 rounded-full gradient-purple flex items-center justify-center text-primary-foreground text-4xl font-black border-4 border-primary/30 shadow-lg">
                        {initial}
                      </div>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or WEBP – max 5 MB
                  </p>
                  {avatarFile && (
                    <span className="text-xs text-primary font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> {avatarFile.name} ready to upload
                    </span>
                  )}
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground" htmlFor="settings-name">
                    Full Name
                  </label>
                  <input
                    id="settings-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Your full name"
                  />
                </div>

                {/* Current email (read-only) */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Email Address</label>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/50 border border-border text-muted-foreground">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="text-sm">{user?.email}</span>
                    <span className="ml-auto text-[10px] font-bold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    To change your email, go to the{" "}
                    <button onClick={() => setActiveSection("email")} className="text-primary underline-offset-2 underline">
                      Change Email
                    </button>{" "}
                    section.
                  </p>
                </div>

                {/* Save button */}
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 shadow-md"
                >
                  {savingProfile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {savingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}

            {/* ====== EMAIL SECTION ====== */}
            {activeSection === "email" && (
              <div className="bg-card border border-border rounded-2xl p-6 lg:p-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-blue-500" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Change Email Address</h2>
                </div>

                <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-4 text-sm text-blue-400">
                  📬 A one-time verification code will be sent to your new email address to confirm ownership.
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Current Email</label>
                  <div className="px-4 py-3 rounded-xl bg-secondary/50 border border-border text-muted-foreground text-sm">
                    {user?.email}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground" htmlFor="settings-new-email">
                    New Email Address
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="settings-new-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      disabled={otpSent}
                      className="flex-1 px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-50"
                      placeholder="Enter new email address"
                    />
                    <button
                      onClick={handleSendEmailOtp}
                      disabled={sendingOtp || otpSent}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 whitespace-nowrap"
                    >
                      {sendingOtp ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : otpSent ? (
                        <Check className="w-4 h-4" />
                      ) : null}
                      {otpSent ? "Sent!" : sendingOtp ? "Sending..." : "Send OTP"}
                    </button>
                  </div>
                </div>

                {showOtpField && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground" htmlFor="settings-otp">
                        Enter Verification Code
                      </label>
                      <input
                        id="settings-otp"
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-center text-2xl tracking-[1rem] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono"
                        placeholder="000000"
                        maxLength={6}
                      />
                      <p className="text-xs text-muted-foreground text-center">
                        Code expires in 10 minutes.{" "}
                        <button
                          onClick={() => { setOtpSent(false); setShowOtpField(false); setOtp(""); }}
                          className="text-primary underline underline-offset-2"
                        >
                          Use different email
                        </button>
                      </p>
                    </div>

                    <button
                      onClick={handleVerifyEmailOtp}
                      disabled={verifyingOtp || otp.length < 6}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 shadow-md"
                    >
                      {verifyingOtp ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                      {verifyingOtp ? "Verifying..." : "Verify & Update Email"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ====== DANGER ZONE SECTION ====== */}
            {activeSection === "danger" && (
              <div className="space-y-4">
                {/* Sign Out Card */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <LogOut className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-foreground">Sign Out</h2>
                      <p className="text-xs text-muted-foreground">Sign out of your account on this device.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold text-sm hover:bg-amber-500/20 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out Now
                  </button>
                </div>

                {/* Delete Account Card */}
                <div className="bg-card border border-red-500/30 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-red-500">Delete Account</h2>
                      <p className="text-xs text-muted-foreground">
                        Permanently delete your account and all associated data. This cannot be undone.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4">
                    <ul className="text-xs text-red-400 space-y-1">
                      <li>⚠️ All study plans and progress will be deleted</li>
                      <li>⚠️ All quiz results and chat history will be removed</li>
                      <li>⚠️ Your subscription will be cancelled with no refund</li>
                      <li>⚠️ This action is <strong>irreversible</strong></li>
                    </ul>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        disabled={deletingAccount}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 shadow-md"
                      >
                        {deletingAccount ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        {deletingAccount ? "Deleting..." : "Delete My Account"}
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-500">
                          <AlertTriangle className="w-5 h-5" />
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm">
                          This will permanently delete your account for{" "}
                          <strong className="text-foreground">{user?.email}</strong> and all associated data.
                          There is no way to recover your account after this.
                        </AlertDialogDescription>
                        <div className="mt-4 space-y-2">
                          <label className="text-xs font-bold uppercase text-red-500/80">Confirm Password</label>
                          <input
                            type="password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-red-500/20 text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all font-mono"
                            placeholder="••••••••"
                          />
                        </div>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
                        >
                          Yes, Delete Forever
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
