import React, { useState, useEffect } from 'react';
import { Award, Target, TrendingUp, History, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { API_BASE_URL } from '@/lib/api-config';


interface TopicProgress {
  topic_name: string;
  score: number;
  attempts: number;
  status: 'Completed' | 'Needs Revision' | 'Weak';
  updated_at: string;
}

interface ProgressViewProps {
  userId: string;
}

const ProgressView: React.FC<ProgressViewProps> = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<TopicProgress[]>([]);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/knowledge/progress/${userId}`);
        const data = await response.json();
        if (data.success) {
          setProgress(data.progress);
        }
      } catch (error) {
        console.error('Progress fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [userId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Needs Revision': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'Weak': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle2 className="w-4 h-4" />;
      case 'Needs Revision': return <Clock className="w-4 h-4" />;
      case 'Weak': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse bg-muted/50 h-32" />
        ))}
      </div>
    );
  }

  const completedCount = progress.filter(p => p.status === 'Completed').length;
  const avgScore = progress.length > 0 ? Math.round(progress.reduce((acc, p) => acc + p.score, 0) / progress.length) : 0;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/10 shadow-lg shadow-primary/5 bg-gradient-to-br from-background to-primary/5 overflow-hidden group">
          <CardHeader className="pb-2 space-y-0">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-primary/60">Total Mastery</CardDescription>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl font-extrabold">{progress.length}</CardTitle>
              <Award className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-xs font-medium text-muted-foreground mt-1">Topics investigated</p>
          </CardHeader>
        </Card>

        <Card className="border-indigo-500/10 shadow-lg shadow-indigo-500/5 bg-gradient-to-br from-background to-indigo-500/5 overflow-hidden group">
          <CardHeader className="pb-2 space-y-0">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-indigo-500/60">Success Rate</CardDescription>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl font-extrabold">{completedCount}</CardTitle>
              <Target className="w-8 h-8 text-indigo-500 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-xs font-medium text-muted-foreground mt-1">Completed topics</p>
          </CardHeader>
        </Card>

        <Card className="border-green-500/10 shadow-lg shadow-green-500/5 bg-gradient-to-br from-background to-green-500/5 overflow-hidden group">
          <CardHeader className="pb-2 space-y-0">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-green-500/60">Average Score</CardDescription>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl font-extrabold">{avgScore}%</CardTitle>
              <TrendingUp className="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-xs font-medium text-muted-foreground mt-1">Across all sessions</p>
          </CardHeader>
        </Card>

        <Card className="border-purple-500/10 shadow-lg shadow-purple-500/5 bg-gradient-to-br from-background to-purple-500/5 overflow-hidden group">
          <CardHeader className="pb-2 space-y-0">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-purple-500/60">Total Efforts</CardDescription>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl font-extrabold">{progress.reduce((acc, p) => acc + p.attempts, 0)}</CardTitle>
              <History className="w-8 h-8 text-purple-500 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-xs font-medium text-muted-foreground mt-1">Retrieved insights</p>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-primary/10 shadow-xl overflow-hidden bg-background/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Session History</CardTitle>
            <CardDescription>A detailed view of your topic mastery and engagement levels.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {progress.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-bold">No sessions recorded yet.</p>
                <p className="text-sm">Start your exploration in the Knowledge Base!</p>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {progress.map((item, index) => (
                  <div key={index} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/10 transition-colors group">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-lg group-hover:text-primary transition-colors">{item.topic_name}</h4>
                        <Badge variant="outline" className={`${getStatusColor(item.status)} flex items-center gap-1 font-bold`}>
                          {getStatusIcon(item.status)}
                          {item.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4 font-medium">
                        <span className="flex items-center gap-1"><History className="w-3 h-3" /> {item.attempts} attempts</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(item.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="w-full md:w-48 space-y-1">
                      <div className="flex justify-between text-sm font-bold">
                        <span>Mastery</span>
                        <span className={item.score >= 80 ? 'text-green-500' : 'text-primary'}>{item.score}%</span>
                      </div>
                      <Progress value={item.score} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-xl overflow-hidden bg-background/50 backdrop-blur-xl h-fit">
          <CardHeader>
            <CardTitle>Mastery Distribution</CardTitle>
            <CardDescription>Your progress across the learning spectrum.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-green-500">Completed</span>
                <span>{completedCount}</span>
              </div>
              <Progress value={progress.length > 0 ? (completedCount / progress.length) * 100 : 0} className="bg-green-500/10 text-green-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-orange-500">Needs Revision</span>
                <span>{progress.filter(p => p.status === 'Needs Revision').length}</span>
              </div>
              <Progress value={progress.length > 0 ? (progress.filter(p => p.status === 'Needs Revision').length / progress.length) * 100 : 0} className="bg-orange-500/10" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-destructive">Weak</span>
                <span>{progress.filter(p => p.status === 'Weak').length}</span>
              </div>
              <Progress value={progress.length > 0 ? (progress.filter(p => p.status === 'Weak').length / progress.length) * 100 : 0} className="bg-destructive/10" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProgressView;
