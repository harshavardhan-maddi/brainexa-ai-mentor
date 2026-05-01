import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { BookOpen, Mail, Lock, User, Phone, Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGoogleLogin } from "@react-oauth/google";
import { toast } from "sonner";
import TermsModal from "@/components/TermsModal";
import { API_BASE_URL } from "@/lib/api-config";


type Step = "details" | "otp";

export default function Signup() {
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [suggestedPassword, setSuggestedPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { login } = useStore();
  const navigate = useNavigate();

  // Step 0: Show terms first, then send OTP
  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(password)) {
      const suggested = `Brainexa@${Math.floor(1000 + Math.random() * 9000)}`;
      setSuggestedPassword(suggested);
      setError("Password must be at least 8 characters and contain an uppercase letter, lowercase letter, number, and special character.");
      return;
    }

    if (!termsAccepted) {
      setShowTerms(true);
      return;
    }
    sendOtp();
  };

  const handleAcceptTerms = () => {
    setTermsAccepted(true);
    setShowTerms(false);
    toast.success("Terms accepted!");
    sendOtp();
  };

  // Step 1: Send OTP to email
  const sendOtp = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Verification code sent to your email!");
        setStep("otp");
      } else {
        setError(data.error || "Failed to send OTP.");
      }
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & create account
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit code sent to your email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password, otp }),
      });
      const data = await res.json();
      if (data.success) {
        login({ ...data.user, password });
        toast.success("Account created successfully!");
        navigate("/subscription");
      } else {
        setError(data.error || "Failed to create account.");
      }
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    flow: "implicit",
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenResponse.access_token }),
        });
        const data = await res.json();
        if (data.success && data.user) {
          login(data.user);
          toast.success("Successfully registered with Google!");
          navigate("/subscription");
        } else {
          setError(data.error || "Failed to authenticate with Google.");
        }
      } catch {
        setError("Network error while verifying Google Login.");
      }
    },
    onError: () => setError("Google Signup failed."),
  });

  return (
    <div className="min-h-screen flex">
      <TermsModal isOpen={showTerms} onAccept={handleAcceptTerms} />
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 gradient-red items-center justify-center p-12">
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-accent-foreground/20 flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-accent-foreground" />
            </div>
            <span className="font-display text-3xl font-bold text-accent-foreground">Brainexa</span>
          </div>
          <h1 className="font-display text-4xl font-bold text-accent-foreground mb-4">
            Start your personalized learning journey
          </h1>
          <p className="text-accent-foreground/80 text-lg leading-relaxed">
            Join thousands of students achieving better grades with AI-powered study plans and mentoring.
          </p>
        </motion.div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl gradient-red flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-accent-foreground" />
            </div>
            <span className="font-display text-2xl font-bold text-foreground">Brainexa</span>
          </div>

          <AnimatePresence mode="wait">
            {step === "details" ? (
              <motion.div key="details" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <h2 className="font-display text-2xl font-bold text-foreground mb-1">Create your account</h2>
                <p className="text-muted-foreground mb-8">Start learning smarter today</p>

                {error && (
                  <div className="bg-accent-light text-accent rounded-lg px-4 py-3 text-sm mb-6">
                    <p>{error}</p>
                    {suggestedPassword && (
                      <div className="mt-3 p-3 bg-background rounded border border-border">
                        <p className="text-muted-foreground text-xs mb-1">Suggested Password:</p>
                        <div className="flex items-center justify-between">
                          <code className="font-mono text-foreground font-bold">{suggestedPassword}</code>
                          <button 
                            type="button"
                            onClick={() => {
                              setPassword(suggestedPassword);
                              setSuggestedPassword("");
                              setError("");
                            }}
                            className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:opacity-90 transition-opacity"
                          >
                            Use this
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleContinue} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Your full name" />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="your@email.com" />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Phone (optional)</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="+91 XXXXXXXXXX" />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Create a password" />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full gradient-red text-accent-foreground py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {loading ? "Sending code..." : "Continue"}
                  </button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs"><span className="bg-background px-3 text-muted-foreground">or continue with</span></div>
                </div>

                <button onClick={() => loginWithGoogle()} type="button"
                  className="w-full flex items-center justify-center gap-3 border border-border rounded-lg py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Continue with Google
                </button>

                <p className="text-center text-sm text-muted-foreground mt-6">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary font-semibold hover:underline">Log in</Link>
                </p>
              </motion.div>
            ) : (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-6">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-1 text-center">Verify your email</h2>
                <p className="text-muted-foreground mb-8 text-center text-sm">
                  We sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span>. Enter it below to complete signup.
                </p>

                {error && (
                  <div className="bg-accent-light text-accent rounded-lg px-4 py-3 text-sm mb-6">{error}</div>
                )}

                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Verification Code</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-full text-center text-2xl font-bold tracking-[0.5em] py-4 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="000000"
                      maxLength={6}
                    />
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full gradient-red text-accent-foreground py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {loading ? "Creating account..." : "Create account"}
                  </button>
                </form>

                <button onClick={() => { setStep("details"); setError(""); setOtp(""); }}
                  className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  ← Back to details
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
