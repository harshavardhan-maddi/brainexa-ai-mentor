import { lazy, Suspense, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStore } from "@/lib/store";
import { socketService } from "@/lib/socket";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { IntroScreen } from "@/components/IntroScreen";
import { PageSkeleton } from "@/components/PageSkeleton";
import { AnimatePresence } from "framer-motion";

const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Chat = lazy(() => import("./pages/Chat"));
const Quiz = lazy(() => import("./pages/Quiz"));
const StudyPlan = lazy(() => import("./pages/StudyPlan"));
const MaterialsLibrary = lazy(() => import("./pages/MaterialsLibrary"));
const Subscription = lazy(() => import("./pages/Subscription"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));
const MaterialGenerator = lazy(() => import("./pages/MaterialGenerator"));
const Help = lazy(() => import("./pages/Help"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Home = lazy(() => import("./pages/Home"));
const Subjects = lazy(() => import("./pages/Subjects"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function SubscribedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.plan === "free") return <Navigate to="/subscription" state={{ fromRestricted: true }} replace />;
  return <>{children}</>;
}

// Component to handle socket connection
function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useStore();

  useEffect(() => {
    if (user) {
      // Connect to socket when user is logged in
      socketService.connect({ name: user.name, email: user.email });
    }

    return () => {
      // Disconnect when component unmounts or user logs out
      socketService.disconnect();
    };
  }, [user]);

  return <>{children}</>;
}

const App = () => {
  const [showIntro, setShowIntro] = useState(() => {
    return !sessionStorage.getItem("hasSeenIntro");
  });

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SocketProvider>
          <AnimatePresence>
            {showIntro && (
              <IntroScreen 
                key="intro-screen" 
                onComplete={() => {
                  setShowIntro(false);
                  sessionStorage.setItem("hasSeenIntro", "true");
                }} 
              />
            )}
          </AnimatePresence>
          <BrowserRouter>
            <div className="fixed bottom-4 right-4 z-50">
              <ConnectionStatus />
            </div>
            <ErrorBoundary>
              <Suspense fallback={<PageSkeleton />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/home" element={<SubscribedRoute><Home /></SubscribedRoute>} />
                  <Route path="/dashboard" element={<SubscribedRoute><Dashboard /></SubscribedRoute>} />
                  <Route path="/reports" element={<SubscribedRoute><Reports /></SubscribedRoute>} />
                  <Route path="/chat" element={<SubscribedRoute><Chat /></SubscribedRoute>} />
                  <Route path="/quiz" element={<SubscribedRoute><Quiz /></SubscribedRoute>} />
                  <Route path="/materials" element={<SubscribedRoute><MaterialsLibrary /></SubscribedRoute>} />
                  <Route path="/knowledge-base" element={<SubscribedRoute><KnowledgeBase /></SubscribedRoute>} />
                  <Route path="/material-generator" element={<SubscribedRoute><MaterialGenerator /></SubscribedRoute>} />
                  <Route path="/subjects" element={<SubscribedRoute><Subjects /></SubscribedRoute>} />
                  <Route path="/study-plan" element={<ProtectedRoute><StudyPlan /></ProtectedRoute>} />
                  <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/help" element={<Help />} />
                  <Route path="/admin-login" element={<AdminLogin />} />
                  <Route path="/admin-dashboard" element={<AdminDashboard />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </SocketProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

