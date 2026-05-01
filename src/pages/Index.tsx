import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { motion } from "framer-motion";
import { BookOpen, Brain, GraduationCap, BarChart3, MessageSquare, ArrowRight, Shield } from "lucide-react";

export default function Index() {
  const { user } = useStore();

  if (user) {
    // Redirect logged-in users
    window.location.href = "/home";
    return null;
  }

  const features = [
    { icon: Brain, title: "AI-Powered Mentoring", desc: "Get personalized explanations from an intelligent tutor", color: "gradient-purple" },
    { icon: GraduationCap, title: "Smart Quizzes", desc: "Adaptive quizzes that identify your weak areas", color: "gradient-red" },
    { icon: BarChart3, title: "Progress Analytics", desc: "Track your learning journey with detailed insights", color: "gradient-purple" },
    { icon: MessageSquare, title: "Study Plans", desc: "AI-generated daily study schedules tailored to you", color: "gradient-red" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 lg:px-12 py-4 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg gradient-purple flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">Brainexa</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-foreground hover:text-primary transition-colors px-4 py-2">
            Log in
          </Link>
          <Link to="/signup" className="gradient-purple text-primary-foreground text-sm font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity">
            Get Started
          </Link>
          <Link to="/admin-login" className="p-2 opacity-10 hover:opacity-100 transition-opacity absolute -top-1 -right-1">
            <Shield className="w-3 h-3" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 lg:px-12 py-20 lg:py-32 text-center max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 bg-primary-light text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Brain className="w-4 h-4" />
            AI-Powered Learning Platform
          </div>
          <h1 className="font-display text-4xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Learn Smarter,{" "}
            <span className="text-gradient-purple">Not Harder</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Brainexa uses artificial intelligence to create personalized study plans, provide intelligent tutoring, and track your academic progress in real time.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/signup" className="gradient-purple text-primary-foreground px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-elevated">
              Start Learning Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="border border-border bg-card text-foreground px-8 py-3 rounded-xl font-semibold hover:bg-secondary transition-colors">
              I have an account
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-6 lg:px-12 py-20 bg-card border-t border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-foreground text-center mb-4">
            Everything you need to <span className="text-gradient-red">succeed</span>
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">
            Powerful tools designed to help students achieve better grades and deeper understanding.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-background rounded-xl p-6 border border-border shadow-card hover:shadow-elevated transition-shadow"
              >
                <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-12 py-20">
        <div className="max-w-3xl mx-auto gradient-red rounded-2xl p-10 lg:p-14 text-center shadow-red">
          <h2 className="font-display text-3xl font-bold text-accent-foreground mb-4">
            Ready to transform your learning?
          </h2>
          <p className="text-accent-foreground/80 mb-8 max-w-lg mx-auto">
            Join students who are already learning smarter with Brainexa's AI-powered platform.
          </p>
          <Link to="/signup" className="inline-flex items-center gap-2 bg-card text-foreground px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-elevated">
            Get Started Now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 lg:px-12 py-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md gradient-purple flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-foreground">Brainexa</span>
          </div>
          <p className="text-sm text-muted-foreground">2026 Brainexa. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
