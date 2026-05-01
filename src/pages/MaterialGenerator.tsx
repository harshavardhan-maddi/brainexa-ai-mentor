import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, GraduationCap, Zap, CheckCircle, AlertTriangle, 
  Sparkles, Loader2, Printer, History, Clock, ChevronRight,
  ListOrdered, Layout, HelpCircle, FileText, FastForward
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import { LoadingStatus } from '../components/LoadingStatus';
import { API_BASE_URL, PY_API_BASE_URL } from '@/lib/api-config';


const BACKEND_URL = PY_API_BASE_URL;
const NODE_API_URL = `${API_BASE_URL}/api`;


// Mermaid initialization
mermaid.initialize({
  startOnLoad: true,
  theme: 'base',
  themeVariables: {
    primaryColor: '#8B5CF6',
    primaryTextColor: '#fff',
    primaryBorderColor: '#7C3AED',
    lineColor: '#94A3B8',
    secondaryColor: '#f3f4f6',
    tertiaryColor: '#fff'
  }
});

const MermaidChart = ({ chart }: { chart: string }) => {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (ref.current && chart) {
      ref.current.removeAttribute('data-processed');
      mermaid.contentLoaded();
      mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart).then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg;
      });
    }
  }, [chart]);

  return <div ref={ref} className="flex justify-center my-8 p-6 bg-secondary/30 rounded-[2rem] border border-border/50 overflow-hidden" />;
};

interface IndexItem {
  section: string;
  subsections: string[];
}

interface StructuredMaterial {
  topic_name: string;
  subject: string;
  difficulty_level: string;
  created_at: string;
  preview: string;
  index: IndexItem[];
  content: string;
  exam_questions: string[];
  short_answers: string[];
  quick_revision: string;
}

interface MaterialHistoryItem {
  subject: string;
  topics: string[];
  full_material?: StructuredMaterial;
  createdAt: string;
}

