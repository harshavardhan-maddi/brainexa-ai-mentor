import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Shield, LogOut, Search, Filter, 
  Trash2, Unlock, Lock, RefreshCw, Download,
  Calendar, Clock, BookOpen, ChevronDown, FileText, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/api-config";


interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
  is_blocked: boolean;
  study_progress: number;
  study_start_date: string | null;
  study_end_date: string | null;
  status: 'Active' | 'At Risk' | 'Struggling' | 'High Performer' | 'Standard';
  subjects: string[];
  last_login: string | null;
  last_logout: string | null;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const navigate = useNavigate();

  const admin = JSON.parse(localStorage.getItem("adminUser") || "null");

  useEffect(() => {
    if (!admin || admin.role !== 'admin' || !admin.id) {
      localStorage.removeItem("adminUser");
      navigate("/admin-login");
      return;
    }
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    console.log("🚀 Admin: Fetching students...");
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: { "x-user-id": admin.id }
      });
      const data = await res.json();
      console.log("📊 Admin: Received data:", data);
      if (data.success) {
        setUsers(data.users);
      } else {
        console.error("❌ Admin: Fetch failed:", data.error);
        toast.error(data.error || "Failed to fetch students");
      }
    } catch (error) {
      console.error("🔥 Admin: Network error:", error);
      toast.error("Failed to fetch students. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserReport = async (userId: string) => {
    try {
      const query = new URLSearchParams({
        start: dateRange.start,
        end: dateRange.end
      }).toString();
      
      const res = await fetch(`${API_BASE_URL}/api/admin/user/${userId}/report?${query}`, {
        headers: { "x-user-id": admin.id }
      });
      const data = await res.json();
      if (data.success) setReportData(data.report);
    } catch (error) {
      toast.error("Failed to fetch report");
    }
  };

  const downloadReport = (user: User) => {
    if (!reportData) return;
    
    const content = `
STUDENT PROGRESS REPORT
-----------------------
Name: ${user.name}
Email: ${user.email}
Account Created: ${new Date(user.created_at).toLocaleString()}
Generated At: ${new Date().toLocaleString()}

Current Progress: ${user.study_progress}%
Schedule: ${user.study_start_date ? new Date(user.study_start_date).toLocaleDateString() : 'N/A'} - ${user.study_end_date ? new Date(user.study_end_date).toLocaleDateString() : 'N/A'}
Status: ${user.study_progress >= 100 ? 'COMPLETED' : 'IN PROGRESS'}
Subjects: ${user.subjects.join(", ")}

ACTIVITY LOGS:
${reportData.activities.map((a: any) => `[${new Date(a.timestamp).toLocaleString()}] ${a.action}`).join("\n")}

QUIZ RESULTS:
${reportData.quizResults.map((q: any) => `[${new Date(q.date).toLocaleDateString()}] ${q.subject} - ${q.topic}: ${q.score}/${q.total}`).join("\n")}
    `;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Report_${user.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded successfully");
  };

  const handleAction = async (action: string, userId: string, extra?: any) => {
    try {
      let endpoint = "";
      let method = "POST";
      let body = {};

      if (action === 'block') {
        endpoint = `${API_BASE_URL}/api/admin/user/${userId}/block`;
        body = { block: extra };
      } else if (action === 'reset') {
        endpoint = `${API_BASE_URL}/api/admin/user/${userId}/reset`;
      } else if (action === 'delete') {
        endpoint = `${API_BASE_URL}/api/admin/user/${userId}`;
        method = "DELETE";
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 
          "x-user-id": admin.id,
          "Content-Type": "application/json"
        },
        body: method === "POST" ? JSON.stringify(body) : undefined
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Action successful`);
        fetchUsers();
      }
    } catch (error) {
      toast.error("Action failed");
    }
  };

  const logout = () => {
    localStorage.removeItem("adminUser");
    navigate("/admin-login");
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-20 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl leading-none">Brainexa <span className="text-primary text-xs font-mono ml-1">ADMIN</span></h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-1">Unified Student Intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-xl border border-border/50">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs text-primary">
              {admin.name?.[0]}
            </div>
            <span className="text-sm font-bold text-foreground">{admin.name}</span>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors text-sm font-bold"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-full mx-auto w-full">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
           <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Students</p>
              <h3 className="text-3xl font-black">{users.length}</h3>
           </div>
           <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Active Now</p>
              <h3 className="text-3xl font-black">{users.filter(u => u.last_login && (!u.last_logout || new Date(u.last_login) > new Date(u.last_logout))).length}</h3>
           </div>
           <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1">Completed</p>
              <h3 className="text-3xl font-black">{users.filter(u => u.study_progress >= 100).length}</h3>
           </div>
           <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Avg Progress</p>
              <h3 className="text-3xl font-black">
                {users.length > 0 ? Math.round(users.reduce((acc, u) => acc + (u.study_progress || 0), 0) / users.length) : 0}%
              </h3>
           </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 rounded-2xl bg-card border-border/50 focus:ring-primary/30" 
            />
          </div>
          <Button variant="outline" onClick={fetchUsers} className="h-12 px-6 rounded-2xl gap-2 font-bold border-border/50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {/* Student Table */}
        <div className="bg-card border border-border rounded-[2.5rem] shadow-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Student Identity</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Account Info</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Scheduled Period</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Learning & Subjects</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Last Sessions</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-20 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-4">
                        <Users className="w-12 h-12 opacity-20" />
                        <div>
                          <p className="font-bold text-lg">No students found</p>
                          <p className="text-sm">Try adjusting your search or refresh the page.</p>
                        </div>
                        <Button onClick={fetchUsers} variant="outline" className="rounded-xl">
                          <RefreshCw className="w-4 h-4 mr-2" /> Refresh Data
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/10 transition-colors group">
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center font-black text-primary border border-primary/10">
                            {u.name[0]}
                          </div>
                          <div>
                            <p className="font-bold text-foreground leading-none mb-1">{u.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                         <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-foreground">Created: {new Date(u.created_at).toLocaleDateString()}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">ID: {u.id.substring(0, 8)}...</span>
                         </div>
                      </td>
                      <td className="p-6">
                        <div className="flex flex-col gap-1 text-[11px]">
                           {u.study_start_date ? (
                             <>
                               <div className="flex items-center gap-1.5 text-foreground font-bold">
                                 <Calendar className="w-3 h-3 text-primary" />
                                 {new Date(u.study_start_date).toLocaleDateString()} - {new Date(u.study_end_date || '').toLocaleDateString()}
                               </div>
                               <span className="text-[9px] text-muted-foreground">Total Period: {Math.ceil((new Date(u.study_end_date || '').getTime() - new Date(u.study_start_date).getTime()) / (1000 * 3600 * 24))} Days</span>
                             </>
                           ) : (
                             <span className="text-muted-foreground italic">No schedule set</span>
                           )}
                        </div>
                      </td>
                      <td className="p-6">
                         <div className="flex flex-col gap-2 max-w-[250px]">
                            <div className="flex flex-wrap gap-1">
                               {u.subjects.length > 0 ? u.subjects.slice(0, 3).map((s, i) => (
                                 <span key={i} className="text-[9px] font-bold px-2 py-0.5 bg-secondary rounded-md border border-border/50 truncate max-w-[100px]">
                                   {s}
                                 </span>
                               )) : <span className="text-[9px] text-muted-foreground italic">No subjects</span>}
                               {u.subjects.length > 3 && <span className="text-[9px] font-bold px-2 py-0.5 bg-secondary rounded-md border border-border/50">+{u.subjects.length - 3}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                               <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary transition-all duration-500" style={{ width: `${u.study_progress}%` }} />
                               </div>
                               <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-black text-primary">{u.study_progress}%</span>
                                  {u.study_progress >= 100 && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                               </div>
                            </div>
                            {u.study_progress >= 100 ? (
                               <span className="text-[9px] font-black uppercase text-emerald-500 flex items-center gap-1">
                                  <CheckCircle className="w-2.5 h-2.5" /> Completed
                               </span>
                            ) : (
                               <span className="text-[9px] font-black uppercase text-muted-foreground">In Progress</span>
                            )}
                         </div>
                      </td>
                      <td className="p-6">
                         <div className="flex flex-col gap-1.5 text-[10px]">
                            <div className="flex items-center gap-2 text-emerald-500 px-2 py-1 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                               <Clock className="w-3 h-3" />
                               <span className="font-bold">In: {u.last_login ? new Date(u.last_login).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-rose-500 px-2 py-1 bg-rose-500/5 rounded-lg border border-rose-500/10">
                               <LogOut className="w-3 h-3" />
                               <span className="font-bold">Out: {u.last_logout ? new Date(u.last_logout).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Active'}</span>
                            </div>
                         </div>
                      </td>
                      <td className="p-6 text-right">
                         <div className="flex items-center justify-end gap-2">
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             onClick={() => {
                               setSelectedUser(u);
                               fetchUserReport(u.id);
                             }}
                             className="hover:bg-primary/10 hover:text-primary rounded-xl"
                             title="Report & Progress"
                           >
                             <FileText className="w-4 h-4" />
                           </Button>
                           <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleAction('reset', u.id)}
                                className="hover:bg-amber-500/10 hover:text-amber-500 rounded-xl"
                                title="Reset Progress"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleAction('block', u.id, !u.is_blocked)}
                                className={`rounded-xl ${u.is_blocked ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-amber-500 hover:bg-amber-500/10'}`}
                                title={u.is_blocked ? "Unblock" : "Block"}
                              >
                                {u.is_blocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleAction('delete', u.id)}
                                className="text-rose-500 hover:bg-rose-500/10 rounded-xl"
                                title="Delete Account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                           </div>
                         </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Report Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-xl p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border border-border w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col my-8"
            >
               <div className="p-8 border-b border-border flex justify-between items-center bg-muted/20">
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center font-black text-2xl text-primary-foreground">
                        {selectedUser.name[0]}
                     </div>
                     <div>
                        <h2 className="text-2xl font-display font-bold leading-none">{selectedUser.name}</h2>
                        <p className="text-muted-foreground text-sm mt-1">Detailed Progress Report</p>
                     </div>
                  </div>
                  <button onClick={() => { setSelectedUser(null); setReportData(null); }} className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
                     <X className="w-5 h-5" />
                  </button>
               </div>

               <div className="p-8 space-y-8 flex-1">
                  {/* Date Picker */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Period Start</label>
                        <Input 
                          type="date" 
                          value={dateRange.start} 
                          onChange={(e) => {
                            setDateRange(prev => ({ ...prev, start: e.target.value }));
                            if (selectedUser) fetchUserReport(selectedUser.id);
                          }}
                          className="rounded-xl"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Period End</label>
                        <Input 
                          type="date" 
                          value={dateRange.end} 
                          onChange={(e) => {
                            setDateRange(prev => ({ ...prev, end: e.target.value }));
                            if (selectedUser) fetchUserReport(selectedUser.id);
                          }}
                          className="rounded-xl"
                        />
                     </div>
                  </div>

                  {reportData ? (
                    <div className="space-y-6">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
                             <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Activities</p>
                             <p className="text-xl font-bold">{reportData.activities.length}</p>
                          </div>
                          <div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
                             <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Quizzes Completed</p>
                             <p className="text-xl font-bold">{reportData.quizResults.length}</p>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <h4 className="text-sm font-black uppercase tracking-widest text-foreground">Recent Activity History</h4>
                          <div className="max-h-[200px] overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                             {reportData.activities.map((a: any, i: number) => (
                               <div key={i} className="flex justify-between items-center text-xs p-3 bg-card border border-border rounded-xl">
                                  <span className="font-bold capitalize">{a.action}</span>
                                  <span className="text-muted-foreground">{new Date(a.timestamp).toLocaleString()}</span>
                               </div>
                             ))}
                             {reportData.activities.length === 0 && <p className="text-center text-xs text-muted-foreground py-4 italic">No activity logs found for this period.</p>}
                          </div>
                       </div>
                    </div>
                  ) : (
                    <div className="py-20 flex flex-col items-center gap-4 text-muted-foreground">
                       <RefreshCw className="w-8 h-8 animate-spin" />
                       <p className="font-bold">Analyzing student data...</p>
                    </div>
                  )}
               </div>

               <div className="p-8 bg-muted/20 border-t border-border flex gap-4">
                  <Button 
                    className="flex-1 h-12 rounded-2xl font-bold gap-2"
                    disabled={!reportData}
                    onClick={() => downloadReport(selectedUser!)}
                  >
                    <Download className="w-4 h-4" /> Download Full Data
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 h-12 rounded-2xl font-bold"
                    onClick={() => { setSelectedUser(null); setReportData(null); }}
                  >
                    Close
                  </Button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
