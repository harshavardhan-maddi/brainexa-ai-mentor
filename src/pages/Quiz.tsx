import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useStore, StudentSubject } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, GraduationCap, Target, Loader2, BookOpen, AlertCircle } from "lucide-react";
import { generateTopicQuiz, QuizQuestion } from "@/lib/ai";
import { LoadingStatus } from "@/components/LoadingStatus";

export default function Quiz() {
  const { addQuizResult, studentSubjects, updateStudentSubject, quizResults } = useStore();
  const [searchParams] = useSearchParams();

  // Subject + topic selection
  const [selectedSubject, setSelectedSubject] = useState<StudentSubject | null>(null);
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);

  // AI question state
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Per-question state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [topicScore, setTopicScore] = useState(0);
  const [wrongTopics, setWrongTopics] = useState<string[]>([]);

  // Finish states
  const [allFinished, setAllFinished] = useState(false);

  const currentTopic = selectedSubject?.topics[currentTopicIndex];
  const q = questions[currentQuestionIndex];

  // Load AI questions whenever topic changes
  const loadQuestions = useCallback(async (topic: string, subject: string) => {
    setLoadingQuestions(true);
    setLoadError(false);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelected(null);
    setAnswered(false);
    setTopicScore(0);
    setWrongTopics([]);

    try {
      const classLevel = "Grade 10"; // Could be stored in profile
      const qs = await generateTopicQuiz(topic, subject, classLevel);
      if (qs && qs.length > 0) {
        setQuestions(qs);
      } else {
        setLoadError(true);
      }
    } catch (err) {
      console.error("Failed to load AI questions:", err);
      setLoadError(true);
    } finally {
      setLoadingQuestions(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSubject && currentTopic) {
      loadQuestions(currentTopic.topic, selectedSubject.subject);
    }
  }, [selectedSubject, currentTopicIndex, loadQuestions]);

  // Auto-start quiz from Dashboard weak area links
  useEffect(() => {
    const subjectParam = searchParams.get('subject');
    const topicParam = searchParams.get('topic');
    if (subjectParam && topicParam && studentSubjects.length > 0) {
      const sub = studentSubjects.find(s => s.subject === decodeURIComponent(subjectParam));
      if (sub) {
        const topicIdx = sub.topics.findIndex(t => t.topic === decodeURIComponent(topicParam));
        if (topicIdx !== -1) {
          setSelectedSubject(sub);
          setCurrentTopicIndex(topicIdx);
        }
      }
    }
  }, [searchParams, studentSubjects]);

  const handleAnswer = (idx: number) => {
    if (answered || !q) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === q.correct) {
      setScore(s => s + 1);
      setTopicScore(ts => ts + 1);
    } else {
      setWrongTopics(prev => [...prev, currentTopic?.topic || ""]);
    }
  };

  const next = () => {
    if (!selectedSubject || !currentTopic || !q) return;

    const isTopicDone = currentQuestionIndex + 1 >= questions.length;
    const finalTopicScore = topicScore + (selected === q.correct ? 1 : 0);

    // Update student subject progress
    const updatedTopics = [...selectedSubject.topics];
    updatedTopics[currentTopicIndex] = {
      ...updatedTopics[currentTopicIndex],
      questionsAttempted: updatedTopics[currentTopicIndex].questionsAttempted + 1,
      questionsCorrect: updatedTopics[currentTopicIndex].questionsCorrect + (selected === q.correct ? 1 : 0),
    };
    updateStudentSubject(selectedSubject.subject, updatedTopics, currentTopicIndex);

    if (isTopicDone) {
      // Save quiz result for this topic
      addQuizResult({
        id: crypto.randomUUID(),
        subject: selectedSubject.subject,
        topic: currentTopic.topic,
        score: finalTopicScore,
        total: questions.length,
        date: new Date().toISOString(),
        weakTopics: [...new Set(wrongTopics)],
      });

      // Move to next topic or finish
      if (currentTopicIndex + 1 < selectedSubject.topics.length) {
        setCurrentTopicIndex(prev => prev + 1);
        // useEffect will re-trigger loadQuestions automatically
      } else {
        setAllFinished(true);
      }
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  const startQuiz = (subject: StudentSubject) => {
    setSelectedSubject(subject);
    setCurrentTopicIndex(0);
    setScore(0);
    setTopicScore(0);
    setAllFinished(false);
    setWrongTopics([]);
    // Questions load via useEffect
  };

  const reset = () => {
    setSelectedSubject(null);
    setCurrentTopicIndex(0);
    setQuestions([]);
    setScore(0);
    setTopicScore(0);
    setAllFinished(false);
    setWrongTopics([]);
  };

  // ── No subjects ───────────────────────────────────────────────────────────
  if (studentSubjects.length === 0) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">Quiz Center</h1>
          <p className="text-sm text-muted-foreground mb-8">Test your knowledge across subjects</p>
          <div className="bg-card rounded-xl p-8 shadow-card border border-border text-center">
            <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">No Subjects Added</h2>
            <p className="text-muted-foreground mb-4">
              Please add subjects and topics in the Study Plan first to start taking quizzes.
            </p>
            <p className="text-sm text-muted-foreground">
              Go to <span className="text-primary font-medium">Study Plan</span> to add your subjects and topics.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── All topics completed ──────────────────────────────────────────────────
  if (allFinished) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">Quiz Center</h1>
          <p className="text-sm text-muted-foreground mb-8">Test your knowledge across subjects</p>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <div className="bg-card rounded-xl p-8 shadow-elevated border border-border">
              <div className="w-20 h-20 rounded-full mx-auto mb-6 gradient-purple flex items-center justify-center">
                <GraduationCap className="w-10 h-10 text-primary-foreground" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">All Topics Completed!</h2>
              <p className="text-muted-foreground mb-2">
                You've completed all topics in <span className="font-semibold text-primary">{selectedSubject?.subject}</span>
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Total score: <span className="font-bold text-foreground">{score}</span> correct answers
              </p>
              <button
                onClick={reset}
                className="gradient-purple text-primary-foreground px-6 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Choose Another Subject
              </button>
            </div>
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-2xl font-bold text-foreground mb-1">Quiz Center</h1>
        <p className="text-sm text-muted-foreground mb-8">Test your knowledge across your subjects and topics</p>

        <AnimatePresence mode="wait">

          {/* ── Subject Selection ── */}
          {!selectedSubject && (
            <motion.div key="subjects" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="font-display text-lg font-semibold text-foreground mb-4">Select a Subject</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {studentSubjects.map((sub, i) => {
                  const totalQuizzes = quizResults.filter(q => q.subject === sub.subject).length;
                  const completedTopics = sub.topics.filter(t => t.questionsAttempted > 0).length;
                  return (
                    <motion.button
                      key={sub.subject}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      onClick={() => startQuiz(sub)}
                      className="p-6 rounded-xl border border-border bg-card shadow-card text-left hover:shadow-elevated transition-shadow hover:border-primary"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <GraduationCap className="w-8 h-8 text-primary" />
                        {completedTopics > 0 && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            {completedTopics}/{sub.topics.length} done
                          </span>
                        )}
                      </div>
                      <h3 className="font-display font-semibold text-foreground">{sub.subject}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{sub.topics.length} topics</p>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full gradient-purple rounded-full"
                            style={{ width: `${sub.topics.length ? (completedTopics / sub.topics.length) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── Loading Questions ── */}
          {selectedSubject && loadingQuestions && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-24 flex flex-col items-center justify-center text-center space-y-4"
            >
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                  Preparing Questions...
                </h3>
                <LoadingStatus 
                  isLoading={true} 
                  steps={['Analyzing depth...', 'Crafting questions...', 'Validating level...']}
                  className="justify-center"
                />
              </div>
            </motion.div>
          )}

          {/* ── Load Error ── */}
          {selectedSubject && !loadingQuestions && loadError && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="bg-card rounded-xl p-8 border border-border text-center"
            >
              <AlertCircle className="w-12 h-12 text-accent mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Failed to Load Questions</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Could not generate questions for <span className="font-medium">{currentTopic?.topic}</span>. Check your API key or internet connection.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => currentTopic && loadQuestions(currentTopic.topic, selectedSubject.subject)}
                  className="gradient-purple text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Retry
                </button>
                <button onClick={reset} className="px-5 py-2 rounded-lg text-sm font-semibold border border-border text-muted-foreground hover:bg-secondary transition-colors">
                  Back
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Quiz Questions ── */}
          {selectedSubject && !loadingQuestions && !loadError && q && (
            <motion.div key={`quiz-${currentTopicIndex}-${currentQuestionIndex}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-sm font-medium text-primary">{selectedSubject.subject}</span>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <BookOpen className="w-3 h-3" /> {currentTopic?.topic}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-muted-foreground">
                    Q{currentQuestionIndex + 1}/{questions.length}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Topic {currentTopicIndex + 1}/{selectedSubject.topics.length}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-secondary rounded-full mb-6">
                <div
                  className="h-2 gradient-purple rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* Question Card */}
              <div className="bg-card rounded-xl p-6 shadow-card border border-border mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                    {currentTopic?.topic}
                  </span>
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-6">{q.question}</h3>
                <div className="space-y-3">
                  {q.options.map((opt, i) => {
                    let classes = "w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all ";
                    if (!answered) {
                      classes += selected === i
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card text-foreground hover:bg-secondary";
                    } else if (i === q.correct) {
                      classes += "border-green-500 bg-green-500/10 text-green-700";
                    } else if (i === selected) {
                      classes += "border-red-500 bg-red-500/10 text-red-600";
                    } else {
                      classes += "border-border bg-card text-muted-foreground";
                    }
                    return (
                      <button key={i} onClick={() => handleAnswer(i)} className={classes} disabled={answered}>
                        <span className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center text-xs font-bold shrink-0">
                            {String.fromCharCode(65 + i)}
                          </span>
                          {answered && i === q.correct && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                          {answered && i === selected && i !== q.correct && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                          {opt}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {answered && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
                  <p className={`text-sm font-medium ${selected === q.correct ? "text-green-600" : "text-red-500"}`}>
                    {selected === q.correct ? "✓ Correct!" : `✗ Correct answer: ${q.options[q.correct]}`}
                  </p>
                  <button
                    onClick={next}
                    className="gradient-purple text-primary-foreground px-6 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    {currentQuestionIndex + 1 >= questions.length
                      ? (currentTopicIndex + 1 >= selectedSubject.topics.length ? "Finish" : "Next Topic")
                      : "Next Question"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </AppLayout>
  );
}
