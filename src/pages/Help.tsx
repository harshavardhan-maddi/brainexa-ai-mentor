import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, LayoutDashboard, FileText, BookOpen, GraduationCap, MessageSquare, Settings as SettingsIcon, ArrowLeft, Search, RefreshCw, CheckCircle2, User, Check, Type } from "lucide-react";

// Define module info
type ModuleId = "dashboard" | "reports" | "study-plan" | "chat" | "knowledge-base" | "quiz" | "material-generator" | "subjects";

interface ModuleInfo {
  id: ModuleId;
  path: string;
  label: string;
  icon: React.ElementType;
  description: string;
  steps: string[];
  color: string;
}

const modules: ModuleInfo[] = [
  { 
    id: "dashboard",
    path: "/dashboard", 
    label: "Dashboard", 
    icon: LayoutDashboard, 
    description: "Get an overview of your progress and recent activity.",
    steps: ["View your overall progress metrics.", "Check recent activity and study patterns.", "Quickly navigate to active study plans."],
    color: "text-blue-500",
  },
  { 
    id: "reports",
    path: "/reports", 
    label: "Reports", 
    icon: FileText, 
    description: "Download ultra‑premium PDF reports with your performance data.",
    steps: ["Select a date range for your report.", "Click generate to compile data.", "Download your premium PDF report."],
    color: "text-purple-500",
  },
  { 
    id: "study-plan",
    path: "/study-plan", 
    label: "Study Plan", 
    icon: BookOpen, 
    description: "Personalized learning paths tailored to your goals.",
    steps: ["Upload your syllabus or describe your goal.", "Let the AI generate a structured plan.", "Follow daily tasks to stay on track."],
    color: "text-green-500",
  },
  { 
    id: "chat",
    path: "/chat", 
    label: "AI Mentor", 
    icon: MessageSquare, 
    description: "Ask questions and get instant guidance from the AI mentor.",
    steps: ["Type your question in the chat.", "The AI Mentor analyzes your context.", "Receive instant, accurate guidance."],
    color: "text-indigo-500",
  },
  { 
    id: "knowledge-base",
    path: "/knowledge-base", 
    label: "Knowledge Engine", 
    icon: Search, 
    description: "Search the knowledge base for concepts and explanations.",
    steps: ["Search for any topic or concept.", "Review curated explanations and resources.", "Deep dive into specific subjects."],
    color: "text-amber-500",
  },
  { 
    id: "quiz",
    path: "/quiz", 
    label: "Quizzes", 
    icon: GraduationCap, 
    description: "Test your knowledge with adaptive quizzes.",
    steps: ["Select a topic and difficulty level.", "Answer multiple-choice questions.", "Review your score and detailed explanations."],
    color: "text-rose-500",
  },
  { 
    id: "material-generator",
    path: "/material-generator", 
    label: "Material Generator", 
    icon: RefreshCw, 
    description: "Generate study material on the fly for any topic.",
    steps: ["Input a specific topic.", "Customize the depth and format.", "Generate and save the material to your library."],
    color: "text-emerald-500",
  },
  { 
    id: "subjects",
    path: "/subjects", 
    label: "Subjects", 
    icon: BookOpen, 
    description: "Manage your syllabus and track performance across subjects.",
    steps: ["Add your subjects and topics.", "Modify your syllabus anytime.", "View detailed quiz scores and accuracy per subject."],
    color: "text-purple-500",
  },
];

// --- Specific Module Animations ---

