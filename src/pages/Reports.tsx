import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { motion } from "framer-motion";
import { FileDown, Calendar, Loader2, ClipboardList, GraduationCap, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { API_BASE_URL } from "@/lib/api-config";

import html2canvas from "html2canvas";
import { format } from "date-fns";

export default function Reports() {
  const { user } = useStore();
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-01"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);

  const fetchLogs = async (from: string, to: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/fetch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, startDate: from, endDate: to })
      });
      const data = await res.json();
      return data.logs || [];
    } catch (err) {
      console.error("Failed to fetch logs:", err);
      return [];
    }
  };

  const generatePDF = async (logs: any[], title: string, fileName: string, reportStart: string, reportEnd: string) => {
    try {
      const div = document.createElement("div");
      div.id = "temp-report-container";
      div.className = "p-12 bg-white text-slate-900 font-sans";
      div.style.position = "fixed";
      div.style.left = "-9999px";
      div.style.top = "-9999px";
      div.style.width = "800px";
      
      let tableRows = logs.map((log, index) => `
        <tr style="background-color: ${index % 2 === 0 ? '#f8fafc' : '#ffffff'}">
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 12px;">${format(new Date(log.created_at), "MMM dd, yyyy HH:mm")}</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 12px; font-weight: bold;">${log.type.replace('_', ' ').toUpperCase()}</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 12px;">${log.subject || 'N/A'}</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 12px;">${log.description}</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 12px; font-weight: bold;">${log.score !== null ? `${log.score}/${log.total}` : '-'}</td>
        </tr>
      `).join('');

      div.innerHTML = `
        <div style="display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 32px;">
          <img src="/brainexalogo.png" crossorigin="anonymous" style="width: 48px; height: 48px;" />
          <div>
            <h1 style="font-size: 28px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: -0.5px; margin: 0;">Brainexa AI Report</h1>
            <p style="color: #64748b; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 4px 0 0 0;">Generated securely on: ${format(new Date(), "PPpp")}</p>
          </div>
        </div>

        <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 40px; background-color: #f8fafc; padding: 32px; border-radius: 24px; border: 1px solid #e2e8f0;">
          <div>
            <p style="font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0;">Student Profile</p>
            <p style="font-size: 24px; font-weight: 900; color: #0f172a; margin: 0 0 8px 0;">${user?.name || "Premium Student"}</p>
            <p style="font-size: 14px; color: #475569; font-weight: 500; margin: 0 0 6px 0;">${user?.email || "N/A"}</p>
            <p style="font-size: 14px; color: #475569; font-weight: 500; margin: 0 0 6px 0;">Membership: <span style="background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 900; letter-spacing: 0.5px;">${user?.plan?.toUpperCase() || "FREE"}</span></p>
            <p style="font-size: 14px; font-weight: bold; color: #0f172a; margin: 20px 0 0 0; background: white; padding: 8px 16px; border-radius: 12px; display: inline-block; border: 1px solid #e2e8f0;">${reportStart === reportEnd ? `📅 Report Date: ${reportStart}` : `📅 Report Period: ${reportStart} to ${reportEnd}`}</p>
          </div>
          ${user?.profilePicture ? `
            <img src="${user.profilePicture}" crossorigin="anonymous" style="width: 100px; height: 100px; border-radius: 20px; object-fit: cover; box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1); border: 2px solid white;" />
          ` : `
            <div style="width: 100px; height: 100px; border-radius: 20px; background: linear-gradient(135deg, #6366f1, #a855f7); display: flex; align-items: center; justify-content: center; color: white; font-size: 40px; font-weight: 900; box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.4); border: 2px solid white;">
              ${user?.name?.[0]?.toUpperCase() || "S"}
            </div>
          `}
        </div>

        <div style="border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
          <table style="width: 100%; border-collapse: separate; border-spacing: 0; text-align: left;">
            <thead>
              <tr style="background-color: #6366f1; color: white;">
                <th style="padding: 16px; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #4f46e5;">Date</th>
                <th style="padding: 16px; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #4f46e5;">Activity</th>
                <th style="padding: 16px; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #4f46e5;">Subject</th>
                <th style="padding: 16px; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #4f46e5;">Description</th>
                <th style="padding: 16px; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #4f46e5;">Score</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>

        <div style="margin-top: 60px; border-top: 1px dashed #cbd5e1; padding-top: 30px; text-align: center;">
          <p style="color: #e2e8f0; font-weight: 900; font-size: 32px; text-transform: uppercase; letter-spacing: 8px; margin: 0;">BRAINEXA PREMIUM</p>
          <p style="color: #94a3b8; font-size: 11px; margin-top: 12px; font-weight: bold; letter-spacing: 0.5px;">This document is officially certified by Brainexa AI Mentor</p>
        </div>
      `;

      document.body.appendChild(div);

      // Wait for DOM
      await new Promise(r => setTimeout(r, 100));

      const canvas = await html2canvas(div, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      document.body.removeChild(div);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(fileName);
    } catch (err) {
      console.error("PDF Final Generation Error:", err);
      throw err;
    }
  };

  const handleDownloadFullReport = async () => {
    setLoading(true);
    try {
      const logs = await fetchLogs(startDate, endDate);
      if (logs.length === 0) {
        toast.info("No activity found for this range. (Note: Tracking for reports started just now)");
      } else {
        await generatePDF(logs, "Complete Performance Report", `Brainexa_Report_${startDate}_${endDate}.pdf`, startDate, endDate);
        toast.success("Report downloaded successfully!");
      }
    } catch (err) {
      toast.error("Failed to generate report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTodayReport = async () => {
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const logs = await fetchLogs(today, today);
    if (logs.length === 0) {
      toast.error("No activity recorded for today yet.");
    } else {
      await generatePDF(logs, "Day's Performance Report", `Brainexa_Daily_Report_${today}.pdf`, today, today);
      toast.success("Today's report downloaded!");
    }
    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <header className="mb-12">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Performance Reports</h1>
          <p className="text-muted-foreground">Track your academic progress and download documented reports.</p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Custom Range Report */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-8 border border-border shadow-soft"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl gradient-purple flex items-center justify-center shadow-lg shadow-primary/20">
                <Calendar className="w-6 h-6 text-primary-foreground" />
              </div>
              <h2 className="font-display text-xl font-bold">Custom Range Report</h2>
            </div>

            <div className="space-y-6 mb-10">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">From</label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-secondary rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">To</label>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-secondary rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleDownloadFullReport}
              disabled={loading}
              className="w-full gradient-purple text-primary-foreground py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><FileDown className="w-5 h-5" /> Download PDF Report</>}
            </button>
          </motion.div>

          {/* Quick Stats / Today's Report */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col gap-6"
          >
            <div className="bg-card rounded-2xl p-8 border border-border shadow-soft flex-1">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl gradient-red flex items-center justify-center shadow-lg shadow-accent/20">
                  <RefreshCcw className="w-6 h-6 text-accent-foreground" />
                </div>
                <h2 className="font-display text-xl font-bold">Day's Report</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-8">Get a quick summary of your activities performed today including tasks, quizzes and syllabus updates.</p>
              
              <button
                onClick={handleDownloadTodayReport}
                disabled={loading}
                className="w-full bg-secondary text-foreground py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-secondary/80 transition-all border border-border"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><FileDown className="w-5 h-5" /> Download Today's Report</>}
              </button>
            </div>

            {/* Hint Box */}
            <div className="bg-primary/5 rounded-2xl p-6 border border-primary/20 flex gap-4">
               <GraduationCap className="w-6 h-6 text-primary shrink-0" />
               <p className="text-xs text-primary font-medium leading-relaxed">
                 Reports are officially recognized by Brainexa AI. Premium members receive automatic daily summaries every night at 11:59 PM.
               </p>
            </div>
          </motion.div>
        </div>

        {/* Activity Summary Preview Placeholder or Hint */}
        <div className="mt-12 p-10 bg-secondary/30 rounded-3xl border border-border text-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-display font-semibold text-foreground">Activity Summary</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              Your detailed performance data including weak topics, improvement areas and consistency score is automatically calculated for your PDF reports.
            </p>
        </div>
      </div>
    </AppLayout>
  );
}
