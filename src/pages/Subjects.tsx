import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { useStore, StudentSubject } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Plus, Trash2, ChevronDown, ChevronRight, X, Sparkles, AlertTriangle, Crown, History, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/lib/api-config";


const defaultTopicMap: Record<string, string[]> = {
  Hindi: ["व्याकरण (Grammar)", "निबंध लेखन (Essay Writing)", "पत्र लेखन (Letter Writing)", "गद्य (Prose)", "पद्य (Poetry)", "अपठित गद्यांश (Unseen Passage)"],
  English: ["Grammar", "Essay Writing", "Comprehension", "Vocabulary", "Literature", "Poetry", "Letter Writing"],
  Mathematics: ["Algebra", "Geometry", "Trigonometry", "Calculus", "Statistics", "Number Theory", "Probability", "Linear Programming"],
  Physics: ["Mechanics", "Thermodynamics", "Waves & Oscillations", "Optics", "Electricity & Magnetism", "Modern Physics", "Semiconductor Devices"],
  Biology: ["Cell Biology", "Genetics", "Human Anatomy", "Plant Biology", "Ecology", "Evolution", "Microbiology"],
  Chemistry: ["Atomic Structure", "Chemical Bonding", "Periodic Table", "Acids & Bases", "Organic Chemistry", "Physical Chemistry", "Electrochemistry"],
  "Programming in C": ["Data Types & Variables", "Control Structures", "Functions", "Arrays", "Pointers", "Structures & Unions", "File Handling"],
  Java: ["OOP Concepts", "Classes & Objects", "Inheritance", "Polymorphism", "Exception Handling", "Collections Framework", "Multithreading", "JDBC"],
  Python: ["Data Types & Variables", "Control Flow", "Functions & Modules", "OOP in Python", "File Handling", "Libraries (NumPy, Pandas)", "Web Scraping"],
  DBMS: ["ER Model", "Relational Model", "SQL Queries", "Normalization", "Transactions & Concurrency", "Indexing", "NoSQL Basics"],
  "Software Engineering": ["SDLC Models", "Requirements Engineering", "Software Design", "Testing & Debugging", "Agile & Scrum", "UML Diagrams", "Project Management"],
  "Operating Systems": ["Process Management", "CPU Scheduling", "Memory Management", "File Systems", "Deadlocks", "Disk Scheduling", "Virtualization"],
};

