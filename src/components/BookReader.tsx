import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Book as BookIcon } from 'lucide-react';
import { Button } from './ui/button';

interface BookReaderProps {
  content: string;
  title: string;
  onClose: () => void;
}

export function BookReader({ content, title, onClose }: BookReaderProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState<string[]>([]);

  // Split content into pages (approximate based on characters)
  useEffect(() => {
    const charsPerPage = 1200; // Adjust for reasonable page length
    const words = String(content || "").split(' ');
    const newPages: string[] = [];
    let currentText = "";
    
    words.forEach(word => {
      if ((currentText + word).length > charsPerPage) {
        newPages.push(currentText);
        currentText = word + " ";
      } else {
        currentText += word + " ";
      }
    });
    if (currentText) newPages.push(currentText);
    setPages(newPages);
  }, [content]);

  const totalPages = pages.length;
  const isLastPage = currentPage === totalPages - 1;

  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages - 1));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 0));

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
    >
      <div className="relative w-full max-w-5xl h-[85vh] flex flex-col bg-stone-100 rounded-lg shadow-2xl overflow-hidden border-8 border-stone-800">
        
        {/* Book Header */}
        <div className="bg-stone-800 text-stone-300 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookIcon className="w-5 h-5 text-amber-500" />
            <h2 className="font-display font-bold text-sm tracking-widest uppercase">{title}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-stone-700 text-stone-300 rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Book Body (Gutter in middle) */}
        <div className="flex-1 relative flex bg-[#fdfaf3] shadow-inner overflow-hidden">
          {/* Centered Gutter */}
          <div className="absolute left-1/2 top-0 bottom-0 w-8 -translate-x-1/2 bg-gradient-to-r from-black/5 via-black/20 to-black/5 z-10 pointer-events-none" />
          
          <div className="flex flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ rotateY: 90, opacity: 0, transformOrigin: "left" }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: -90, opacity: 0, transformOrigin: "right" }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                className="flex-1 flex w-full"
              >
                {/* Left Page */}
                <div className="flex-1 p-8 md:p-16 overflow-y-auto border-r border-stone-300/30 bg-[#fdfaf3] relative">
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/5 to-transparent pointer-events-none" />
                  <div className="max-w-prose mx-auto">
                    <p className="font-serif text-xl leading-relaxed text-stone-800 selection:bg-amber-200">
                      {pages[currentPage]}
                    </p>
                  </div>
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-serif italic text-stone-400">
                    {currentPage + 1}
                  </div>
                </div>

                {/* Right Page (Only on desktop) */}
                <div className="hidden md:flex flex-1 p-16 overflow-y-auto bg-[#fdfaf3] relative">
                  <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/5 to-transparent pointer-events-none" />
                  <div className="max-w-prose mx-auto">
                    {currentPage + 1 < totalPages ? (
                      <p className="font-serif text-xl leading-relaxed text-stone-800 selection:bg-amber-200">
                        {pages[currentPage + 1]}
                      </p>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center opacity-20 text-stone-600 italic">
                        <BookIcon className="w-12 h-12 mb-4 opacity-50" />
                        <span className="font-serif text-lg">Finis.</span>
                      </div>
                    )}
                  </div>
                  {currentPage + 1 < totalPages && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-serif italic text-stone-400">
                      {currentPage + 2}
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Book Footer / Controls */}
        <div className="bg-stone-200 p-4 border-t border-stone-300 flex items-center justify-between">
          <Button 
            disabled={currentPage === 0} 
            onClick={prevPage}
            variant="ghost" 
            className="gap-2 font-black uppercase tracking-widest text-[10px]"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          
          <div className="flex flex-col items-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-stone-500">
               Chapter Mastery
            </div>
            <div className="text-sm font-serif italic text-stone-800">
              Page {currentPage + 1} of {totalPages}
            </div>
          </div>

          <Button 
            disabled={isLastPage} 
            onClick={nextPage}
            variant="ghost" 
            className="gap-2 font-black uppercase tracking-widest text-[10px]"
          >
             Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
