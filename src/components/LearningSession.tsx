import React, { useState, useEffect } from 'react';
import { Loader2, BookOpen, ChevronRight, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Progress } from './ui/progress';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api-config';


interface LearningSessionProps {
  url: string;
  topic: string;
  userId?: string;
  initialSummary?: string;
  onStartQuiz: (explanation: string) => void;
  onBack: () => void;
}

const LearningSession: React.FC<LearningSessionProps> = ({ url, topic, userId, initialSummary, onStartQuiz, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      if (initialSummary) {
        setSummary(initialSummary);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/knowledge/content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, topic, userId })
        });
        const data = await response.json();
        if (data.success) {
          setSummary(data.summary);
        } else {
          setError(data.error || 'Failed to extract content');
        }
      } catch (error) {
        setError('Network error: Could not reach the knowledge service.');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [url, topic, userId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-primary animate-spin" />
          <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-primary">Distilling Knowledge...</h3>
          <p className="text-muted-foreground animate-pulse">Our AI is reading and summarizing the content for you.</p>
        </div>
        <Progress value={45} className="w-64 h-2" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/5 py-10">
        <CardHeader className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <CardTitle className="text-destructive mt-4">Something went wrong</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center gap-4">
          <Button variant="outline" onClick={onBack}>Try Another Source</Button>
          <Button variant="default" onClick={() => window.location.reload()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-between px-2">
        <Button variant="ghost" className="hover:bg-primary/10" onClick={onBack}>
          ← Back to Search
        </Button>
        <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          Source: <span className="text-primary italic">{new URL(url).hostname}</span>
        </div>
      </div>

      <Card className="shadow-xl border-primary/10 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary via-indigo-500 to-purple-600" />
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                {topic}
              </CardTitle>
              <CardDescription className="text-lg mt-1 font-medium">AI-Distilled Learning Content</CardDescription>
            </div>
            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Optimal Read
            </div>
          </div>
        </CardHeader>
        <CardContent className="prose prose-lg dark:prose-invert max-w-none prose-headings:text-primary prose-code:text-primary prose-strong:text-foreground pt-4">
          <ReactMarkdown>{summary}</ReactMarkdown>
        </CardContent>
        <CardFooter className="bg-muted/50 border-t flex flex-col sm:flex-row justify-between items-center gap-4 p-6 mt-6">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="font-bold text-lg">Ready to test your knowledge?</h4>
            <p className="text-sm text-muted-foreground font-medium">Active recall is the fastest way to master this topic.</p>
          </div>
          <Button size="lg" className="h-14 px-8 text-lg font-bold gap-2 group shadow-lg shadow-primary/20" onClick={() => onStartQuiz(summary)}>
            Start Knowledge Quiz
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default LearningSession;
