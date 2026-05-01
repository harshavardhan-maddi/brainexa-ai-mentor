import AppLayout from "@/components/AppLayout";
import { useMemo, useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { motion } from "framer-motion";
import { 
  BookOpen, Brain, Target, TrendingUp, MessageSquare, 
  Award, GraduationCap, FileText, Download, Loader2, Calendar
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ProgressReport } from "../components/ProgressReport";
import { downloadProgressPDF } from "@/lib/pdf-export";
import { toast } from "sonner";
import TermsModal from "@/components/TermsModal";

const fadeIn = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

export default function Dashboard() {
  const store = useStore();
  const { user, quizResults = [], studyProgress = 0, chatHistory = [], studyPlan = [], studentSubjects = [], acceptRules } = store || {};
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    if (user && user.rulesAccepted === false) {
      setShowTerms(true);
    }
  }, [user]);

  const handleAcceptTerms = async () => {
    if (acceptRules) {
      await acceptRules();
      setShowTerms(false);
      toast.success("Welcome to Brainexa Premium!");
    }
  };

  // Loading state - wait for user data
  if (!user?.id) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto pb-12 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Loading Dashboard...</h2>
            <p className="text-muted-foreground">Please wait while we fetch your data</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Date range for filtering insights
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(sevenDaysAgo);
  const [dateTo, setDateTo] = useState(today);

  // Filter quiz results by date range (SAFE)
  const filteredResults = useMemo(() => {
    return (quizResults || []).filter(r => {
      if (!r?.date) return true;
      try {
        const d = r.date.split('T')[0];
        return d >= dateFrom && d <= dateTo;
      } catch {
        return false;
      }
    });
  }, [quizResults, dateFrom, dateTo]);

  const totalQuizzes = filteredResults.length;
  const avgScore = totalQuizzes > 0
    ? Math.round(filteredResults.reduce((s, r) => s + (r.score / r.total) * 100, 0) / totalQuizzes)
    : 0;

  const weakAreas = totalQuizzes > 0
    ? (() => {
        const areas = filteredResults.flatMap((r) => 
          r.weakTopics.map((wt) => ({ topic: wt, subject: r.subject }))
        );
        const uniqueAreas = areas.filter(
          (area, index, self) => 
            index === self.findIndex((a) => a.topic === area.topic && a.subject === area.subject)
        );
        return uniqueAreas.slice(0, 5);
      })()
    : [];

  const quizChartData = filteredResults.slice(-10).map((r) => ({
    name: r.topic.slice(0, 10),
    score: Math.round((r.score / r.total) * 100),
  }));

  const pieData = [
    { name: "Completed", value: studyProgress },
    { name: "Remaining", value: 100 - studyProgress },
  ];
  const pieColors = ["hsl(262, 80%, 50%)", "hsl(240, 10%, 94%)"];

  const stats = [
    { label: "Study Progress", value: `${studyProgress}%`, icon: TrendingUp, color: "gradient-purple" },
    { label: "Quizzes in Range", value: totalQuizzes, icon: Target, color: "gradient-red" },
    { label: "Avg Score", value: `${avgScore}%`, icon: Award, color: "gradient-purple" },
    { label: "AI Chats", value: chatHistory.filter((c) => c.role === "user").length, icon: MessageSquare, color: "gradient-red" },
  ];

  const handleDownloadReport = async () => {
    setIsGenerating(true);
    toast.info(`Generating report (${dateFrom} → ${dateTo})...`);
    setTimeout(async () => {
      try {
        await downloadProgressPDF("progress-report-pdf", `Brainexa_Report_${dateFrom}_to_${dateTo}_${user?.name || 'Student'}`);
        toast.success(`Report downloaded successfully!`);
      } catch (err) {
        toast.error("Failed to generate report. Please try again.");
      } finally {
        setIsGenerating(false);
      }
    }, 500);
  }; 

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto pb-12">
        <TermsModal isOpen={showTerms} onAccept={handleAcceptTerms} />
        
        {/* Hidden Report Template (Rendered only for PDF capture) */}
        <div className="fixed left-[-9999px] top-[-9999px] pointer-events-none">
           <ProgressReport 
             user={user} 
             period={`${dateFrom} to ${dateTo}`} 
             quizResults={filteredResults} 
             studyProgress={studyProgress} 
             studentSubjects={studentSubjects} 
           />
        </div>

        <motion.div {...fadeIn(0)} className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-bold text-foreground mb-2">
              Welcome back, {user?.name || "Student"}
            </h1>
            <p className="text-muted-foreground font-medium">
              Class: {user?.plan === "premium" ? "Premium Mastery" : "Standard Learner"} • Overview
            </p>
          </div>

          {/* Actions Section */}
          <div className="flex flex-wrap items-center gap-3">
             {/* Premium Library Button */}
             {user?.plan === 'premium' && (
               <div className="flex items-center gap-2">
                 <Button 
                   onClick={() => navigate('/materials')}
                   className="rounded-xl h-12 px-6 gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-orange-200/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                 >
                   <BookOpen className="w-4 h-4 shadow-sm" />
                   <span>Read Material</span>
                 </Button>
                 <Button 
                   onClick={() => navigate('/knowledge-base')}
                   className="rounded-xl h-12 px-6 gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-purple-200/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                 >
                   <Brain className="w-4 h-4 shadow-sm" />
                   <span>Knowledge Engine</span>
                 </Button>
               </div>
             )}

             {/* Date Range Filter + Download */}
             <div className="flex items-center gap-2 bg-card border border-border/50 rounded-xl px-3 py-2 shadow-sm">
               <Calendar className="w-4 h-4 text-primary shrink-0" />
               <input
                 type="date"
                 value={dateFrom}
                 max={dateTo}
                 onChange={e => setDateFrom(e.target.value)}
                 className="text-xs font-semibold bg-transparent border-none outline-none text-foreground cursor-pointer"
               />
               <span className="text-muted-foreground text-xs">→</span>
               <input
                 type="date"
                 value={dateTo}
                 min={dateFrom}
                 onChange={e => setDateTo(e.target.value)}
                 className="text-xs font-semibold bg-transparent border-none outline-none text-foreground cursor-pointer"
               />
             </div>
             <Button 
               onClick={handleDownloadReport}
               variant="outline" 
               className="rounded-xl h-12 px-6 gap-2 border-primary/20 hover:bg-primary/5 font-bold transition-all"
               disabled={isGenerating}
             >
               {isGenerating ? (
                 <Loader2 className="w-4 h-4 animate-spin text-primary" />
               ) : (
                 <Download className="w-4 h-4 text-primary" />
               )}
               <span>Download Report</span>
             </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div {...fadeIn(0.1)} className="mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                {...fadeIn(0.15 + i * 0.05)}
                className="bg-card rounded-2xl p-6 shadow-premium border border-border/40 hover:shadow-2xl transition-all hover:-translate-y-1 group"
              >
                <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <p className="text-3xl font-black text-foreground mb-1">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Quiz Performance */}
          <motion.div {...fadeIn(0.3)} className="bg-card rounded-2xl p-8 shadow-premium border border-border/40">
            <h2 className="font-display text-xl font-black text-foreground mb-6 uppercase tracking-widest text-[11px]">📊 Quiz Performance</h2>
            {quizChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={quizChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="score" fill="hsl(262, 80%, 50%)" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-72 flex items-center justify-center bg-muted/30 rounded-2xl border border-dashed border-border/60">
                <div className="text-center">
                  <Target className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-sm font-bold text-muted-foreground">No quizzes yet</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-widest">Master a topic to see stats</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Study Progress */}
          <motion.div {...fadeIn(0.35)} className="bg-card rounded-2xl p-8 shadow-premium border border-border/40">
            <h2 className="font-display text-xl font-black text-foreground mb-6 uppercase tracking-widest text-[11px]">📈 Syllabus Mastery</h2>
            {studyPlan.length > 0 ? (
              <div className="flex flex-col items-center justify-center h-full pb-8">
                <div className="relative w-48 h-48 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                        {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-3xl font-black text-foreground">{studyProgress}%</span>
                     <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Mastered</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full px-4">
                    {pieData.map((entry, i) => (
                      <div key={i} className="flex flex-col items-center p-3 bg-muted/30 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                           <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: pieColors[i] }} />
                           <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{entry.name}</span>
                        </div>
                        <span className="font-bold text-sm">{entry.value}%</span>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center bg-muted/30 rounded-2xl border border-dashed border-border/60">
                <div className="text-center">
                  <GraduationCap className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-sm font-bold text-muted-foreground">No study plan</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-widest">Create a plan to start</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Areas to Improve */}
          <motion.div {...fadeIn(0.4)} className="bg-gradient-to-br from-red-50/50 to-orange-50/50 rounded-2xl p-8 shadow-premium border border-orange-100/50">
            <h2 className="font-display text-xl font-black text-foreground mb-6 flex items-center gap-2 uppercase tracking-widest text-[11px]">
              <Brain className="w-4 h-4 text-orange-500" />
              Strategic Focus Points
            </h2>
            {weakAreas.length > 0 ? (
              <div className="space-y-4">
                {weakAreas.map((area, i) => (
                  <div key={i} className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-orange-100 hover:shadow-md transition-all active:scale-[0.98]">
                    <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse" />
                    <span className="font-bold text-sm text-slate-800 flex-1">
                      {area.topic}
                      <div className="text-xs opacity-75 font-normal block mt-0.5">{area.subject}</div>
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-orange-50 text-orange-600 hover:bg-orange-100" 
                      onClick={() => navigate(`/quiz?subject=${encodeURIComponent(area.subject)}&topic=${encodeURIComponent(area.topic)}`)}
                    >
                      Re-Master
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-muted-foreground">
                <div className="text-center opacity-60">
                  <Award className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">No Weak Areas Found</p>
                  <p className="text-[10px] mt-2">You are performing exceptionally well!</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Current Subjects */}
          <motion.div {...fadeIn(0.45)} className="bg-card rounded-2xl p-8 shadow-premium border border-border/40">
            <h2 className="font-display text-xl font-black text-foreground mb-6 uppercase tracking-widest text-[11px]">📚 Academic Focus</h2>
            {studentSubjects.length > 0 ? (
              <div className="space-y-4">
                {studentSubjects.slice(0, 4).map((subject, idx) => {
                  const progress = Math.round((subject.topics.filter(t => t.questionsAttempted > 0).length / subject.topics.length) * 100);
                  
                  return (
                    <div key={idx} className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-transparent hover:border-primary/10 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 gradient-purple rounded-xl flex items-center justify-center shadow-sm">
                          <span className="text-sm font-black text-primary-foreground">{subject.subject.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground">{subject.subject}</p>
                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{subject.topics.length} Lessons</p>
                        </div>
                      </div>
                      <div className="text-right min-w-[100px]">
                        <div className="h-1.5 w-full bg-muted rounded-full mb-2 overflow-hidden border border-border/10">
                          <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">{progress}% Mastery</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center bg-muted/30 rounded-2xl border border-dashed border-border/60">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-sm font-bold text-muted-foreground">Academic Focus empty</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-widest">Select subjects from planner</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Recent AI Chats */}
          <motion.div {...fadeIn(0.5)} className="bg-card rounded-2xl p-8 shadow-premium border border-border/40 lg:col-span-2">
            <h2 className="font-display text-xl font-black text-foreground mb-6 uppercase tracking-widest text-[11px]">💬 Mentor Insights History</h2>
            {chatHistory.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {chatHistory.filter(c => c.role === 'user').slice(-4).reverse().map(msg => (
                  <div key={msg.id} className="flex flex-col p-5 bg-muted/30 rounded-2xl border border-transparent hover:border-primary/10 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                       <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/5 px-2 py-1 rounded-md">Deep Doubt Clarified</span>
                       <span className="text-[9px] text-muted-foreground font-bold">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm font-bold text-foreground line-clamp-2 leading-relaxed group-hover:text-primary transition-colors">{msg.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center bg-muted/30 rounded-2xl border border-dashed border-border/60">
                <div className="text-center opacity-40">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No Insights Found</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
