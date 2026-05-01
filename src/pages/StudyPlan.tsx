import { useState, useEffect, useRef, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { useStore, StudentSubject } from "@/lib/store";
import { generateStudyPlan, isAIConfigured, getAIProvider } from "@/lib/ai";
import { motion } from "framer-motion";

import { BookOpen, Plus, Trash2, Sparkles, CheckSquare, Square, ChevronDown, ChevronRight, X, Loader2, Target, CheckCircle2, XCircle, AlertTriangle, Camera, PartyPopper, Crown, Layout, ArrowRight, RefreshCw, Lock } from "lucide-react";
import { generateTopicQuiz, QuizQuestion } from "@/lib/ai";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { LoadingStatus } from "@/components/LoadingStatus";
import { Link, useNavigate } from "react-router-dom";

export default function StudyPlan() {
  const { studyPlan, setStudyPlan, updateProgress, studentSubjects, quizResults, user, completedTasks: completedTasksArr, setCompletedTasks: setCompletedTasksStore } = useStore();
  const navigate = useNavigate();
  
  const completedTasks = new Set(completedTasksArr);
  const persistCompletedTasks = (s: Set<string>) => setCompletedTasksStore(Array.from(s));
  
  const [classLevel, setClassLevel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [startDate, setStartDate] = useState(user?.studyStartDate || new Date().toISOString().split('T')[0]);
  
  const [endDate, setEndDate] = useState(user?.studyEndDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
  })());
  
  const [goals, setGoals] = useState("");
  
  // Quiz State
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuizTask, setCurrentQuizTask] = useState<{ subject: string; topic: string; key: string } | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Anti-cheat state
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const showQuizRef = useRef(showQuiz);
  showQuizRef.current = showQuiz;

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  const startCamera = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setCameraStream(stream);
      setCameraError(false);
      return true;
    } catch {
      setCameraError(true);
      return false;
    }
  }, []);

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraStream]);

  useEffect(() => {
    const handleVisibility = async () => {
      if (!showQuizRef.current || quizFinished) return;
      if (document.hidden) {
        setQuizStep(0);
        setQuizAnswers([]);
        setQuizFinished(false);
        setQuizScore(0);
        if (currentQuizTask) {
          setQuizLoading(true);
          try {
            const questions = await generateTopicQuiz(currentQuizTask.topic, currentQuizTask.subject, classLevel);
            setQuizQuestions(questions);
          } catch {}
          finally { setQuizLoading(false); }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [quizFinished, currentQuizTask, classLevel]);

  useEffect(() => {
    if (!showQuiz) stopCamera();
  }, [showQuiz]);
  
  const hasNoData = studyPlan.length === 0;
  const showIntro = hasNoData && !editing;

  useEffect(() => {
    if (!editing && !generating) {
      if (user?.studyStartDate) setStartDate(user.studyStartDate);
      if (user?.studyEndDate) setEndDate(user.studyEndDate);
      if (user?.name && !classLevel) {
        setClassLevel(user.name.includes('Class') ? user.name : 'Grade 10');
      }
    }
  }, [user?.studyStartDate, user?.studyEndDate, user?.name, editing, generating]);

  const generatePlan = async (isAutoRegen: boolean = false) => {
    if (studentSubjects.length === 0) {
      toast.error("Please add subjects in the Subjects module first.");
      navigate("/subjects");
      return;
    }
    if (!classLevel) {
      toast.error("Please specify your class level.");
      return;
    }
    
    setGenerating(true);
    const validSubjects = studentSubjects.map(s => s.subject);

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // 1. Identify existing activity to preserve
    const preservedPlan = studyPlan.filter(day => day.date && day.date <= todayStr);
    const lastDayIndex = preservedPlan.length > 0 ? Math.max(...preservedPlan.map(d => d.day)) : 0;
    
    // 2. Determine new start date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    
    // If the plan hasn't started yet, or we're doing a full regen
    const effectiveStartDate = (preservedPlan.length === 0) ? startDate : tomorrowStr;
    const end = new Date(endDate);
    const start = new Date(effectiveStartDate);
    
    const diffTime = end.getTime() - start.getTime();
    let calculatedDuration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    // If we've already reached the end date, nothing to generate for the future
    if (calculatedDuration <= 0 && preservedPlan.length > 0) {
      setGenerating(false);
      setEditing(false);
      if (!isAutoRegen) toast.info("Your current plan already covers your timeframe.");
      return;
    }

    if (calculatedDuration <= 0) calculatedDuration = 1;

    try {
      const aiPlan = await generateStudyPlan(classLevel, validSubjects, calculatedDuration, effectiveStartDate, goals);
      
      if (aiPlan && aiPlan.length > 0) {
        const newPart = aiPlan.map((day, idx) => ({
          day: lastDayIndex + idx + 1,
          date: day.date,
          tasks: day.tasks.map(t => ({
            subject: t.subject,
            topic: t.topic,
          })),
        }));
        
        const finalPlan = [...preservedPlan, ...newPart];
        await setStudyPlan(finalPlan, startDate, endDate);
        
        // Recalculate progress based on new total
        const totalTasks = finalPlan.reduce((s, d) => s + d.tasks.length, 0);
        const newProgress = totalTasks > 0 ? Math.round((completedTasks.size / totalTasks) * 100) : 0;
        await updateProgress(newProgress);
        
        toast.success(preservedPlan.length > 0 ? "Upcoming plan updated while preserving today's progress!" : "Study plan generated successfully!");
      } else {
        throw new Error("AI plan generation failed");
      }
    } catch (error) {
      console.error('Study Plan AI Error:', error);
      toast.error("Failed to generate AI plan. Using default schedule.");
      
      const newPart = [];
      const startAt = new Date(effectiveStartDate);
      for (let day = 1; day <= calculatedDuration; day++) {
        const currentDate = new Date(startAt);
        currentDate.setDate(startAt.getDate() + (day - 1));
        const tasks = studentSubjects.slice(0, 3).map((ss) => ({
          subject: ss.subject,
          topic: ss.topics[(day - 1) % ss.topics.length]?.topic || `${ss.subject} Review`,
        }));
        newPart.push({ 
          day: lastDayIndex + day, 
          date: currentDate.toISOString().split('T')[0], 
          tasks 
        });
      }
      const finalPlan = [...preservedPlan, ...newPart];
      await setStudyPlan(finalPlan, startDate, endDate);
      const totalTasks = finalPlan.reduce((s, d) => s + d.tasks.length, 0);
      const newProgress = totalTasks > 0 ? Math.round((completedTasks.size / totalTasks) * 100) : 0;
      await updateProgress(newProgress);
    } finally {
      // Recalculate progress for dashboard
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      // We need to fetch the updated state, or just calculate from the local finalPlan
      // Since setStudyPlan is async and updates the store, we can use a small delay or calculate here
      setGenerating(false);
      setEditing(false);
    }
  };

  const isToday = (dateString?: string) => {
    if (!dateString) return false;
    const now = new Date();
    const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return dateString === localToday;
  };

  const toggleTask = async (taskKey: string, task?: { subject: string; topic: string }, date?: string) => {
    if (!isToday(date)) {
      toast.error("You can only complete tasks for the current day.");
      return;
    }
    const next = new Set(completedTasks);
    if (next.has(taskKey)) {
      next.delete(taskKey);
      persistCompletedTasks(next);
      const totalTasks = studyPlan.reduce((s, d) => s + d.tasks.length, 0);
      updateProgress(totalTasks > 0 ? Math.round((next.size / totalTasks) * 100) : 0);
      return;
    }

    if (task) {
      const camGranted = await startCamera();
      if (!camGranted) {
        toast.error("Camera permission is required for quizzes.");
        return;
      }
      setCurrentQuizTask({ ...task, key: taskKey });
      setQuizLoading(true);
      setShowQuiz(true);
      setQuizStep(0);
      setQuizAnswers([]);
      setQuizFinished(false);
      setQuizScore(0);

      try {
        const questions = await generateTopicQuiz(task.topic, task.subject, classLevel);
        setQuizQuestions(questions);
      } catch (err) {
        console.error("Failed to generate quiz:", err);
      } finally {
        setQuizLoading(false);
      }
    }
  };

  const handleQuizAnswer = (optionIndex: number) => {
    if (quizStep < quizQuestions.length) {
      const newAnswers = [...quizAnswers, optionIndex];
      setQuizAnswers(newAnswers);
      
      if (quizStep + 1 < quizQuestions.length) {
        setQuizStep(quizStep + 1);
      } else {
        let score = 0;
        quizQuestions.forEach((q, idx) => {
          if (newAnswers[idx] === q.correct) score++;
        });
        
        const percentage = (score / quizQuestions.length) * 100;
        setQuizScore(score);
        setQuizFinished(true);

        if (percentage >= 70 && currentQuizTask) {
          const next = new Set(completedTasks);
          next.add(currentQuizTask.key);
          persistCompletedTasks(next);
          const totalTasks = studyPlan.reduce((s, d) => s + d.tasks.length, 0);
          updateProgress(totalTasks > 0 ? Math.round((next.size / totalTasks) * 100) : 0);
        }
      }
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-1">Study Planner</h1>
            <p className="text-muted-foreground">Master your curriculum with AI-optimized scheduling</p>
          </div>
          {studyPlan.length > 0 && !editing && (
            <button onClick={() => setEditing(true)} className="px-4 py-2 bg-secondary text-foreground rounded-xl font-bold hover:bg-secondary/80 transition-all flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Regenerate Plan
            </button>
          )}
        </div>

        {showIntro ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-12 shadow-premium border border-border text-center">
            <div className="w-20 h-20 rounded-3xl gradient-purple flex items-center justify-center mx-auto mb-8 shadow-xl shadow-primary/20">
              <Layout className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">Ready to Start?</h2>
            <p className="text-muted-foreground mb-10 max-w-lg mx-auto leading-relaxed">
              We'll use your syllabus from the <Link to="/subjects" className="text-primary font-bold hover:underline">Subjects module</Link> to build a personalized study schedule that adapts to your timeframe and goals.
            </p>
            <button
              onClick={() => setEditing(true)}
              className="gradient-purple text-primary-foreground px-10 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all flex items-center gap-3 mx-auto"
            >
              <Sparkles className="w-6 h-6" />
              Configure My Plan
            </button>
          </motion.div>
        ) : editing ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-8 shadow-premium border border-border">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl gradient-purple flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">Configure Your Schedule</h2>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 bg-secondary/20 p-4 rounded-xl border border-border flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current Curriculum</p>
                    <p className="text-sm font-bold text-foreground">{classLevel || "Standard Syllabus"}</p>
                  </div>
                  <Link to="/subjects" className="text-xs font-bold text-primary hover:underline">Change in Subjects module</Link>
                </div>
                <div>
                  <label className="text-sm font-bold text-foreground mb-2 block uppercase tracking-wider">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-card text-foreground focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-foreground mb-2 block uppercase tracking-wider">End Date</label>
                  <input
                    type="date"
                    min={startDate}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-card text-foreground focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-foreground mb-2 block uppercase tracking-wider">Study Goals</label>
                <textarea
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="What are you trying to achieve? (e.g., Prepare for mid-terms, focus on weak topics...)"
                  className="w-full px-4 py-3 rounded-xl border border-input bg-card text-foreground focus:ring-2 focus:ring-primary/50 outline-none transition-all min-h-[120px]"
                />
              </div>



              <div className="flex gap-4 pt-4">
                <button
                  onClick={generatePlan}
                  disabled={generating || !classLevel || studentSubjects.length === 0}
                  className="flex-1 gradient-purple text-primary-foreground py-4 rounded-xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  Generate AI Study Plan
                </button>
                <button onClick={() => setEditing(false)} className="px-8 py-4 bg-secondary text-foreground rounded-xl font-bold hover:bg-secondary/80 transition-all">
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Plan Display (Daily Tasks) */}
            {studyPlan.map((day, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-card rounded-2xl p-6 shadow-premium border border-border"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl gradient-purple flex items-center justify-center shadow-lg">
                      <span className="text-lg font-black text-primary-foreground">{day.day}</span>
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                        Day {day.day}
                        {isToday(day.date) && <span className="text-[10px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full uppercase tracking-tighter">Current Day</span>}
                      </h3>
                      <p className="text-xs font-black text-primary uppercase tracking-widest mt-1">
                        {day.date ? new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : "Planned Session"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Focus</div>
                    <div className="text-sm font-bold text-primary">{day.tasks.length} Modules</div>
                  </div>
                </div>

                <div className="grid gap-3">
                  {day.tasks.map((task, tidx) => {
                    const taskKey = `${day.day}-${tidx}`;
                    const isDone = completedTasks.has(taskKey);
                    const isDayActive = isToday(day.date);
                    
                    return (
                      <div 
                        key={tidx}
                        className={`group flex items-center gap-4 p-4 rounded-xl border transition-all ${
                          isDone ? 'bg-green-500/5 border-green-500/30' : 
                          !isDayActive ? 'bg-secondary/10 border-border/30 opacity-60' :
                          'bg-secondary/30 border-border/50 hover:border-primary/50'
                        }`}
                      >
                        <button 
                          onClick={() => toggleTask(taskKey, task, day.date)}
                          disabled={!isDayActive}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isDone ? 'bg-green-500 border-green-500' : 
                            !isDayActive ? 'border-muted-foreground/20 cursor-not-allowed' :
                            'border-muted-foreground/30 hover:border-primary'
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="w-4 h-4 text-white" /> : !isDayActive ? <Lock className="w-3 h-3 text-muted-foreground/40" /> : null}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-bold text-sm truncate ${isDone ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                              {task.subject}
                            </h4>
                            {!isDone && (
                              <span className="text-[9px] font-black uppercase tracking-widest text-primary/60 bg-primary/5 px-2 py-0.5 rounded-md">
                                {day.date ? new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "Today"}
                              </span>
                            )}
                          </div>
                          <p className={`text-xs ${isDone ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
                            {task.topic}
                          </p>
                        </div>
                        {!isDone && isDayActive && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] font-black uppercase tracking-tighter bg-primary/10 text-primary px-2 py-1 rounded-md">
                              Verify Now
                            </span>
                          </div>
                        )}
                        {!isDayActive && !isDone && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Locked</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Quiz Modal (Existing logic) */}
      <AnimatePresence>
        {showQuiz && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/90 backdrop-blur-xl p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card w-full max-w-2xl rounded-3xl p-8 shadow-2xl border border-border relative my-8"
            >
              {/* Anti-cheat UI */}
              <div className="absolute -top-4 -right-4 flex flex-col gap-2 z-10">
                <div className="bg-card border border-border rounded-xl p-2 shadow-xl overflow-hidden w-32 h-24">
                  <video ref={videoRef} className="w-full h-full object-cover rounded-lg flip-h" muted playsInline />
                </div>
              </div>

              {!quizFinished ? (
                <>
                  <div className="mb-8">
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Mastery Check</span>
                        <h2 className="font-display text-2xl font-black text-foreground">{currentQuizTask?.topic}</h2>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-foreground">{quizStep + 1}</span>
                        <span className="text-muted-foreground font-bold">/{quizQuestions.length}</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${((quizStep + 1) / quizQuestions.length) * 100}%` }}
                        className="h-full gradient-purple"
                      />
                    </div>
                  </div>

                  {quizLoading ? (
                    <div className="py-20 flex flex-col items-center gap-4">
                      <Loader2 className="w-10 h-10 animate-spin text-primary" />
                      <p className="text-muted-foreground font-bold animate-pulse">Generating your custom verification...</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-secondary/30 p-6 rounded-2xl border border-border/50">
                        <p className="text-lg font-bold text-foreground leading-relaxed">
                          {quizQuestions[quizStep]?.question}
                        </p>
                      </div>
                      <div className="grid gap-3">
                        {quizQuestions[quizStep]?.options.map((opt, i) => (
                          <button
                            key={i}
                            onClick={() => handleQuizAnswer(i)}
                            className="w-full text-left p-5 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all font-bold text-foreground/80 hover:text-foreground group flex items-center justify-between"
                          >
                            <span>{opt}</span>
                            <div className="w-6 h-6 rounded-full border-2 border-border group-hover:border-primary transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-center">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl ${
                    (quizScore / quizQuestions.length) >= 0.7 ? 'gradient-purple shadow-primary/30' : 'bg-secondary'
                  }`}>
                    {(quizScore / quizQuestions.length) >= 0.7 ? <PartyPopper className="w-12 h-12 text-primary-foreground" /> : <Target className="w-12 h-12 text-muted-foreground" />}
                  </div>
                  <h2 className="font-display text-4xl font-black text-foreground mb-2">
                    {Math.round((quizScore / quizQuestions.length) * 100)}%
                  </h2>
                  <p className="text-xl font-bold text-muted-foreground mb-8">
                    {(quizScore / quizQuestions.length) >= 0.7 ? "Mastery Verified!" : "Needs More Review"}
                  </p>
                  
                  <div className="bg-secondary/30 p-6 rounded-2xl border border-border mb-8 inline-block min-w-[300px]">
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground font-bold">Correct Answers</span>
                      <span className="text-foreground font-black">{quizScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-bold">Status</span>
                      <span className={`font-black ${(quizScore / quizQuestions.length) >= 0.7 ? 'text-green-500' : 'text-accent'}`}>
                        {(quizScore / quizQuestions.length) >= 0.7 ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 max-w-sm mx-auto">
                    <button 
                      onClick={() => setShowQuiz(false)}
                      className="w-full gradient-purple text-primary-foreground py-4 rounded-xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Continue Learning
                    </button>
                    {(quizScore / quizQuestions.length) < 0.7 && (
                      <button 
                        onClick={() => {
                          setQuizStep(0);
                          setQuizAnswers([]);
                          setQuizFinished(false);
                          setQuizScore(0);
                          setQuizLoading(true);
                          generateTopicQuiz(currentQuizTask?.topic || "", currentQuizTask?.subject || "", classLevel)
                            .then(setQuizQuestions)
                            .finally(() => setQuizLoading(false));
                        }}
                        className="w-full bg-secondary text-foreground py-4 rounded-xl font-bold hover:bg-secondary/80 transition-all"
                      >
                        Retake Mastery Check
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
