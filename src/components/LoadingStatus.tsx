import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface LoadingStatusProps {
  isLoading: boolean;
  steps?: string[];
  className?: string;
}

const DEFAULT_STEPS = [
  'Analyzing data...',
  'Optimizing content...',
  'Refining for you...',
  'Searching sources...',
  'Finalizing results...'
];

export const LoadingStatus: React.FC<LoadingStatusProps> = ({ 
  isLoading, 
  steps = DEFAULT_STEPS,
  className = ""
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setCurrentStep((prev) => (prev + 1) % steps.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isLoading, steps.length]);

  if (!isLoading) return null;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Sparkles className="w-3 h-3 text-primary shrink-0 animate-pulse" />
      <span className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse truncate">
        {steps[currentStep]}
      </span>
    </div>
  );
};