export default function Subjects() {
  const { studentSubjects, setStudentSubjects, quizResults, user, updateUser } = useStore();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectTopics, setSubjectTopics] = useState<Record<number, string[]>>({});
  const [expandedSubject, setExpandedSubject] = useState<number | null>(null);
  const [classLevel, setClassLevel] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Modal State for Syllabus Updates
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: string;
    amount?: number;
    updates?: string;
    confirmText: string;
    onConfirm: () => void;
    type: 'payment' | 'confirm' | 'info';
  } | null>(null);

  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    // Load Razorpay Script
    if (!document.getElementById('razorpay-script')) {
      const script = document.createElement("script");
      script.id = 'razorpay-script';
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => setIsScriptLoaded(true);
      document.body.appendChild(script);
    } else {
      setIsScriptLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (studentSubjects.length > 0) {
      setSubjects(studentSubjects.map(s => s.subject));
      const topicsMap: Record<number, string[]> = {};
      studentSubjects.forEach((s, idx) => {
        topicsMap[idx] = s.topics.map(t => t.topic);
      });
      setSubjectTopics(topicsMap);
    } else {
      setSubjects([""]);
      setSubjectTopics({ 0: [] });
    }

    if (user?.name) {
      setClassLevel(user.name.includes('Class') || user.name.includes('Grade') ? user.name : "Class 10");
    }
  }, [studentSubjects, user]);

  const addSubject = () => {
    setSubjects([...subjects, ""]);
    setSubjectTopics({ ...subjectTopics, [subjects.length]: [] });
    setExpandedSubject(subjects.length);
  };

  const removeSubject = (i: number) => {
    const newSubjects = subjects.filter((_, idx) => idx !== i);
    setSubjects(newSubjects);
    const newTopics = { ...subjectTopics };
    delete newTopics[i];
    const reindexed: Record<number, string[]> = {};
    newSubjects.forEach((_, idx) => {
      if (subjectTopics[idx] !== undefined) {
        reindexed[idx] = subjectTopics[idx];
      }
    });
    setSubjectTopics(reindexed);
  };

  const updateSubjectName = (i: number, val: string) => {
    const copy = [...subjects];
    copy[i] = val;
    setSubjects(copy);
    if (val && defaultTopicMap[val] && !subjectTopics[i]?.length) {
      setSubjectTopics({ ...subjectTopics, [i]: [...defaultTopicMap[val]] });
      setExpandedSubject(i);
    }
  };

  const addTopic = (subjectIndex: number) => {
    const currentTopics = subjectTopics[subjectIndex] || [];
    setSubjectTopics({ ...subjectTopics, [subjectIndex]: [...currentTopics, ""] });
  };

  const updateTopic = (subjectIndex: number, topicIndex: number, val: string) => {
    const currentTopics = [...(subjectTopics[subjectIndex] || [])];
    currentTopics[topicIndex] = val;
    setSubjectTopics({ ...subjectTopics, [subjectIndex]: currentTopics });
  };

  const removeTopic = (subjectIndex: number, topicIndex: number) => {
    const currentTopics = [...(subjectTopics[subjectIndex] || [])];
    currentTopics.splice(topicIndex, 1);
    setSubjectTopics({ ...subjectTopics, [subjectIndex]: currentTopics });
  };

  const handleSave = async () => {
    const validSubjects = subjects.filter(s => s.trim());
    if (validSubjects.length === 0) {
      toast.error("Please add at least one subject");
      return;
    }

    // Check for modifications
    const currentSubs = studentSubjects || [];
    const isSubjectsModified = subjects.length !== currentSubs.length || 
      subjects.some((s, i) => s !== currentSubs[i]?.subject);
    
    let isTopicsModified = false;
    if (!isSubjectsModified) {
      subjects.forEach((s, i) => {
        const storeTopics = currentSubs[i]?.topics.map(t => t.topic) || [];
        const currentTopics = subjectTopics[i] || [];
        if (storeTopics.length !== currentTopics.length || 
            currentTopics.some((t, j) => t !== storeTopics[j])) {
          isTopicsModified = true;
        }
      });
    }

    const isModified = isSubjectsModified || isTopicsModified;

    if (isModified) {
      const allowance = user?.syllabusUpdateAllowance || 5;
      const updateCount = user?.syllabusUpdateCount || 0;
      const remainingUpdates = Math.max(0, allowance - updateCount);

      if (remainingUpdates === 0) {
        let amount = 50;
        let updates = "6 (5+1)";
        if (allowance > 5) {
          amount = 101;
          updates = "10 (9+1)";
        }

        setModalConfig({
          title: "Update Limit Reached",
          message: `Syllabus Update Rules:\n1. ₹50 for 6 updates (5+1)\n2. ₹101 for 10 updates (9+1)\n\nYou are currently eligible for the ₹${amount} tier (${updates} updates).`,
          amount,
          updates,
          confirmText: `Pay ₹${amount} to Update`,
          type: 'payment',
          onConfirm: async () => {
            const paid = await handlePayForUpdate(amount);
            if (paid) {
              await finalizeSubjectUpdate(validSubjects, true, amount);
            }
            setShowUpdateModal(false);
          }
        });
        setShowUpdateModal(true);
      } else {
        setModalConfig({
          title: "Confirm Syllabus Update",
          message: `You are about to update your syllabus. This will use 1 of your ${allowance} available updates.`,
          confirmText: "Proceed with Update",
          type: 'confirm',
          onConfirm: async () => {
            await finalizeSubjectUpdate(validSubjects, true, 0);
            setShowUpdateModal(false);
          }
        });
        setShowUpdateModal(true);
      }
    } else {
      setEditing(false);
    }
  };

  const handlePayForUpdate = async (amount: number) => {
    if (!isScriptLoaded) {
      toast.error("Razorpay SDK not loaded. Please try again.");
      return false;
    }
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/payment/create-syllabus-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, amount })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      return new Promise((resolve) => {
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_YourID",
          amount: data.order.amount,
          currency: data.order.currency,
          name: "Brainexa",
          description: amount === 50 ? "5+1 Updates" : "10 Updates",
          order_id: data.order.id,
          handler: async (response: any) => {
            const verifyRes = await fetch(`${API_BASE_URL}/api/payment/verify-syllabus-update`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: user?.id, ...response })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              toast.success("Payment successful! Quota updated.");
            }
            resolve(verifyData.success);
          },
          prefill: { name: user?.name, email: user?.email },
          theme: { color: "#6366f1" }
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to initiate payment.");
      return false;
    }
  };

  const finalizeSubjectUpdate = async (validSubjects: string[], isModified: boolean, paidAmount: number) => {
    setIsSaving(true);
    const studentSubs: StudentSubject[] = validSubjects.map((sub, idx) => ({
      subject: sub,
      topics: (subjectTopics[idx] || []).filter(t => t.trim()).map(topic => ({
        topic,
        questionsAttempted: 0,
        questionsCorrect: 0,
      })),
      currentTopicIndex: 0,
    }));
    
    const res = await setStudentSubjects(studentSubs, isModified, paidAmount);
    if (res.success) {
      if (classLevel) {
        updateUser({ name: classLevel });
      }
      toast.success("Syllabus and student data updated successfully!");
      setEditing(false);
      toast.info("Updating your study plan to include new subjects...", { duration: 5000 });
      setTimeout(() => navigate("/study-plan"), 1500);
    } else {
      toast.error(res.error || "Failed to update syllabus");
    }
    setIsSaving(false);
  };

  const getQuizzesBySubject = (subject: string) => {
    return quizResults.filter(q => q.subject === subject);
  };

  const calculateSubjectProgress = (ss: StudentSubject) => {
    const attempted = ss.topics.reduce((a, t) => a + t.questionsAttempted, 0);
    const correct = ss.topics.reduce((a, t) => a + t.questionsCorrect, 0);
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    return { attempted, correct, accuracy };
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-1">Subjects & Curriculum</h1>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground">Manage your syllabus and track performance across subjects</p>
              {classLevel && (
                <span className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                  {classLevel}
                </span>
              )}
            </div>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="gradient-purple text-primary-foreground px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Manage Syllabus
            </button>
          )}
        </div>

        <AnimatePresence>
          {showUpdateModal && modalConfig && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-card w-full max-w-md rounded-2xl p-8 shadow-2xl border border-border"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                    modalConfig.type === 'payment' ? 'gradient-red shadow-accent/20' : 'gradient-purple shadow-primary/20'
                  }`}>
                    {modalConfig.type === 'payment' ? <Crown className="w-6 h-6 text-accent-foreground" /> : <AlertTriangle className="w-6 h-6 text-primary-foreground" />}
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold">{modalConfig.title}</h2>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground whitespace-pre-line mb-8 leading-relaxed">
                  {modalConfig.message}
                </div>
                <div className="flex flex-col gap-3">
                  <button onClick={modalConfig.onConfirm} className={`w-full py-4 rounded-xl font-bold transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] ${
                    modalConfig.type === 'payment' ? 'gradient-red text-accent-foreground' : 'gradient-purple text-primary-foreground'
                  }`}>
                    {modalConfig.confirmText}
                  </button>
                  <button onClick={() => setShowUpdateModal(false)} className="w-full text-muted-foreground py-3 text-sm font-semibold hover:bg-secondary rounded-xl transition-all">
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {editing ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-8 shadow-premium border border-border">
            <h2 className="font-display text-xl font-bold text-foreground mb-6">Modify Syllabus & Student Data</h2>
            
            <div className="mb-8 p-6 bg-primary/5 rounded-2xl border border-primary/20">
              <label className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-2 block">Student Grade / Class</label>
              <input
                value={classLevel}
                onChange={(e) => setClassLevel(e.target.value)}
                placeholder="e.g., Class 10 - Science Stream"
                className="w-full px-4 py-3 rounded-xl border border-primary/20 bg-card text-foreground focus:ring-2 focus:ring-primary/50 outline-none transition-all font-bold"
              />
            </div>

            <div className="space-y-6 mb-8">
              {subjects.map((sub, i) => (
                <div key={i} className="bg-secondary/20 rounded-2xl p-6 border border-border/50">
                  <div className="flex gap-4 mb-4">
                    <input
                      value={sub}
                      onChange={(e) => updateSubjectName(i, e.target.value)}
                      placeholder="Subject name (e.g., Mathematics)"
                      className="flex-1 px-4 py-3 rounded-xl border border-input bg-card text-foreground focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    />
                    <button 
                      onClick={() => setExpandedSubject(expandedSubject === i ? null : i)}
                      className="p-3 bg-card border border-border rounded-xl text-muted-foreground hover:text-primary transition-colors"
                    >
                      {expandedSubject === i ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    {subjects.length > 1 && (
                      <button onClick={() => removeSubject(i)} className="p-3 bg-card border border-border rounded-xl text-muted-foreground hover:text-accent transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  
                  <AnimatePresence>
                    {expandedSubject === i && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-4 border-l-2 border-primary/20 space-y-3 mt-4">
                          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Topics & Syllabus Content</p>
                          {(subjectTopics[i] || []).map((topic, ti) => (
                            <div key={ti} className="flex gap-2">
                              <input
                                value={topic}
                                onChange={(e) => updateTopic(i, ti, e.target.value)}
                                placeholder={`Topic ${ti + 1}`}
                                className="flex-1 px-4 py-2 rounded-lg border border-input bg-card text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                              />
                              <button onClick={() => removeTopic(i, ti)} className="p-2 text-muted-foreground hover:text-accent">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button onClick={() => addTopic(i)} className="text-xs text-primary font-bold flex items-center gap-1.5 hover:underline pt-2">
                            <Plus className="w-4 h-4" /> Add Topic
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
              <button onClick={addSubject} className="w-full py-4 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 font-bold">
                <Plus className="w-5 h-5" /> Add Another Subject
              </button>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 gradient-purple text-primary-foreground py-4 rounded-xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSaving ? "Saving Syllabus..." : "Save Syllabus Updates"}
              </button>
              <button onClick={() => setEditing(false)} className="px-8 py-4 bg-secondary text-foreground rounded-xl font-bold hover:bg-secondary/80 transition-all">
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {studentSubjects.map((ss, idx) => {
              const { attempted, accuracy } = calculateSubjectProgress(ss);
              const history = getQuizzesBySubject(ss.subject);
              
              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-card rounded-2xl p-6 shadow-premium border border-border group hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl gradient-purple flex items-center justify-center shadow-lg shadow-primary/10 group-hover:scale-110 transition-transform">
                        <BookOpen className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="font-display text-xl font-bold text-foreground">{ss.subject}</h3>
                        <p className="text-xs text-muted-foreground">{ss.topics.length} Topics in Syllabus</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-black ${accuracy >= 70 ? 'text-green-500' : accuracy >= 40 ? 'text-primary' : 'text-accent'}`}>
                        {accuracy}%
                      </div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Accuracy</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-secondary/30 rounded-xl p-3 text-center">
                      <Target className="w-4 h-4 mx-auto mb-1 text-primary" />
                      <div className="text-sm font-bold">{attempted}</div>
                      <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">Attempted</div>
                    </div>
                    <div className="bg-secondary/30 rounded-xl p-3 text-center">
                      <TrendingUp className="w-4 h-4 mx-auto mb-1 text-green-500" />
                      <div className="text-sm font-bold">{ss.topics.filter(t => (t.questionsCorrect/t.questionsAttempted) >= 0.7).length}</div>
                      <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">Mastered</div>
                    </div>
                    <div className="bg-secondary/30 rounded-xl p-3 text-center">
                      <History className="w-4 h-4 mx-auto mb-1 text-purple-500" />
                      <div className="text-sm font-bold">{history.length}</div>
                      <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">Quizzes</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      Recent Activity
                    </h4>
                    {history.length > 0 ? (
                      <div className="space-y-2">
                        {history.slice(-3).reverse().map((qr, qi) => (
                          <div key={qi} className="bg-secondary/20 rounded-lg px-3 py-2 flex items-center justify-between text-sm">
                            <span className="text-foreground/80 truncate max-w-[150px]">{qr.topic}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">{new Date(qr.date).toLocaleDateString()}</span>
                              <span className={`font-bold ${qr.score / qr.total >= 0.7 ? 'text-green-500' : 'text-primary'}`}>
                                {qr.score}/{qr.total}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic py-4 bg-secondary/10 rounded-xl text-center">
                        No quiz data yet. Start practicing to see scores!
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