export default function MaterialGenerator() {
  const { user, addLearningMaterial } = useStore();
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [topics, setTopics] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [material, setMaterial] = useState<StructuredMaterial | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [performanceStatus, setPerformanceStatus] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isGenerated, setIsGenerated] = useState(false);
  const [history, setHistory] = useState<MaterialHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'exam' | 'revision'>('content');
  const [isAddedToLibrary, setIsAddedToLibrary] = useState(false);

  useEffect(() => {
    fetchPerformance();
    fetchHistory();
  }, [user]);

  const fetchPerformance = async () => {
    if (!user?.id) return;
    setStatusLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/knowledge/performance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        setPerformanceStatus(data.performance);
      }
    } catch (e) {
      console.error('Failed to fetch performance', e);
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${NODE_API_URL}/materials/history/${user.id}`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
      }
    } catch (e) {
      console.error('Failed to fetch history', e);
    }
  };

  const saveToHistory = async (sub: string, tops: string[], mat?: StructuredMaterial) => {
    if (!user?.id) return;
    try {
      await fetch(`${NODE_API_URL}/materials/save-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          subject: sub, 
          topics: tops,
          material: mat 
        }),
      });
      fetchHistory(); // Refresh
    } catch (e) {
      console.error('Failed to save history', e);
    }
  };

  const [isAdding, setIsAdding] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const addToLibrary = async () => {
    const finalMat = material;
    if (finalMat && !isAddedToLibrary) {
      setIsAdding(true);
      try {
        const newId = crypto.randomUUID();
        await addLearningMaterial({
          id: newId,
          title: finalMat.topic_name,
          subject: finalMat.subject,
          type: "generated",
          format: "notes",
          content: JSON.stringify(finalMat),
          createdAt: new Date().toISOString()
        });
        setLastAddedId(newId);
        setIsAddedToLibrary(true);
      } finally {
        setIsAdding(false);
      }
    }
  };

  const generate = async () => {
    if (!subject) return;
    const topicList = topics.split(',').map(t => t.trim()).filter(Boolean);
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/knowledge/generate-material`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          topics: topicList,
          customInstructions,
          userId: user?.id,
          performance: performanceStatus
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.material) {
          setMaterial(data.material);
        } else {
          // Fallback if AI didn't return perfect JSON
          setMaterial({
            topic_name: topicList.join(', '),
            subject,
            difficulty_level: 'beginner',
            created_at: new Date().toISOString().split('T')[0],
            preview: 'AI-generated study guide.',
            index: [],
            content: data.content || 'Failed to parse content.',
            exam_questions: [],
            short_answers: [],
            quick_revision: ''
          });
        }
        setIsGenerated(true);
        saveToHistory(subject, topicList, data.material || material);
        setIsAddedToLibrary(false);
      } else {
        setError(data.error || 'Failed to generate material');
      }
    } catch (e) {
      setError('Network error: Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string | null) => {
    switch (status) {
      case 'Perfect': return { color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle, label: 'Perfect' };
      case 'High': return { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Zap, label: 'High' };
      case 'Better': return { color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Sparkles, label: 'Better' };
      case 'Weak': return { color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertTriangle, label: 'Weak' };
      default: return { color: 'text-muted-foreground', bg: 'bg-muted/10', icon: GraduationCap, label: 'Calculating...' };
    }
  };

  const status = getStatusConfig(performanceStatus);

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-content, #printable-content * { visibility: visible; }
          #printable-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 40px;
            background: white !important;
            color: black !important;
          }
          .no-print { display: none !important; }
          h1 { font-size: 28pt; margin-bottom: 20pt; color: black; }
          h2 { font-size: 20pt; margin-top: 30pt; border-bottom: 2pt solid #eee; padding-bottom: 10pt; }
          h3 { font-size: 16pt; margin-top: 20pt; font-weight: bold; }
          p { font-size: 12pt; line-height: 1.6; margin-bottom: 15pt; }
          table { width: 100%; border-collapse: collapse; margin: 20pt 0; }
          th, td { border: 1pt solid #ddd; padding: 10pt; text-align: left; font-size: 11pt; }
          th { background-color: #f9f9f9 !important; }
          mark { background-color: #ff0 !important; color: black !important; padding: 0 2pt; }
          .page-break { page-break-before: always; }
        }
      `}</style>

      {/* Module Title */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black font-display tracking-tight text-foreground">
              {isGenerated ? material?.topic_name : 'Material Generator'}
            </h1>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mt-1">
              Academic Hub • {history.length} Materials Generated
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {history.length > 0 && !isGenerated && (
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-sm font-bold transition-all"
            >
              <History className="w-4 h-4" />
              {showHistory ? 'Close History' : 'View History'}
            </button>
          )}
          {isGenerated && (
            <button 
              onClick={() => { setIsGenerated(false); setMaterial(null); }}
              className="text-sm font-bold text-primary hover:underline"
            >
              Create New
            </button>
          )}
        </div>
      </div>

      {!isGenerated && showHistory && (
        <section className="bg-card border border-border rounded-3xl overflow-hidden animate-in slide-in-from-top-4 duration-500 no-print">
          <div className="p-6 border-b border-border bg-muted/30">
            <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" /> Recent Generations
            </h2>
          </div>
          <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
            {history.map((item, i) => (
              <div 
                key={i} 
                className="p-4 hover:bg-secondary/50 transition-colors group cursor-pointer"
                onClick={() => {
                  setSubject(item.subject);
                  setTopics(item.topics.join(', '));
                  if (item.full_material) {
                    setMaterial(item.full_material);
                    setIsGenerated(true);
                  }
                  setShowHistory(false);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{item.subject}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{item.topics.join(', ')}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!isGenerated && (
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-premium backdrop-blur-sm no-print">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-primary/10 blur-3xl rounded-full" />
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${status.bg} ${status.color}`}>
              <status.icon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Performance Analyzer</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xl font-bold ${status.color}`}>
                  {statusLoading ? 'Analyzing...' : status.label}
                </span>
                {!statusLoading && (
                  <span className="text-xs text-muted-foreground font-medium">
                    Based on your previous quiz results
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {!isGenerated ? (
        <section className="space-y-6 no-print">
          <div className="grid gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Subject Name</label>
              <input
                type="text"
                placeholder="e.g., Operating Systems, Python, Mathematics..."
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Specific Topics</label>
              <textarea
                placeholder="Topic A, Topic B..."
                value={topics}
                onChange={e => setTopics(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm outline-none h-32 resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Custom Requirements (Optional)</label>
              <textarea
                placeholder="e.g., Add flowcharts, use real-life examples, include images, keep it very simple..."
                value={customInstructions}
                onChange={e => setCustomInstructions(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm outline-none h-24 resize-none"
              />
            </div>
          </div>

            <button
              onClick={generate}
              disabled={loading || !subject || !performanceStatus}
              className="group relative w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-black rounded-2xl shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            >
              <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
              {loading ? (
                <div className="flex flex-col items-center">
                   <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Synthesizing...</span>
                   </div>
                   <LoadingStatus 
                      isLoading={true} 
                      steps={['Searching sources...', 'Refining content...', 'Generating visuals...']}
                   />
                </div>
              ) : (
                <>
                  <BookOpen className="w-5 h-5" />
                  <span>Generate Expert Material</span>
                </>
              )}
            </button>
          
          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium animate-in slide-in-from-top-2">
              {error}
            </div>
          )}
        </section>
      ) : (
        <section className="animate-in zoom-in-95 duration-500 space-y-6">
          {/* Metadata & Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-border rounded-2xl p-4 no-print">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Subject</p>
                <p className="text-sm font-bold text-foreground">{material?.subject}</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Level</p>
                <p className="text-sm font-bold text-primary capitalize">{material?.difficulty_level}</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Date</p>
                <p className="text-sm font-bold text-foreground">{material?.created_at}</p>
              </div>
            </div>
              <button 
                onClick={() => window.print()} 
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-purple text-primary-foreground shadow-lg hover:scale-105 transition-all text-sm font-bold"
              >
                <Printer className="w-4 h-4" />
                Download PDF
              </button>
              <button 
                onClick={addToLibrary}
                disabled={isAddedToLibrary || isAdding}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl shadow-lg transition-all text-sm font-bold ${isAddedToLibrary ? 'bg-green-500 text-white opacity-80 cursor-default' : isAdding ? 'bg-amber-400 cursor-wait' : 'bg-amber-500 text-white hover:scale-105'}`}
              >
                {isAdding ? (
                   <Loader2 className="w-4 h-4 animate-spin" />
                ) : isAddedToLibrary ? (
                   <CheckCircle className="w-4 h-4" />
                ) : (
                   <BookOpen className="w-4 h-4" />
                )}
                {isAdding ? 'Adding...' : isAddedToLibrary ? 'Added to Library' : 'Add to Read Material'}
              </button>

              {isAddedToLibrary && (
                <button 
                  onClick={() => navigate(`/materials?id=${lastAddedId}`)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white shadow-lg hover:scale-105 transition-all text-sm font-bold"
                >
                  <FastForward className="w-4 h-4" />
                  View Material
                </button>
              )}
            </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar: Index & Preview */}
            <aside className="lg:w-1/3 space-y-6 no-print">
              <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Layout className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-foreground">Topic Preview</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed italic">
                  "{material?.preview}"
                </p>
              </div>

              {material?.index && material.index.length > 0 && (
                <div className="bg-card border border-border rounded-3xl p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <ListOrdered className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-foreground tracking-tight">Index</h3>
                  </div>
                  <div className="space-y-4">
                    {material.index.map((idx, i) => (
                      <div key={i} className="space-y-2">
                        <p className="text-sm font-bold text-foreground flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                          {idx.section}
                        </p>
                        <ul className="pl-6 space-y-1.5 border-l border-border ml-0.5">
                          {idx.subsections.map((sub, si) => (
                            <li key={si} className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                              {sub}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>

            {/* Main Content Area */}
            <div className="lg:w-2/3 space-y-6">
              {/* Tab Navigation */}
              <div className="flex p-1 bg-muted rounded-2xl no-print">
                <button 
                  onClick={() => setActiveTab('content')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'content' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <BookOpen className="w-4 h-4" /> Study Guide
                </button>
                <button 
                  onClick={() => setActiveTab('exam')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'exam' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <HelpCircle className="w-4 h-4" /> Exam Prep
                </button>
                <button 
                  onClick={() => setActiveTab('revision')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'revision' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <FastForward className="w-4 h-4" /> Quick Revision
                </button>
              </div>

              <div id="printable-content" className="bg-card border border-border rounded-3xl shadow-premium overflow-hidden">
                {/* Print Only Header */}
                <div className="hidden print:block p-10 border-b-2 border-slate-100">
                  <h1 className="text-4xl font-bold">{material?.topic_name}</h1>
                  <p className="text-slate-500 uppercase tracking-widest text-sm font-bold mt-2">{material?.subject} • {material?.difficulty_level} Level</p>
                </div>

                <div className="p-8 lg:p-10">
                  {activeTab === 'content' && (
                    <div className="prose prose-indigo dark:prose-invert max-w-none">
                      <ReactMarkdown 
                        components={{
                          h1: ({node, ...props}) => <h1 className="text-3xl font-black mb-6 text-foreground" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-2xl font-bold mb-4 mt-8 border-b pb-2 text-foreground" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-xl font-bold mb-3 mt-6 text-foreground" {...props} />,
                          p: ({node, ...props}) => <p className="mb-5 text-muted-foreground leading-relaxed" {...props} />,
                          li: ({node, ...props}) => <li className="text-muted-foreground mb-1.5" {...props} />,
                          table: ({node, ...props}) => <div className="overflow-x-auto my-8"><table className="min-w-full border-collapse border border-border" {...props} /></div>,
                          th: ({node, ...props}) => <th className="bg-muted p-4 border border-border font-black text-left text-xs uppercase tracking-widest" {...props} />,
                          td: ({node, ...props}) => <td className="p-4 border border-border text-sm" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-bold text-foreground" {...props} />,
                          code: ({node, inline, className, children, ...props}: any) => {
                            const match = /language-(\w+)/.exec(className || '');
                            if (!inline && match && match[1] === 'mermaid') {
                              return <MermaidChart chart={String(children).replace(/\n$/, '')} />;
                            }
                            return <code className="bg-secondary px-1.5 py-0.5 rounded font-mono text-xs text-primary" {...props}>{children}</code>;
                          },
                        }}
                      >
                        {material?.content || ''}
                      </ReactMarkdown>
                    </div>
                  )}

                  {activeTab === 'exam' && (
                    <div className="space-y-12">
                      <div className="space-y-6">
                        <h2 className="text-2xl font-black text-foreground flex items-center gap-3">
                          <FileText className="w-6 h-6 text-primary" /> Important Exam Questions
                        </h2>
                        <div className="grid gap-4">
                          {material?.exam_questions.map((q, i) => (
                            <div key={i} className="p-5 bg-secondary/30 rounded-2xl border border-border/50 hover:border-primary/30 transition-all">
                              <p className="text-sm font-bold text-foreground leading-snug">
                                <span className="text-primary mr-2">Q{i+1}.</span> {q}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h2 className="text-2xl font-black text-foreground flex items-center gap-3">
                          <CheckCircle className="w-6 h-6 text-green-500" /> Precise Short Answers
                        </h2>
                        <div className="space-y-6">
                          {material?.short_answers.map((a, i) => (
                            <div key={i} className="space-y-2">
                              <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">Question {i+1}</p>
                              <p className="text-sm text-foreground bg-green-500/5 p-4 rounded-2xl border border-green-500/10 leading-relaxed italic">
                                {a}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'revision' && (
                    <div className="space-y-8">
                       <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 rounded-2xl gradient-purple flex items-center justify-center">
                             <FastForward className="w-6 h-6 text-primary-foreground" />
                          </div>
                          <div>
                             <h2 className="text-2xl font-black text-foreground tracking-tight">Last-Day Revision</h2>
                             <p className="text-xs font-bold text-primary uppercase tracking-widest">Synthesized Essentials</p>
                          </div>
                       </div>
                       <div className="p-8 bg-muted/30 rounded-[2rem] border border-dashed border-border leading-loose text-foreground">
                          <ReactMarkdown>{material?.quick_revision || ''}</ReactMarkdown>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                             <p className="text-[10px] font-black uppercase text-primary mb-1">Time to Revise</p>
                             <p className="text-sm font-bold">~15 Minutes</p>
                          </div>
                          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                             <p className="text-[10px] font-black uppercase text-primary mb-1">Retention Tip</p>
                             <p className="text-sm font-bold">Write down the Index</p>
                          </div>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}