const DashboardAnimation = () => (
  <div className="w-full h-full flex flex-col items-center justify-center gap-4">
    <div className="w-full max-w-[200px] flex justify-between items-end h-24 border-b-2 border-l-2 border-primary/20 pb-1 pl-1">
      {[40, 70, 45, 90, 65].map((h, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${h}%` }}
          transition={{ duration: 1, delay: i * 0.2, repeat: Infinity, repeatType: "reverse", repeatDelay: 2 }}
          className="w-6 bg-blue-500 rounded-t-sm"
        />
      ))}
    </div>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.5, duration: 0.5, repeat: Infinity, repeatType: "reverse", repeatDelay: 1.5 }}
      className="bg-card shadow-premium p-3 rounded-xl border border-border w-48 text-center"
    >
      <div className="text-xs text-muted-foreground font-bold">Total Progress</div>
      <div className="text-2xl font-black text-blue-500">85%</div>
    </motion.div>
  </div>
);

const ChatAnimation = () => (
  <div className="w-full h-full flex flex-col justify-end gap-3 p-4">
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 4 }}
      className="self-end bg-primary text-primary-foreground p-3 rounded-2xl rounded-br-sm max-w-[80%] text-sm shadow-sm"
    >
      Can you explain quantum computing?
    </motion.div>
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 1.5, repeat: Infinity, repeatDelay: 4 }}
      className="self-start bg-card border border-border p-3 rounded-2xl rounded-bl-sm max-w-[80%] text-sm shadow-sm flex flex-col gap-2"
    >
      <div>Quantum computing uses qubits...</div>
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: "100%" }}
        transition={{ duration: 1, delay: 2, repeat: Infinity, repeatDelay: 4 }}
        className="h-2 bg-muted rounded-full"
      />
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: "60%" }}
        transition={{ duration: 1, delay: 2.2, repeat: Infinity, repeatDelay: 4 }}
        className="h-2 bg-muted rounded-full"
      />
    </motion.div>
  </div>
);

const StudyPlanAnimation = () => (
  <div className="w-full h-full flex flex-col items-center justify-center gap-3">
    <div className="bg-card shadow-premium border border-border rounded-xl p-4 w-56">
      <div className="font-bold mb-3 border-b border-border pb-2 text-sm text-green-500">Weekly Plan</div>
      {[0, 1, 2].map((i) => (
        <motion.div key={i} className="flex items-center gap-3 mb-2">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.8, duration: 0.3, repeat: Infinity, repeatDelay: 3 }}
            className="text-green-500"
          >
            <CheckCircle2 className="w-4 h-4" />
          </motion.div>
          <div className="h-2 w-full bg-muted rounded-full" />
        </motion.div>
      ))}
    </div>
  </div>
);

const KnowledgeEngineAnimation = () => (
  <div className="w-full h-full flex flex-col items-center justify-start pt-12 gap-6">
    <div className="w-56 bg-card border-2 border-amber-500/50 rounded-full h-10 flex items-center px-4 gap-2 shadow-sm">
      <Search className="w-4 h-4 text-amber-500" />
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: "80%", opacity: 1 }}
        transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", repeatDelay: 2 }}
        className="h-2 bg-muted-foreground/30 rounded-full"
      />
    </div>
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5, duration: 0.5, repeat: Infinity, repeatType: "reverse", repeatDelay: 2 }}
      className="w-64 bg-card border border-border p-4 rounded-xl shadow-premium space-y-3"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20" />
        <div className="space-y-1 flex-1">
          <div className="h-2 w-full bg-muted rounded-full" />
          <div className="h-2 w-2/3 bg-muted rounded-full" />
        </div>
      </div>
    </motion.div>
  </div>
);

const QuizAnimation = () => (
  <div className="w-full h-full flex flex-col items-center justify-center">
    <div className="w-64 bg-card border border-border p-5 rounded-2xl shadow-premium">
      <div className="h-3 w-3/4 bg-muted-foreground/30 rounded-full mb-6 mx-auto" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ backgroundColor: "rgba(0,0,0,0)", borderColor: "var(--border)" }}
            animate={
              i === 1 
                ? { backgroundColor: "rgba(34, 197, 94, 0.1)", borderColor: "rgba(34, 197, 94, 0.5)" } 
                : {}
            }
            transition={{ delay: 2, duration: 0.3, repeat: Infinity, repeatDelay: 3 }}
            className="h-10 border rounded-xl flex items-center px-4"
          >
            <div className="h-2 w-1/2 bg-muted rounded-full" />
            {i === 1 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 2.2, duration: 0.3, repeat: Infinity, repeatDelay: 3 }}
                className="ml-auto"
              >
                <Check className="w-4 h-4 text-green-500" />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

const MaterialGeneratorAnimation = () => (
  <div className="w-full h-full flex flex-col items-center justify-center gap-4">
    <div className="relative w-48 h-56 bg-card border border-border rounded-xl shadow-premium p-4 flex flex-col items-center justify-center overflow-hidden">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 4, ease: "linear", repeat: Infinity }}
        className="absolute -inset-10 border-[20px] border-emerald-500/10 rounded-full border-t-emerald-500/30"
      />
      <RefreshCw className="w-8 h-8 text-emerald-500 mb-4 animate-spin" />
      <div className="space-y-2 w-full z-10">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "100%", opacity: 1 }}
            transition={{ delay: i * 0.4, duration: 0.8, repeat: Infinity, repeatDelay: 3 }}
            className="h-2 bg-emerald-500/20 rounded-full"
          />
        ))}
      </div>
    </div>
  </div>
);

const ReportsAnimation = () => (
  <div className="w-full h-full flex flex-col items-center justify-center">
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse", repeatDelay: 2 }}
      className="w-56 bg-card border border-border rounded-xl shadow-premium p-4 flex flex-col gap-4"
    >
      <div className="flex justify-between items-center border-b border-border pb-2">
        <div className="font-bold text-sm text-purple-500">Performance Report</div>
        <FileText className="w-4 h-4 text-purple-500" />
      </div>
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-muted border-t-purple-500 border-r-purple-500 rotate-45" />
      </div>
      <motion.div
        initial={{ scale: 0.95, opacity: 0.8 }}
        animate={{ scale: 1.05, opacity: 1 }}
        transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
        className="w-full bg-purple-500 text-white text-xs font-bold py-2 rounded-lg text-center mt-2"
      >
        Download PDF
      </motion.div>
    </motion.div>
  </div>
);

const SubjectsAnimation = () => (
  <div className="w-full h-full flex flex-col items-center justify-center gap-4">
    <div className="grid grid-cols-2 gap-2 w-full max-w-[200px]">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.2, duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
          className="bg-card border-2 border-purple-500/20 rounded-xl p-3 flex flex-col gap-2 shadow-sm"
        >
          <div className="w-6 h-6 rounded-lg bg-purple-500/20" />
          <div className="h-1.5 w-full bg-muted rounded-full" />
          <div className="h-1.5 w-2/3 bg-muted rounded-full" />
        </motion.div>
      ))}
    </div>
  </div>
);

const AbstractAnimation = ({ id }: { id: ModuleId }) => {
  return (
    <div className="w-full h-full relative overflow-hidden bg-card/50 rounded-2xl border border-border flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-grid-white/5 bg-[size:20px_20px]" />
      
      {/* Container for the bespoke animation */}
      <div className="relative z-10 w-full h-full p-8 flex items-center justify-center">
        {id === "dashboard" && <DashboardAnimation />}
        {id === "chat" && <ChatAnimation />}
        {id === "study-plan" && <StudyPlanAnimation />}
        {id === "knowledge-base" && <KnowledgeEngineAnimation />}
        {id === "quiz" && <QuizAnimation />}
        {id === "material-generator" && <MaterialGeneratorAnimation />}
        {id === "reports" && <ReportsAnimation />}
        {id === "subjects" && <SubjectsAnimation />}
      </div>
    </div>
  );
};

export default function Help() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleInfo | null>(null);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailto = `mailto:brainexa.ai.support@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.location.href = mailto;
    
    setOpen(false);
    toast.success("Your request has been sent and our executive will contact you very soon.");
    navigate("/dashboard");
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8 min-h-[calc(100vh-4rem)] flex flex-col">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Help Center</h1>
        <p className="text-muted-foreground">Select a module below to see its visual guide, or reach out to support.</p>
      </div>

      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          {!activeModule ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, filter: "blur(2px)" }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
            >
              {modules.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod)}
                  className="group text-left rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-premium hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
                >
                  <div className={`w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${mod.color}`}>
                    <mod.icon className="w-6 h-6" />
                  </div>
                  <h2 className="font-bold text-lg text-foreground mb-2">{mod.label}</h2>
                  <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors flex-1">
                    {mod.description}
                  </p>
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}
              className="bg-card rounded-3xl border border-border shadow-premium overflow-hidden flex flex-col lg:flex-row min-h-[500px]"
            >
              {/* Left Side - Info */}
              <div className="p-6 sm:p-10 lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-border bg-background/50">
                <button 
                  onClick={() => setActiveModule(null)}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground w-fit mb-8 transition-colors bg-muted/50 hover:bg-muted px-3 py-1.5 rounded-full"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Modules
                </button>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center shadow-inner ${activeModule.color}`}>
                    <activeModule.icon className="w-8 h-8" />
                  </div>
                  <h2 className="font-display text-3xl font-bold text-foreground">
                    {activeModule.label}
                  </h2>
                </div>
                
                <p className="text-muted-foreground mb-10 text-lg">
                  {activeModule.description}
                </p>

                <div className="space-y-6 flex-1">
                  <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Usage Steps
                  </h3>
                  <div className="space-y-5">
                    {activeModule.steps.map((step, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + (idx * 0.1) }}
                        key={idx} 
                        className="flex items-start gap-4"
                      >
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-muted ${activeModule.color}`}>
                          {idx + 1}
                        </div>
                        <p className="text-foreground pt-1">{step}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="mt-10 pt-8 border-t border-border">
                  <Button onClick={() => navigate(activeModule.path)} className="w-full sm:w-auto gradient-purple font-bold h-12 px-8 shadow-premium hover:scale-105 transition-transform">
                    Open {activeModule.label}
                  </Button>
                </div>
              </div>

              {/* Right Side - Unique Animation Visualizer */}
              <div className="lg:w-1/2 bg-muted/20 p-6 sm:p-10 flex items-center justify-center">
                <AbstractAnimation id={activeModule.id} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Support section */}
      <section className="pt-8 border-t border-border mt-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-card p-8 rounded-3xl border border-border shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="relative z-10">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Still need help?</h2>
            <p className="text-muted-foreground">Our support team is available to assist you with any questions, refunds, or issues.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="relative z-10 flex items-center gap-2 gradient-purple text-primary-foreground shadow-premium whitespace-nowrap h-12 px-8 font-bold hover:scale-105 transition-transform">
                <Mail className="w-5 h-5" />
                Contact Support
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display font-bold">Contact Support</DialogTitle>
                <DialogDescription className="text-base">
                  Send us a message and we'll reply to <span className="font-bold text-foreground">brainexa.ai.support@gmail.com</span>.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-5 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground" htmlFor="subject">
                    Subject
                  </label>
                  <input
                    id="subject"
                    type="text"
                    placeholder="E.g., Refund request, Module confusion..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    className="w-full rounded-xl border border-input bg-background px-4 py-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-shadow"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground" htmlFor="message">
                    How can we help?
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    placeholder="Describe your issue or request in detail..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    className="w-full rounded-xl border border-input bg-background px-4 py-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm resize-none transition-shadow"
                  />
                </div>
                <DialogFooter className="pt-2">
                  <Button type="submit" className="w-full gradient-purple font-bold h-12 shadow-premium hover:scale-[1.02] transition-transform">
                    Send Request
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </div>
  );
}
