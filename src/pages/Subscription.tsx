import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Crown, Zap, ShieldCheck, Loader2, CreditCard, Smartphone, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/api-config";


declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Subscription() {
  const { user, updatePlan, acceptRules } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [showUpiInput, setShowUpiInput] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [showRulesOverlay, setShowRulesOverlay] = useState(false);

  // Load Razorpay Checkout Script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    document.body.appendChild(script);

    if (location.state?.fromRestricted) {
      toast.error("Please take subscription first.");
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleStandardPayment = async () => {
    if (!isScriptLoaded) {
      toast.error("Razorpay SDK not loaded. Please try again.");
      return;
    }
    initiateRazorpay();
  };

  const initiateRazorpay = async (method?: string, vpa?: string) => {
    setIsLoading(true);
    try {
      // 1. Create Order on Backend
      const orderRes = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 299 }),
      });
      const orderData = await orderRes.json();

      if (!orderData.success) throw new Error(orderData.error);

      // 2. Open Razorpay Checkout Modal
      const options: any = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_SZ8RImOkYWhoEl",
        amount: orderData.order.amount,
        currency: "INR",
        name: "Brainexa Premium",
        description: "Unlimited AI Study Tools",
        order_id: orderData.order.id,
        handler: async (response: any) => {
          // 3. Verify Payment on Backend
          try {
            const verifyRes = await fetch(`${API_BASE_URL}/api/payment/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: user?.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              updatePlan("premium");
              toast.success("Welcome to Brainexa Premium!");
              setShowRulesOverlay(true);
            } else {
              toast.error("Payment verification failed.");
            }
          } catch (err) {
            toast.error("Error communicating with server.");
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#D946EF",
        },
      };

      // IF specific UPI ID is provided, we tell Razorpay to skip its list and go straight to collecting
      if (method === 'upi' && vpa) {
        options.method = 'upi';
        options.vpa = vpa;
      }

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        toast.error(response.error.description);
      });
      rzp.open();
    } catch (err) {
      console.error(err);
      toast.error("Failed to initiate payment.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpiCollect = () => {
    if (!upiId || !upiId.includes("@")) {
      toast.error("Please enter a valid UPI ID (e.g. harsha@okaxis)");
      return;
    }
    initiateRazorpay('upi', upiId);
  };

  const isPremium = user?.plan === "premium";

  if (isPremium) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto text-center py-20 px-6">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-24 h-24 rounded-3xl gradient-red flex items-center justify-center mx-auto mb-8 shadow-premium">
            <Crown className="w-12 h-12 text-accent-foreground" />
          </motion.div>
          <h1 className="font-display text-4xl font-bold text-foreground mb-4">Mastery Awaits!</h1>
          <p className="text-xl text-muted-foreground mb-12">You are officially a Brainexa Premium Member.</p>
          <button 
            onClick={() => navigate("/study-plan")}
            className="gradient-purple text-primary-foreground px-10 py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition-all shadow-lg hover:scale-105 active:scale-95"
          >
            Go to Study Planner
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto pb-20 px-4">
        <div className="text-center mb-12 mt-6">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Elevate your learning</h1>
          <p className="text-muted-foreground">Premium features for students who aim for excellence</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Free Plan */}
          <div className="bg-card rounded-3xl p-8 border border-border shadow-sm opacity-80 h-full flex flex-col">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
                <Zap className="w-6 h-6 text-foreground/60" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg">Foundation</h3>
                <p className="text-2xl font-bold text-foreground">Free</p>
              </div>
            </div>
            <ul className="space-y-4 mb-10 flex-grow">
              <li className="flex items-center gap-3 text-sm text-muted-foreground"><Check className="w-4 h-4 text-border" /> Basic AI mentoring</li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground"><Check className="w-4 h-4 text-border" /> Limited quiz attempts (5/day)</li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground"><Check className="w-4 h-4 text-border" /> Basic study plan</li>
            </ul>
            <button disabled className="w-full py-4 rounded-xl border border-border text-muted-foreground font-semibold text-sm">
              Current Plan
            </button>
          </div>

          {/* Premium Plan */}
          <motion.div 
            layout
            whileHover={{ y: -5 }}
            className="bg-card rounded-3xl p-8 border-2 border-accent shadow-premium relative overflow-hidden h-full flex flex-col"
          >
            <div className="absolute top-0 right-0 gradient-red text-accent-foreground text-xs font-black px-6 py-2 rounded-bl-2xl tracking-widest uppercase">
              Best Value
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl gradient-red flex items-center justify-center shadow-lg shadow-accent/20">
                <Crown className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg text-accent">Excellence</h3>
                <p className="text-3xl font-bold text-foreground">₹299 <span className="text-sm font-normal text-muted-foreground">/ month</span></p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!showUpiInput ? (
                <motion.div
                  key="options"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col flex-grow"
                >
                  <ul className="space-y-4 mb-10 flex-grow">
                    <li className="flex items-center gap-3 text-sm font-medium text-foreground"><Check className="w-4 h-4 text-accent" /> Unlimited AI mentoring</li>
                    <li className="flex items-center gap-3 text-sm font-medium text-foreground"><Check className="w-4 h-4 text-accent" /> Unlimited quiz attempts</li>
                    <li className="flex items-center gap-3 text-sm font-medium text-foreground"><Check className="w-4 h-4 text-accent" /> Advanced study plans</li>
                  </ul>
                  
                  <div className="space-y-3">
                    <button
                      onClick={handleStandardPayment}
                      disabled={isLoading}
                      className="w-full gradient-purple text-primary-foreground py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Join Premium <ArrowRight className="w-4 h-4" /></>}
                    </button>
                    
                    <button
                      onClick={() => setShowUpiInput(true)}
                      className="w-full bg-secondary text-foreground py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-secondary/80 transition-all"
                    >
                      <Smartphone className="w-5 h-5 text-accent" /> Send Payment Request to Phone
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="upi-input"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col flex-grow"
                >
                  <div className="mb-6">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Enter Your UPI ID</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="example@okaxis"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full bg-secondary rounded-xl px-5 py-4 font-medium border-2 border-transparent focus:border-accent outline-none transition-all placeholder:opacity-50"
                      />
                      <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 px-1 text-center">We will send a payment request directly to your PhonePe/GPay app.</p>
                  </div>

                  <div className="mt-auto space-y-3">
                    <button
                      onClick={handleUpiCollect}
                      disabled={isLoading}
                      className="w-full gradient-red text-accent-foreground py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send ₹299 Request</>}
                    </button>
                    <button
                      onClick={() => setShowUpiInput(false)}
                      className="w-full text-muted-foreground text-sm font-semibold flex items-center justify-center gap-2 py-2"
                    >
                      <ArrowLeft className="w-4 h-4" /> Other Payment Methods
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="flex items-center gap-6 opacity-30 grayscale grayscale-100">
             <div className="flex items-center gap-2">
               <CreditCard className="w-5 h-5" />
               <span className="text-[10px] font-bold uppercase tracking-widest">Cards</span>
             </div>
             <div className="flex items-center gap-2">
               <Smartphone className="w-5 h-5" />
               <span className="text-[10px] font-bold uppercase tracking-widest">UPI ID</span>
             </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            <p className="text-xs font-medium">Secured by Razorpay. Official Merchant Gateway.</p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showRulesOverlay && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card w-full max-w-2xl rounded-2xl p-8 shadow-2xl border border-border overflow-y-auto max-h-[90vh]"
            >
              <h2 className="font-display text-2xl font-bold mb-4">Terms of Service & Usage Policy</h2>
              <div className="prose prose-sm text-muted-foreground space-y-4 mb-8">
                <p>Welcome to Brainexa Premium. To continue, you must acknowledge and agree to the following rules and functionalities:</p>
                
                <div className="bg-muted/50 p-4 rounded-lg space-y-2 border border-border">
                  <h3 className="font-semibold text-foreground">1. Subscription & Payments</h3>
                  <p>All payments for premium plans and syllabus updates are processed securely via Razorpay. Payments are non-refundable once the service (syllabus generation) is initiated.</p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2 border border-border">
                  <h3 className="font-semibold text-foreground">2. Syllabus Update Rules</h3>
                  <p>Your subscription includes 5 free syllabus updates. Beyond this, a tiered payment rule applies:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>₹50 for the first set of additional updates (6 updates).</li>
                    <li>₹101 for the second set of additional updates (10 updates).</li>
                  </ul>
                  <p>Updates are only counted if you modify subjects, topics, or dates.</p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2 border border-border">
                  <h3 className="font-semibold text-foreground">3. Academic Integrity</h3>
                  <p>Brainexa is an AI learning assistant. Users are responsible for the academic integrity of their own learning. Any illegal or unauthorized redistribution of our content is prohibited.</p>
                </div>

                <p>By clicking "Accept and Continue", you agree to these terms and authorize Brainexa to process your data for generating personalized plans.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowRulesOverlay(false)}
                  className="flex-1 px-6 py-3 rounded-xl border border-border hover:bg-muted transition-all"
                >
                  Read Later
                </button>
                <button
                  onClick={async () => {
                    setIsAccepting(true);
                    await acceptRules();
                    setShowRulesOverlay(false);
                    setIsAccepting(false);
                    toast.success("Rules accepted!");
                    navigate("/study-plan");
                  }}
                  disabled={isAccepting}
                  className="flex-1 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50"
                >
                  {isAccepting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Accept and Continue'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
