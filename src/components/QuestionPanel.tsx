import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, Award, Sparkles, Send, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api-config';


interface Question {
  type: 'mcq' | 'short_answer';
  question: string;
  options?: string[];
  correct_answer?: string;
  correct_info?: string;
  explanation?: string;
}

interface QuestionPanelProps {
  topic: string;
  explanation: string;
  userId?: string;
  onComplete: (score: number) => void;
}

const QuestionPanel: React.FC<QuestionPanelProps> = ({ topic, explanation, userId, onComplete }) => {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [totalScore, setTotalScore] = useState(0);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/knowledge/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, explanation, userId })
        });
        const data = await response.json();
        if (data.success) {
          setQuestions(data.questions);
          setAnswers(new Array(data.questions.length).fill(''));
        }
      } catch (error) {
        console.error('Questions error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [topic, explanation, userId]);

  const handleSubmitAnswer = async () => {
    const currentQuestion = questions[currentIndex];
    
    setEvaluating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/knowledge/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion.question,
          answer: currentAnswer,
          correctInfo: currentQuestion.type === 'mcq' ? currentQuestion.correct_answer : currentQuestion.correct_info,
          topic,
          userId
        })
      });
      const data = await response.json();
      if (data.success) {
        setEvaluation(data.evaluation);
        setTotalScore(prev => prev + data.evaluation.score);
      }
    } catch (error) {
      console.error('Evaluation error:', error);
    } finally {
      setEvaluating(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setCurrentAnswer('');
      setEvaluation(null);
    } else {
      onComplete(Math.round(totalScore / questions.length));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-background/50 backdrop-blur-xl border-dashed border-2 rounded-3xl border-primary/20">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="mt-4 text-muted-foreground font-medium animate-pulse">Generating your personalized assessment...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
        <Card className="p-8 text-center bg-background/50 backdrop-blur-xl border-dashed border-2 border-primary/20 rounded-3xl">
          <HelpCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold">Unable to generate questions</h3>
          <p className="text-muted-foreground mt-2">Please try again or select another source.</p>
          <Button onClick={() => window.location.reload()} className="mt-4">Retry</Button>
        </Card>
      );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center px-4">
        <div className="text-sm font-bold text-primary/60 uppercase tracking-widest">
          Question {currentIndex + 1} of {questions.length}
        </div>
        <div className="h-2 w-48 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            className="h-full bg-primary"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          <Card className="shadow-2xl border-primary/10 overflow-hidden bg-background/50 backdrop-blur-xl">
            <CardHeader className="pb-4">
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold leading-tight">
                    {currentQuestion.question}
                  </CardTitle>
                  <CardDescription className="text-sm mt-2 font-medium bg-primary/5 px-2 py-0.5 rounded border border-primary/10 inline-block">
                    {currentQuestion.type === 'mcq' ? 'Multiple Choice' : 'Conceptual Answer'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {currentQuestion.type === 'mcq' ? (
                <RadioGroup
                  value={currentAnswer}
                  onValueChange={setCurrentAnswer}
                  className="space-y-3"
                  disabled={!!evaluation}
                >
                  {currentQuestion.options?.map((option, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer hover:bg-muted/50 ${
                        currentAnswer === option ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/30'
                      }`}
                      onClick={() => !evaluation && setCurrentAnswer(option)}
                    >
                      <RadioGroupItem value={option} id={`q-${idx}`} />
                      <Label htmlFor={`q-${idx}`} className="text-lg font-medium cursor-pointer w-full">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Type your explanation here..."
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    className="h-20 text-lg border-2 focus-visible:ring-primary/20"
                    disabled={!!evaluation}
                  />
                  <p className="text-xs text-muted-foreground italic px-1">Describe the concept in your own words for AI evaluation.</p>
                </div>
              )}
            </CardContent>

            <AnimatePresence>
              {evaluation && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="px-6 py-4 bg-muted/30 border-t"
                >
                  <div className="flex gap-4">
                    {evaluation.correct ? (
                      <CheckCircle className="w-8 h-8 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-8 h-8 text-destructive shrink-0" />
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">
                          Score: <span className={evaluation.score >= 70 ? 'text-green-500' : 'text-orange-500'}>{evaluation.score}/100</span>
                        </span>
                        <div className="text-xs font-bold uppercase py-0.5 px-2 bg-muted rounded text-muted-foreground border">AI Feedback</div>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">{evaluation.feedback}</p>
                      {currentQuestion.explanation && (
                        <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                          <p className="text-sm font-medium text-primary">Key Insight:</p>
                          <p className="text-sm italic">{currentQuestion.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <CardFooter className="flex justify-end p-6 gap-3">
              {!evaluation ? (
                <Button
                  size="lg"
                  className="font-bold gap-2 px-8 shadow-lg shadow-primary/20"
                  disabled={!currentAnswer.trim() || evaluating}
                  onClick={handleSubmitAnswer}
                >
                  {evaluating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Submit Answer</>}
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="default"
                  className="font-bold gap-2 px-8"
                  onClick={handleNext}
                >
                  {currentIndex === questions.length - 1 ? 'Finish Challenge' : 'Next Question'}
                </Button>
              )}
            </CardFooter>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default QuestionPanel;
