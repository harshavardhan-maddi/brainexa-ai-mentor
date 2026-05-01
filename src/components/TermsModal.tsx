import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ChevronRight, ChevronDown, ChevronUp, ScrollText } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

const termsSections = [
  {
    title: "1. Acceptance of Terms",
    content: "By subscribing to Brainexa, you agree to follow all rules, policies, and conditions mentioned here. If you do not agree, do not use the platform."
  },
  {
    title: "2. Eligibility",
    content: "• You must be at least 13 years old\n• If under 18, you must use it under parent/guardian guidance"
  },
  {
    title: "3. Account Responsibility",
    content: "• You are responsible for maintaining your account and password\n• Do not share your login credentials with others\n• Any activity from your account is your responsibility\n\nIf multiple users are found using one account, Brainexa has the right to suspend or block the account."
  },
  {
    title: "4. Subscription & Payments",
    content: "• Brainexa works on a paid subscription model (e.g., ₹299/month)\n• Payment must be completed to access premium features\n• Subscription is non-transferable\n\nImportant:\n• No refund after subscription is activated\n• If payment fails, access will be stopped immediately"
  },
  {
    title: "5. Usage Rules (Strict Policy)",
    content: "You agree NOT to:\n• Copy, download, or distribute study materials illegally\n• Share Brainexa content on Telegram, WhatsApp, or other platforms\n• Use bots, scripts, or any automated tools to misuse the system\n• Attempt to hack, test, or damage system security\n\nViolation of these rules will result in permanent account ban without refund."
  },
  {
    title: "6. Content Ownership",
    content: "• All content (AI-generated material, study plans, notes) belongs to Brainexa\n• Content is strictly for personal learning use only\n\nYou are not allowed to resell or use the content commercially."
  },
  {
    title: "7. AI Limitations",
    content: "• Brainexa uses AI to generate study material and guidance\n• Content may contain minor errors or inaccuracies\n\nUsers are advised to verify important information independently."
  },
  {
    title: "8. Data & Progress Tracking",
    content: "• Brainexa stores your study plans, progress, and usage history\n• This data is used to improve your learning experience\n\nBrainexa does not sell personal user data to third parties."
  },
  {
    title: "9. Service Availability",
    content: "• Brainexa aims to provide uninterrupted access\n• However, downtime may occur due to maintenance, updates, or technical issues\n\nNo compensation will be provided for temporary service interruptions."
  },
  {
    title: "10. Account Suspension or Termination",
    content: "Brainexa reserves the right to suspend or terminate accounts if:\n• Any rules are violated\n• The platform is misused\n• Fraud or illegal activity is detected\n\nNo refund will be issued in such cases."
  },
  {
    title: "11. Updates to Terms",
    content: "• Brainexa may update these Terms & Conditions at any time\n• Continued use of the platform means acceptance of updated terms"
  },
  {
    title: "12. Contact & Support",
    content: "For any issues or queries, users should contact Brainexa through official support channels."
  }
];

export default function TermsModal({ isOpen, onAccept }: TermsModalProps) {
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  if (!isOpen) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 30) {
      setScrolledToBottom(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-card w-full max-w-2xl rounded-[2rem] border border-border shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
      >
        {/* Glow effect */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-primary/10 blur-3xl rounded-full pointer-events-none" />

        {/* Header */}
        <div className="p-8 pb-4 shrink-0">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl gradient-purple flex items-center justify-center shadow-lg shadow-primary/20">
              <ShieldCheck className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-black font-display tracking-tight">Terms & Conditions</h2>
              <p className="text-xs font-bold text-primary uppercase tracking-widest">Brainexa Platform Agreement</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Please read and accept the following terms to continue using Brainexa. Scroll through all sections below.
          </p>
        </div>

        {/* Scrollable T&C content */}
        <div
          className="flex-1 overflow-y-auto px-8 py-4 space-y-3 min-h-0"
          onScroll={handleScroll}
        >
          {termsSections.map((section, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/50 bg-secondary/20 overflow-hidden transition-colors hover:bg-secondary/40"
            >
              <button
                onClick={() => setExpandedSection(expandedSection === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <ScrollText className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-bold text-foreground">{section.title}</span>
                </div>
                {expandedSection === i
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                }
              </button>
              {expandedSection === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-5 pb-4"
                >
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line border-t border-border/30 pt-3">
                    {section.content}
                  </p>
                </motion.div>
              )}
            </div>
          ))}

          {/* Final notice */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 mt-4">
            <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-1">⚠️ Final Notice</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Brainexa is designed for serious learners. Any misuse, abuse, or attempt to exploit the system will lead to immediate loss of access without warning.
            </p>
          </div>
        </div>

        {/* Footer / Accept button */}
        <div className="p-8 pt-4 shrink-0 border-t border-border/50">
          <button
            onClick={onAccept}
            disabled={!scrolledToBottom}
            className="w-full py-4 rounded-2xl gradient-purple text-primary-foreground font-black text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {scrolledToBottom ? (
              <>I Accept & Continue <ChevronRight className="w-4 h-4" /></>
            ) : (
              "Scroll down to read all terms"
            )}
          </button>

          <p className="text-[10px] text-center text-muted-foreground mt-4 uppercase font-bold tracking-widest">
            By clicking, you agree to all terms & conditions above
          </p>
        </div>
      </motion.div>
    </div>
  );
}
