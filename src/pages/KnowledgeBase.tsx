import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import KnowledgeSearch from '@/components/KnowledgeSearch';
import LearningSession from '@/components/LearningSession';
import QuestionPanel from '@/components/QuestionPanel';
import ProgressView from '@/components/ProgressView';
import { useStore } from '@/lib/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, TrendingUp, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const KnowledgeBase = () => {
  const { user } = useStore();
  const [view, setView] = useState<'search' | 'learning' | 'quiz'>('search');
  const [selectedUrl, setSelectedUrl] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [currentExplanation, setCurrentExplanation] = useState('');
  const [preGeneratedSummary, setPreGeneratedSummary] = useState('');

  const handleSelectResult = (url: string, title: string, summary?: string) => {
    setSelectedUrl(url);
    setSelectedTopic(title);
    if (summary) setPreGeneratedSummary(summary);
    setView('learning');
  };

  const handleStartQuiz = (explanation: string) => {
    setCurrentExplanation(explanation);
    setView('quiz');
  };

  const handleQuizComplete = (score: number) => {
    // Score is handled in the components/backend
    // We just return to search or show progress
    setView('search');
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <header className="mb-10 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <BookOpen className="w-7 h-7" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Learning Laboratory
            </h1>
          </div>
          <p className="text-muted-foreground text-lg font-medium max-w-2xl px-1">
            Explore concepts, distill wisdom using AI, and sharpen your understanding through interactive active learning.
          </p>
        </header>

        <Tabs defaultValue="explore" className="space-y-8">
          <div className="flex justify-between items-center bg-muted/30 p-1.5 rounded-2xl border backdrop-blur-sm sticky top-4 z-10 shadow-lg">
            <TabsList className="bg-transparent border-none">
              <TabsTrigger value="explore" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md font-bold gap-2">
                <Sparkles className="w-4 h-4" />
                Explore Topics
              </TabsTrigger>
              <TabsTrigger value="progress" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md font-bold gap-2">
                <TrendingUp className="w-4 h-4" />
                Your Mastery
              </TabsTrigger>
            </TabsList>
            <div className="hidden sm:flex items-center gap-2 px-4 text-xs font-bold text-muted-foreground uppercase tracking-widest italic">
              Powered by Brainexa Knowledge Engine
            </div>
          </div>

          <TabsContent value="explore" className="mt-0">
            <AnimatePresence mode="wait">
              {view === 'search' && (
                <motion.div
                  key="search"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <KnowledgeSearch onSelectResult={handleSelectResult} />
                </motion.div>
              )}

              {view === 'learning' && (
                <motion.div
                  key="learning"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                >
                  <LearningSession
                    url={selectedUrl}
                    topic={selectedTopic}
                    userId={user?.id}
                    initialSummary={preGeneratedSummary}
                    onStartQuiz={handleStartQuiz}
                    onBack={() => {
                      setView('search');
                      setPreGeneratedSummary('');
                    }}
                  />
                </motion.div>
              )}

              {view === 'quiz' && (
                <motion.div
                  key="quiz"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <QuestionPanel
                    topic={selectedTopic}
                    explanation={currentExplanation}
                    userId={user?.id}
                    onComplete={handleQuizComplete}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="progress" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {user?.id ? (
                <ProgressView userId={user.id} />
              ) : (
                <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
                  <p className="text-muted-foreground text-lg font-bold">Please log in to track your progress.</p>
                </div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default KnowledgeBase;
