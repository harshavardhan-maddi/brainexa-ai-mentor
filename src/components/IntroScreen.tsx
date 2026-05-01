import { motion } from "framer-motion";
import { useEffect } from "react";

interface IntroScreenProps {
  onComplete: () => void;
}

export function IntroScreen({ onComplete }: IntroScreenProps) {
  useEffect(() => {
    // The total animation duration is roughly 3.5 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 3500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      {/* Background radial gradient for premium feel */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />

      {/* Rotating geometric accents behind logo */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute w-[400px] h-[400px] border border-primary/10 rounded-full"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute w-[300px] h-[300px] border border-purple-500/10 rounded-full"
      />

      {/* Logo Image Animation */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative z-10"
      >
        <img 
          src="/brainexalogo.png" 
          alt="Brainexa Logo" 
          className="w-48 h-48 drop-shadow-[0_0_50px_rgba(var(--primary),0.8)] object-contain"
        />
      </motion.div>

      {/* Brand Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
        className="mt-8 text-5xl md:text-6xl font-black font-display tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500 relative z-10"
      >
        Brainexa
      </motion.h1>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="mt-4 text-muted-foreground font-medium tracking-[0.3em] uppercase text-xs md:text-sm relative z-10"
      >
        The Elite Learning Ecosystem
      </motion.p>
      
      {/* Bottom Loading Bar Effect */}
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: "200px", opacity: 1 }}
        transition={{ duration: 2.2, delay: 1.0, ease: "easeInOut" }}
        className="absolute bottom-24 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full"
      />
    </motion.div>
  );
}
