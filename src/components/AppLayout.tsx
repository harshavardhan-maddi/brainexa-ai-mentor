import { Link, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { BookOpen, LayoutDashboard, MessageSquare, GraduationCap, CreditCard, FileText, LogOut, Menu, X, User, Settings as SettingsIcon, HelpCircle as HelpIcon, Home as HomeIcon } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, studyPlan } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const studyPlanLength = studyPlan.length;

  const navItems = [
    { path: "/home", label: "Home", icon: HomeIcon, premium: true },
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, premium: true },
    { path: "/subjects", label: "Subjects", icon: BookOpen, premium: true },
    { path: "/reports", label: "Download Report", icon: FileText, premium: true },
    { 
      path: "/study-plan", 
      label: studyPlanLength > 0 ? "Study Plan" : "Study Planner", 
      icon: FileText,
      premium: false
    },
    { path: "/chat", label: "AI Mentor", icon: MessageSquare, premium: true },
    { path: "/knowledge-base", label: "Knowledge Engine", icon: BookOpen, premium: true },
    { path: "/quiz", label: "Quizzes", icon: GraduationCap, premium: true },
    { path: "/material-generator", label: "Material Generator", icon: BookOpen, premium: true },
    { path: "/materials", label: "Read Material", icon: BookOpen, premium: true },
    { path: "/help", label: "Help Center", icon: HelpIcon, premium: false },
    { path: "/settings", label: "Settings", icon: SettingsIcon, premium: false },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (user?.plan === "premium") return item.path !== "/subscription"; // Hide subscription if already premium
    return !item.premium || item.path === "/subscription" || item.path === "/study-plan";
  });

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile Menu Toggle */}
      <button 
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-[100] p-2.5 bg-card/80 backdrop-blur-md border border-border rounded-xl shadow-sm hover:scale-105 transition-all"
      >
        {mobileOpen ? <X className="w-6 h-6 text-foreground" /> : <Menu className="w-6 h-6 text-foreground" />}
      </button>

      {/* Floating Profile Icon - Removed the bar and left-side branding for a cleaner look */}
      <div className="fixed top-4 right-4 lg:top-8 lg:right-8 z-[100]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1.5 rounded-full bg-card/80 backdrop-blur-md border border-border shadow-premium hover:scale-105 transition-all">
              <Avatar className="w-9 h-9 lg:w-10 lg:h-10">
                <AvatarImage src={user?.profilePicture} className="object-cover" />
                <AvatarFallback className="gradient-purple text-primary-foreground text-sm font-black shadow-inner">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-2xl shadow-premium border-border/50">
            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pb-2">Student Identity</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-3 py-3">
              <p className="text-sm font-bold text-foreground">{user?.name || "Premium Student"}</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{user?.email}</p>
              <div className="mt-4 flex items-center gap-2">
                 <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full">Elite Member</span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")} className="font-bold py-3 cursor-pointer">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-700 font-bold py-3 cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card p-6 gap-2">
        <Link to="/dashboard" className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center p-1 bg-card border border-border shadow-sm">
            <img src="/brainexalogo.png" alt="Brainexa Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">Brainexa</span>
        </Link>

        <nav className="flex flex-col gap-1 flex-1">
          {filteredNavItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border pt-4 mt-4">
          <div className="flex items-center gap-3 mb-3 px-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.profilePicture} className="object-cover" />
              <AvatarFallback className="gradient-purple text-primary-foreground text-sm font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.name || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-card pt-14">
          <nav className="flex flex-col gap-1 p-4">
            {filteredNavItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main content - Removed pt-18 as header is no longer fixed */}
      <main className="flex-1 p-4 pt-6 lg:p-8 lg:pt-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
