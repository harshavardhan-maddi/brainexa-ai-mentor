import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';

interface ProgressReportProps {
  user: any;
  period: string;
  quizResults: any[];
  studyProgress: number;
  studentSubjects: any[];
}

export const ProgressReport: React.FC<ProgressReportProps> = ({ 
  user, period, quizResults, studyProgress, studentSubjects 
}) => {
  const avgScore = quizResults.length > 0 
    ? Math.round(quizResults.reduce((s, r) => s + (r.score / r.total) * 100, 0) / quizResults.length) 
    : 0;

  const chartData = quizResults.slice(-10).map(r => ({
    name: r.topic.substring(0, 15),
    score: Math.round((r.score / r.total) * 100)
  }));

  const pieData = [
    { name: "Completed", value: studyProgress },
    { name: "Remaining", value: 100 - studyProgress }
  ];
  const pieColors = ["#6366f1", "#f1f5f9"];

  return (
    <div id="progress-report-pdf" className="p-12 bg-white text-slate-900 w-[1000px] min-h-[1414px] font-sans">
      {/* Header */}
      <div className="flex justify-between items-start mb-12 border-b-2 border-slate-100 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <img src="/brainexalogo.png" alt="Brainexa" className="w-12 h-12" />
            <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">Brainexa</h1>
          </div>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">A.I. Study Performance Report</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-primary capitalize">{period} Report</p>
          <p className="text-slate-400 text-sm font-medium mt-1">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </div>

      {/* Student Section */}
      <div className="grid grid-cols-3 gap-8 mb-12">
        <div className="col-span-2 bg-slate-50 rounded-3xl p-8 border border-slate-100">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Student Profile</p>
           <h2 className="text-3xl font-bold text-slate-800 mb-2">{user?.name || "Premium Student"}</h2>
           <p className="text-slate-500 font-medium">{user?.email}</p>
        </div>
        <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100 flex flex-col justify-center">
           <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Overall Rank</p>
           <p className="text-4xl font-black uppercase">Elite</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Study Progress', value: `${studyProgress}%` },
          { label: 'Quizzes Taken', value: quizResults.length },
          { label: 'Average Score', value: `${avgScore}%` },
          { label: 'Active Subjects', value: studentSubjects.length }
        ].map((s, i) => (
          <div key={i} className="border border-slate-100 rounded-2xl p-6 bg-white shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{s.label}</p>
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-10 mb-12">
        {/* Performance Chart */}
        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-2">
             📊 Performance Over Time
          </h3>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Completion Chart */}
        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-2">
             🥧 Syllabus Completion
          </h3>
          <div className="h-64 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
               <span className="text-2xl font-black text-slate-800">{studyProgress}%</span>
               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Mastery</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Breakdown */}
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
        <h3 className="text-lg font-black text-slate-800 mb-6">📚 Subject Mastery Breakdown</h3>
        <div className="space-y-4">
          {studentSubjects.slice(0, 5).map((subject, idx) => {
            const progress = Math.round((subject.topics.filter((t: any) => t.questionsAttempted > 0).length / subject.topics.length) * 100);
            return (
              <div key={idx} className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm font-bold text-slate-700">
                  <span>{subject.subject}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progress}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer / Watermark */}
      <div className="mt-20 pt-12 border-t border-slate-100 text-center">
         <p className="text-slate-300 font-black text-5xl uppercase tracking-[0.4em] opacity-30 select-none">BRAINEXA PREMIUM</p>
         <p className="text-[10px] text-slate-400 font-medium mt-8 italic">This report is generated securely by Brainexa AI Mentor for academic evaluation purposes.</p>
      </div>
    </div>
  );
};
