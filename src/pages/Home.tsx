import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { 
  LayoutDashboard, FileText, BookOpen, GraduationCap, 
  MessageSquare, Settings as SettingsIcon, Search, RefreshCw, 
  HelpCircle, ArrowRight, X, PlayCircle, CheckCircle2, Check,
  TrendingUp, Users, Award, Shield, ChevronDown, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Define module info
type ModuleId = "dashboard" | "reports" | "study-plan" | "chat" | "knowledge-base" | "quiz" | "material-generator" | "subjects";

interface ModuleInfo {
  id: ModuleId;
  path: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgGradient: string;
  position: { top: string; left: string; mobileOrder: number };
}

const modules: ModuleInfo[] = [
  { 
    id: "subjects",
    path: "/subjects", 
    label: "Subjects", 
    icon: BookOpen, 
    color: "text-purple-400",
    bgGradient: "from-purple-500/20 to-purple-500/5",
    position: { top: "25%", left: "50%", mobileOrder: 0 }
  },
  { 
    id: "study-plan",
    path: "/study-plan", 
    label: "Study Plan", 
    icon: BookOpen, 
    color: "text-emerald-400",
    bgGradient: "from-emerald-500/20 to-emerald-500/5",
    position: { top: "15%", left: "20%", mobileOrder: 1 }
  },
  { 
    id: "chat",
    path: "/chat", 
    label: "AI Mentor", 
    icon: MessageSquare, 
    color: "text-indigo-400",
    bgGradient: "from-indigo-500/20 to-indigo-500/5",
    position: { top: "8%", left: "50%", mobileOrder: 2 }
  },
  { 
    id: "knowledge-base",
    path: "/knowledge-base", 
    label: "Knowledge Engine", 
    icon: Search, 
    color: "text-amber-400",
    bgGradient: "from-amber-500/20 to-amber-500/5",
    position: { top: "15%", left: "80%", mobileOrder: 3 }
  },
  { 
    id: "quiz",
    path: "/quiz", 
    label: "Smart Quizzes", 
    icon: GraduationCap, 
    color: "text-rose-400",
    bgGradient: "from-rose-500/20 to-rose-500/5",
    position: { top: "50%", left: "10%", mobileOrder: 4 }
  },
  { 
    id: "material-generator",
    path: "/material-generator", 
    label: "Material Gen", 
    icon: RefreshCw, 
    color: "text-cyan-400",
    bgGradient: "from-cyan-500/20 to-cyan-500/5",
    position: { top: "50%", left: "90%", mobileOrder: 5 }
  },
  { 
    id: "reports",
    path: "/reports", 
    label: "Elite Reports", 
    icon: FileText, 
    color: "text-fuchsia-400",
    bgGradient: "from-fuchsia-500/20 to-fuchsia-500/5",
    position: { top: "85%", left: "20%", mobileOrder: 6 }
  },
  { 
    id: "dashboard",
    path: "/dashboard", 
    label: "Dashboard", 
    icon: LayoutDashboard, 
    color: "text-blue-400",
    bgGradient: "from-blue-500/20 to-blue-500/5",
    position: { top: "85%", left: "80%", mobileOrder: 8 }
  },
];

// --- Pure Visual Animations (No Text Steps) ---
const DashboardVisual = () => (
  <div className="w-full h-full flex flex-col items-center justify-center gap-8 p-4">
    <div className="w-full max-w-[300px] flex justify-between items-end h-40 border-b-4 border-l-4 border-primary/30 pb-2 pl-2 rounded-bl-xl">
      {[40, 70, 45, 90, 65, 80].map((h, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${h}%` }}
          transition={{ duration: 1.5, delay: i * 0.2, ease: "easeOut" }}
          className="w-8 bg-blue-500 rounded-t-md shadow-[0_0_15px_rgba(59,130,246,0.5)]"
        />
      ))}
    </div>
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 2, duration: 0.5, type: "spring" }}
      className="bg-card shadow-premium p-6 rounded-2xl border border-blue-500/30 w-64 text-center"
    >
      <div className="text-4xl font-black text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]">85%</div>
    </motion.div>
  </div>
);

const ChatVisual = () => (
  <div className="w-full h-full flex flex-col justify-end gap-6 p-8 max-w-[500px] mx-auto">
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="self-end bg-indigo-500 text-white p-5 rounded-3xl rounded-br-sm w-[80%] shadow-lg"
    >
      <div className="h-3 bg-white/50 w-3/4 rounded-full mb-3" />
      <div className="h-3 bg-white/50 w-1/2 rounded-full" />
    </motion.div>
    
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: 1 }}
      className="self-start bg-card border-2 border-indigo-500/30 p-5 rounded-3xl rounded-bl-sm w-[90%] shadow-premium flex flex-col gap-4"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-indigo-500/20 animate-pulse" />
        <div className="h-3 bg-indigo-500/50 w-1/4 rounded-full" />
      </div>
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: "100%" }}
        transition={{ duration: 1.5, delay: 1.5, ease: "easeOut" }}
        className="h-3 bg-muted rounded-full"
      />
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: "80%" }}
        transition={{ duration: 1.5, delay: 1.8, ease: "easeOut" }}
        className="h-3 bg-muted rounded-full"
      />
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: "60%" }}
        transition={{ duration: 1.5, delay: 2.1, ease: "easeOut" }}
        className="h-3 bg-muted rounded-full"
      />
    </motion.div>
  </div>
);

const StudyPlanVisual = () => (
  <div className="w-full h-full flex flex-col items-center justify-center gap-4">
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-card shadow-premium border-2 border-emerald-500/30 rounded-3xl p-8 w-80 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
      <div className="h-4 w-1/3 bg-emerald-500/30 rounded-full mb-8" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 mb-5">
          <motion.div
            initial={{ scale: 0, backgroundColor: "transparent", borderColor: "var(--border)" }}
            animate={{ scale: 1, backgroundColor: "rgba(16, 185, 129, 0.2)", borderColor: "rgba(16, 185, 129, 1)" }}
            transition={{ delay: 0.5 + (i * 0.8), duration: 0.4, type: "spring" }}
            className="w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8 + (i * 0.8) }}
            >
              <Check className="w-4 h-4 text-emerald-500 font-bold" />
            </motion.div>
          </motion.div>
          <div className="flex-1 space-y-2">
            <motion.div 
              initial={{ opacity: 0.3 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + (i * 0.8) }}
              className="h-3 w-full bg-muted rounded-full" 
            />
            <motion.div 
              initial={{ opacity: 0.3 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + (i * 0.8) }}
              className="h-2 w-1/2 bg-muted-foreground/20 rounded-full" 
            />
          </div>
        </div>
      ))}
    </motion.div>
  </div>
);

const KnowledgeEngineVisual = () => (
  <div className="w-full h-full flex flex-col items-center justify-start pt-20 gap-8">
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-80 bg-card border-2 border-amber-500 rounded-full h-16 flex items-center px-6 gap-4 shadow-[0_0_30px_rgba(245,158,11,0.2)]"
    >
      <Search className="w-6 h-6 text-amber-500" />
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: "70%" }}
        transition={{ duration: 1.5, delay: 0.5, ease: "linear" }}
        className="h-3 bg-foreground rounded-full"
      />
    </motion.div>
    <div className="flex flex-col gap-4">
      {[0, 1].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5 + (i * 0.5), duration: 0.5 }}
          className="w-96 bg-card border border-amber-500/20 p-6 rounded-2xl shadow-premium flex gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 animate-pulse flex-shrink-0" />
          <div className="space-y-3 flex-1 pt-1">
            <div className="h-3 w-full bg-muted rounded-full" />
            <div className="h-3 w-5/6 bg-muted rounded-full" />
            <div className="h-3 w-4/6 bg-muted rounded-full" />
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

const QuizVisual = () => (
  <div className="w-full h-full flex flex-col items-center justify-center">
    <motion.div 
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="w-96 bg-card border-2 border-rose-500/20 p-8 rounded-3xl shadow-premium relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 h-2 bg-rose-500 w-1/3" />
      <div className="h-4 w-full bg-muted-foreground/30 rounded-full mb-4" />
      <div className="h-4 w-3/4 bg-muted-foreground/30 rounded-full mb-10" />
      
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ backgroundColor: "rgba(0,0,0,0)", borderColor: "var(--border)" }}
            animate={
              i === 1 
                ? { backgroundColor: "rgba(244, 63, 94, 0.1)", borderColor: "rgba(244, 63, 94, 0.8)", scale: 1.02 } 
                : {}
            }
            transition={{ delay: 1.5, duration: 0.4 }}
            className="h-14 border-2 rounded-2xl flex items-center px-6 relative overflow-hidden cursor-pointer"
          >
            <div className="h-3 w-2/3 bg-muted rounded-full" />
            {i === 1 && (
              <motion.div
                initial={{ scale: 0, x: 20 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ delay: 2, type: "spring" }}
                className="ml-auto w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center"
              >
                <Check className="w-5 h-5 text-white" />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  </div>
);

const MaterialGeneratorVisual = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="relative w-80 h-96 bg-card border-2 border-cyan-500/30 rounded-3xl shadow-[0_0_40px_rgba(6,182,212,0.15)] p-8 flex flex-col items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, ease: "linear", repeat: Infinity }}
        className="absolute -inset-10 border-[40px] border-cyan-500/5 rounded-full border-t-cyan-500/40"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 5, ease: "linear", repeat: Infinity }}
        className="absolute -inset-20 border-[2px] border-dashed border-cyan-500/20 rounded-full"
      />
      <RefreshCw className="w-16 h-16 text-cyan-500 mb-8 z-10" />
      <div className="space-y-4 w-full z-10">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "100%", opacity: 1 }}
            transition={{ delay: i * 0.5, duration: 0.8 }}
            className="h-3 bg-cyan-500/40 rounded-full"
          />
        ))}
      </div>
    </div>
  </div>
);

const ReportsVisual = () => (
  <div className="w-full h-full flex items-center justify-center">
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="w-80 bg-card border-2 border-fuchsia-500/30 rounded-3xl shadow-premium p-8 flex flex-col items-center gap-8"
    >
      <div className="flex justify-between items-center w-full border-b-2 border-border pb-4">
        <div className="h-4 w-1/2 bg-fuchsia-500/30 rounded-full" />
        <FileText className="w-8 h-8 text-fuchsia-500" />
      </div>
      
      <div className="relative w-40 h-40">
        <motion.div 
          initial={{ rotate: -90, pathLength: 0 }}
          animate={{ rotate: -90, pathLength: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="w-full h-full rounded-full border-[16px] border-muted border-t-fuchsia-500 border-r-fuchsia-500"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2, type: "spring" }}
          className="absolute inset-0 flex items-center justify-center text-3xl font-black text-fuchsia-500"
        >
          A+
        </motion.div>
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 2.5, type: "spring" }}
        className="w-full bg-fuchsia-500 text-white font-bold py-4 rounded-xl text-center shadow-[0_10px_20px_rgba(217,70,239,0.3)]"
      >
        Exporting...
      </motion.div>
    </motion.div>
  </div>
);

const SubjectsVisual = () => (
  <div className="w-full h-full flex flex-col items-center justify-center p-8 gap-6">
    <div className="grid grid-cols-2 gap-4 w-full max-w-[350px]">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ delay: i * 0.2, duration: 0.5 }}
          className="bg-card border-2 border-purple-500/30 rounded-2xl p-4 flex flex-col gap-3 shadow-lg shadow-purple-500/10"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 animate-pulse" />
          <div className="space-y-2">
            <div className="h-2 w-full bg-muted rounded-full" />
            <div className="h-2 w-2/3 bg-muted rounded-full" />
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="h-1.5 w-12 bg-purple-500/30 rounded-full" />
            <div className="h-1.5 w-6 bg-purple-500/30 rounded-full" />
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

const VisualizerMap: Record<ModuleId, React.FC> = {
  dashboard: DashboardVisual,
  chat: ChatVisual,
  "study-plan": StudyPlanVisual,
  "knowledge-base": KnowledgeEngineVisual,
  quiz: QuizVisual,
  "material-generator": MaterialGeneratorVisual,
  reports: ReportsVisual,
  subjects: SubjectsVisual,
};

export default function Home() {
  const { studyPlan } = useStore();
  const navigate = useNavigate();
  const [activeVisualizer, setActiveVisualizer] = useState<ModuleInfo | null>(null);

  const hasStartedLearning = studyPlan.length > 0;

  return (
    <div className="flex flex-col relative bg-background overflow-x-hidden">
      {/* SECTION 1: The Constellation Hero (Full Screen) */}
      <div className="min-h-[calc(100vh-4rem)] flex flex-col relative">
        {/* Top Header Section */}
        <div className="absolute top-6 inset-x-0 flex items-center justify-between z-40 px-8">
          {/* Logo Top Left */}
          <div className="flex items-center gap-3">
            <img 
              src="/brainexalogo.png" 
              alt="Brainexa Logo" 
              className="w-12 h-12 object-contain drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]"
            />
            <span className="font-display font-black text-2xl text-foreground tracking-tight">
              Brainexa
            </span>
          </div>

          {/* Help Section Top Right */}
          <Link 
            to="/help" 
            className="flex items-center gap-2 bg-card/80 backdrop-blur-md border border-border shadow-premium px-6 py-3 rounded-full hover:scale-105 transition-transform duration-300 group"
          >
            <HelpCircle className="w-5 h-5 text-primary group-hover:rotate-12 transition-transform" />
            <span className="font-bold text-foreground hidden sm:inline">Help & Support Center</span>
            <span className="font-bold text-foreground sm:hidden">Help</span>
          </Link>
        </div>

        {/* Main Container */}
        <div className="flex-1 relative flex flex-col md:block items-center justify-start md:justify-center p-4 min-h-[600px] mt-24 md:mt-16 overflow-y-auto md:overflow-hidden">
          
        {/* Dynamic Center CTA */}
        <div className="relative z-20 flex flex-col items-center md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 mb-12 md:mb-0">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/study-plan")}
              className="relative overflow-hidden group rounded-full p-[4px]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-primary animate-gradient-x opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-background px-12 py-6 rounded-full flex items-center gap-3">
                <PlayCircle className="w-8 h-8 text-primary group-hover:text-purple-500 transition-colors" />
                <span className="font-display font-black text-3xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
                  {hasStartedLearning ? "Resume Learning" : "Start Learning"}
                </span>
              </div>
            </motion.button>
          </div>
        </div>

          {/* Scattered Feature Nodes */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {modules.map((mod, index) => {
              // Add a subtle floating animation to each node
              const floatY = [0, -15, 0, 15, 0];
              const floatX = [0, 10, 0, -10, 0];
              const duration = 8 + (index % 4) * 2;

              return (
                <motion.div
                  key={mod.id}
                  animate={{ y: floatY, x: floatX }}
                  transition={{ duration, repeat: Infinity, ease: "easeInOut", delay: index * 0.5 }}
                  className="absolute pointer-events-auto hidden md:flex"
                  style={{ top: mod.position.top, left: mod.position.left, transform: "translate(-50%, -50%)" }}
                >
                  <button
                    onClick={() => setActiveVisualizer(mod)}
                    className="group relative flex flex-col items-center gap-3 hover:-translate-y-2 transition-transform duration-300"
                  >
                    <div className={`w-20 h-20 rounded-[2rem] bg-card border-2 border-border shadow-premium flex items-center justify-center group-hover:border-primary/50 group-hover:shadow-[0_0_30px_rgba(var(--primary),0.3)] transition-all duration-300 relative overflow-hidden`}>
                      <div className={`absolute inset-0 bg-gradient-to-br ${mod.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                      <mod.icon className={`w-10 h-10 relative z-10 ${mod.color} group-hover:scale-110 transition-transform duration-300`} />
                    </div>
                    <span className="font-bold text-sm text-foreground/70 group-hover:text-foreground bg-background/50 backdrop-blur-sm px-3 py-1 rounded-full border border-border/50">
                      {mod.label}
                    </span>
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* Mobile Grid Fallback (Hidden on md and up) */}
          <div className="w-full max-w-md mx-auto md:hidden pointer-events-auto flex flex-wrap justify-center gap-4 content-start pb-24 z-10">
             {modules.map((mod) => (
               <button
                 key={mod.id}
                 onClick={() => setActiveVisualizer(mod)}
                 className="w-[calc(50%-8px)] sm:w-[calc(33%-11px)] bg-card border border-border rounded-3xl p-4 flex flex-col items-center gap-2 shadow-sm hover:scale-105 transition-transform"
               >
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-muted ${mod.color}`}>
                   <mod.icon className="w-7 h-7" />
                 </div>
                 <span className="font-bold text-xs text-center">{mod.label}</span>
               </button>
             ))}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center text-muted-foreground animate-bounce hidden md:flex">
          <span className="text-xs font-bold uppercase tracking-widest mb-2">Scroll</span>
          <ChevronDown className="w-5 h-5" />
        </div>
      </div>

      {/* SECTION 2: Impact & Statistics */}
      <section className="py-24 bg-card/50 border-y border-border relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-display font-black text-foreground">
              Proven Results. <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">Elite Performance.</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join the thousands of students who have transformed their academic journey using Brainexa's AI ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Users, stat: "10k+", label: "Active Students", desc: "Trust Brainexa for their daily academic needs." },
              { icon: TrendingUp, stat: "90%", label: "Grade Improvement", desc: "Of our users report significantly better results." },
              { icon: Award, stat: "#1", label: "AI Study Platform", desc: "Ranked top for personalized educational AI." }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="bg-background border border-border rounded-3xl p-8 text-center shadow-premium hover:-translate-y-2 transition-transform duration-300"
              >
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                  <item.icon className="w-8 h-8 text-primary" />
                </div>
                <div className="text-5xl font-black font-display text-foreground mb-2">{item.stat}</div>
                <div className="text-lg font-bold text-foreground mb-3">{item.label}</div>
                <p className="text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: About Brainexa */}
      <section className="py-32 max-w-7xl mx-auto px-4 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-500 font-bold text-sm">
              <Shield className="w-4 h-4" />
              <span>The Brainexa Advantage</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-display font-black text-foreground leading-[1.1]">
              Engineered for the <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-500">Ambitious Mind.</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Brainexa isn't just another study tool. It is an elite, interconnected ecosystem designed to hyper-accelerate your learning process. From dynamic study plans that adapt to your schedule, to a Knowledge Engine that instantly retrieves complex answers, every module is built to save you time and maximize retention.
            </p>
            <ul className="space-y-4">
              {[
                "24/7 Context-Aware AI Mentor",
                "Automated Elite PDF Performance Reports",
                "Instant Note & Material Generation",
                "Adaptive Smart Quizzes"
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-foreground font-medium">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button onClick={() => navigate("/study-plan")} className="gradient-purple h-14 px-8 rounded-full shadow-premium text-lg font-bold mt-4 hover:scale-105 transition-transform">
              Keep Learning
            </Button>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-purple-500/20 blur-3xl rounded-[3rem]" />
            <div className="relative bg-card border border-border rounded-[3rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] aspect-square flex flex-col items-center justify-center overflow-hidden">
               {/* Abstract decorative graphic representing the "Ecosystem" */}
               <motion.div 
                 animate={{ rotate: 360 }} 
                 transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                 className="absolute w-[150%] h-[150%] border border-primary/10 rounded-full"
               />
               <motion.div 
                 animate={{ rotate: -360 }} 
                 transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                 className="absolute w-[100%] h-[100%] border border-purple-500/10 rounded-full"
               />
               <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-purple-500 shadow-[0_0_50px_rgba(var(--primary),0.5)] flex items-center justify-center relative z-10">
                 <Sparkles className="w-12 h-12 text-white" />
               </div>
               <h3 className="text-2xl font-bold font-display text-foreground mt-8 relative z-10">The Ecosystem</h3>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-border bg-card/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-display font-black text-xl leading-none">B</span>
            </div>
            <span className="font-display font-bold text-xl text-foreground tracking-tight">
              Brainexa
            </span>
          </div>
          
          <div className="text-sm font-medium text-muted-foreground">
            Copyright © {new Date().getFullYear()} <span className="text-foreground">Brainexa Team</span>. All rights reserved.
          </div>
          
          <div className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link to="/help" className="hover:text-primary transition-colors">Help Center</Link>
            <span className="cursor-pointer hover:text-primary transition-colors">Privacy Policy</span>
            <span className="cursor-pointer hover:text-primary transition-colors">Terms of Service</span>
          </div>
        </div>
      </footer>

      {/* Pure Visual Animation Overlay Modal */}
      <AnimatePresence>
        {activeVisualizer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xl p-4 sm:p-8"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-5xl h-[80vh] bg-card/90 border border-border rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col relative"
            >
              {/* Header */}
              <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-20 bg-gradient-to-b from-card to-transparent pointer-events-none">
                <div className="flex items-center gap-4 pointer-events-auto">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-card shadow-inner border border-border ${activeVisualizer.color}`}>
                    <activeVisualizer.icon className="w-8 h-8" />
                  </div>
                  <h2 className="font-display font-bold text-3xl text-foreground drop-shadow-md">
                    {activeVisualizer.label} Overview
                  </h2>
                </div>
                <button
                  onClick={() => setActiveVisualizer(null)}
                  className="w-12 h-12 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center transition-colors pointer-events-auto"
                >
                  <X className="w-6 h-6 text-foreground" />
                </button>
              </div>

              {/* The Visual Simulation Component */}
              <div className="flex-1 w-full h-full pt-20 pb-24 relative z-10 overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-muted/30 via-transparent to-transparent">
                {(() => {
                  const VisualizerComponent = VisualizerMap[activeVisualizer.id];
                  return <VisualizerComponent />;
                })()}
              </div>

              {/* Footer CTA */}
              <div className="absolute bottom-0 inset-x-0 p-8 flex justify-center z-20 bg-gradient-to-t from-card via-card/80 to-transparent pointer-events-none">
                 <Button 
                   onClick={() => navigate(activeVisualizer.path)}
                   className="h-14 px-10 text-lg rounded-full font-bold shadow-premium hover:scale-105 transition-transform pointer-events-auto bg-foreground text-background hover:bg-foreground/90"
                 >
                   Launch {activeVisualizer.label} <ArrowRight className="w-5 h-5 ml-2" />
                 </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
