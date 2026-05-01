import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useStore, ChatMessage } from "@/lib/store";
import { socketService } from "@/lib/socket";
import { 
  Send, Bot, User, Loader2, Sparkles, Volume2, VolumeX, 
  MessageSquare, Languages, Mic, MicOff, Plus, Trash2, 
  Settings, History, ChevronRight, X, Image as ImageIcon, BookOpen
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Switch } from "@/components/ui/switch";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { API_BASE_URL, PY_API_BASE_URL } from "@/lib/api-config";


export default function Chat() {
  const navigate = useNavigate();
  const { 
    chatHistory, addChat, user, 
    chatSessions, currentSessionId, createNewSession, 
    switchSession, deleteSession,
    studentSubjects, quizResults, studyProgress
  } = useStore();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [language, setLanguage] = useState<string>("English");
  const [isAutoSpeak, setIsAutoSpeak] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Layout states - Chat history hidden by default per user request
  const [showHistory, setShowHistory] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  const languageMap: Record<string, string[]> = {
    "English": ["en-US", "en-GB", "en-IN"],
    "Hindi": ["hi-IN"],
    "Telugu": ["te-IN"],
    "Tamil": ["ta-IN"],
    "Marathi": ["mr-IN"],
    "Bengali": ["bn-IN"],
    "Kannada": ["kn-IN"],
    "Malayalam": ["ml-IN"],
    "Gujarati": ["gu-IN"],
    "Punjabi": ["pa-IN"],
    "Odia": ["or-IN"]
  };

  // Fresh login initialization for Premium
  useEffect(() => {
    if (user?.plan === "premium" && chatHistory.length > 0 && !sessionStorage.getItem('chat_initialized')) {
      createNewSession();
      sessionStorage.setItem('chat_initialized', 'true');
    }
  }, []);

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      const defaultVoice = availableVoices.find(v => v.name.includes("Google") && v.lang.startsWith("en")) || 
                           availableVoices.find(v => v.lang.startsWith("en")) ||
                           availableVoices[0];
      if (defaultVoice && !selectedVoice) setSelectedVoice(defaultVoice.name);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => window.speechSynthesis.cancel();
  }, []);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = languageMap[language]?.[0] || 'en-US';
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? " " : "") + transcript);
        setIsListening(false);
      };
      
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, [language]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const handleSpeak = async (text: string, id: string) => {
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(id);
    const cleanText = text.replace(/[#*`_~]/g, '').substring(0, 5000);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    let voice = voices.find(v => v.name === selectedVoice);
    const targetLocales = languageMap[language] || [];
    if (!voice || !targetLocales.includes(voice.lang)) {
       voice = voices.find(v => targetLocales.includes(v.lang)) || voice;
    }
    if (voice) utterance.voice = voice;
    utterance.onend = () => setSpeakingId(null);
    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
      userName: user?.name,
    };
    addChat(userMsg);
    setInput("");
    setLoading(true);

    const chatContext = {
      userId: user?.id,
      userName: user?.name,
      plan: user?.plan,
      studyProgress,
      studentSubjects,
      quizResults,
      detectedLanguage: language,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: input, 
          userId: user?.id,
          history: chatHistory.slice(-10), // Send recent history for context
          context: chatContext
        }),
      });
      const data = await response.json();
      if (data.success) {
        const botMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
          imageUrl: data.imageUrl, // Image generated by AI
          timestamp: new Date().toISOString(),
        };
        addChat(botMsg);
        if (isAutoSpeak) handleSpeak(data.response, botMsg.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, loading]);

  const formatImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    // If it's a generated image from the knowledge engine, it's on port 8000
    if (url.includes('img_') && url.endsWith('.png')) {
      return `${PY_API_BASE_URL}/images/${url.split('/').pop()}`;
    }
    return `${API_BASE_URL}${url}`;
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-140px)] -mx-4 -mt-6 relative">
        
        {/* Left Sidebar: Conversatons (Hidden by default, opened via Toggle) */}
        <AnimatePresence>
          {showHistory && (
            <motion.div 
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className="border-r border-border bg-card/60 backdrop-blur-xl absolute md:relative z-50 h-full w-72 flex flex-col shadow-2xl md:shadow-none"
            >
              <div className="p-4 flex items-center justify-between">
                <h2 className="font-display font-bold text-foreground flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" /> Chat Sessions
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)} className="rounded-full">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="px-4 mb-4">
                <Button onClick={createNewSession} className="w-full h-11 gradient-purple text-primary-foreground gap-2 rounded-xl shadow-lg hover:animate-pulse">
                  <Plus className="w-4 h-4" /> New Study Chat
                </Button>
              </div>

              <ScrollArea className="flex-1 px-3">
                <div className="space-y-1">
                  {chatSessions.length === 0 ? (
                    <div className="text-center py-10 px-4">
                      <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground font-medium">History is empty.</p>
                    </div>
                  ) : (
                    chatSessions.map((s) => (
                      <div key={s.id} className="group relative">
                        <button
                          onClick={() => switchSession(s.id)}
                          className={`w-full text-left px-3 py-3 rounded-xl transition-all flex items-center gap-3 ${
                            currentSessionId === s.id 
                            ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/25" 
                            : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                          }`}
                        >
                          <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${currentSessionId === s.id ? "text-primary" : "text-muted-foreground"}`} />
                          <span className="text-xs truncate pr-4">{s.title}</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area: Chat Window */}
        <div className="flex-1 bg-background flex flex-col min-w-0 transition-all duration-300">
          
          {/* Custom Header in the center content space */}
          <div className="h-16 border-b border-border bg-background/50 flex items-center justify-between px-6 shrink-0">
             <div className="flex items-center gap-3">
                {!showHistory && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowHistory(true)} 
                    className="rounded-full gap-2 border-primary/20 hover:bg-primary/5 text-xs font-bold"
                  >
                    <History className="w-3.5 h-3.5" /> Chat History
                  </Button>
                )}
                {currentSessionId && (
                  <div className="h-4 w-px bg-border mx-1" />
                )}
                <span className="text-xs font-bold text-muted-foreground truncate max-w-[200px]">
                  {chatSessions.find(s => s.id === currentSessionId)?.title || "AI Study Mentor"}
                </span>
             </div>
             <div>
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
             </div>
          </div>

          <div className="flex-1 max-w-4xl mx-auto w-full px-4 flex flex-col py-6 overflow-hidden">
            
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-8 scrollbar-thin">
              {chatHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center mt-[-10%]">
                  <div className="w-20 h-20 rounded-[2rem] overflow-hidden flex items-center justify-center mb-6 shadow-premium bg-card border border-border">
                    <img src="/brainexalogo.png" alt="Brainexa Logo" className="w-12 h-12" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-3">Zen Mode: Focused Studying</h2>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
                    History is tucked away. Text and **Visuals** are ready. Ask me anything about your syllabus and I'll generate images to help you understand better.
                  </p>
                  <Button 
                    onClick={() => navigate('/knowledge-base')}
                    className="mt-6 gap-2 gradient-purple border-0 shadow-lg text-primary-foreground font-bold"
                  >
                    <BookOpen className="w-5 h-5" />
                    Learn Topic in Knowledge Engine
                  </Button>
                </div>
              )}

              {chatHistory.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0 mt-1 shadow-sm border border-border bg-card">
                      <img src="/brainexalogo.png" alt="Brainexa" className="w-6 h-6" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-[0.95rem] leading-relaxed relative group shadow-sm ${
                      msg.role === "user"
                        ? "gradient-red text-accent-foreground rounded-tr-none"
                        : "bg-card border border-border text-foreground rounded-tl-none"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="absolute -right-12 top-1 flex flex-col gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all">
                        <button
                          onClick={() => handleSpeak(msg.content, msg.id)}
                          className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                          title="Read aloud"
                        >
                          {speakingId === msg.id ? <VolumeX className="w-4 h-4 animate-pulse text-primary" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                    
                    {msg.role === "assistant" ? (
                      <div className="space-y-4">
                        <div className="prose prose-sm max-w-none dark:prose-invert text-foreground">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                        
                        {/* AI Generated Educational Image */}
                        {msg.imageUrl && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mt-4 rounded-xl overflow-hidden border border-border/50 border-2 shadow-premium"
                          >
                            <img 
                              src={formatImageUrl(msg.imageUrl)} 
                              alt="Visual Learning Aid" 
                              className="w-full h-auto object-cover max-h-[500px]"
                            />
                            <div className="bg-muted/30 p-2 text-[10px] uppercase font-black tracking-widest text-muted-foreground text-center border-t border-border/10">
                               ✨ Elite Visual Learning Aid
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === "user" && (
                    <Avatar className="w-9 h-9 rounded-xl mt-1 shadow-sm border-0">
                      <AvatarImage src={user?.profilePicture} className="object-cover" />
                      <AvatarFallback className="gradient-red flex items-center justify-center text-accent-foreground">
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              
              {loading && (
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-border bg-card">
                    <img src="/brainexalogo.png" alt="Loading" className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="bg-card border border-border rounded-xl px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input Row: Mic, Textbox, and Send aligned */}
            <div className="mt-6 max-w-4xl mx-auto w-full">
               <div className="flex items-center gap-3">
                  <button
                    onClick={toggleListening}
                    className={`p-4 rounded-2xl transition-all shadow-sm border border-border ${
                      isListening 
                        ? "bg-red-500 text-white animate-pulse" 
                        : "bg-card text-muted-foreground hover:text-primary hover:border-primary/30"
                    }`}
                    title="Voice Command"
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder={isListening ? "Listening..." : "Master any concept..."}
                    className="flex-1 px-6 py-4 rounded-2xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-4 focus:ring-primary/5 shadow-sm transition-all"
                  />

                  <button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    className="gradient-purple text-primary-foreground p-4 rounded-2xl hover:opacity-90 transition-all disabled:opacity-50 shadow-lg active:scale-95"
                  >
                    <Send className="w-5 h-5" />
                  </button>
               </div>
               <p className="text-[9px] text-center text-muted-foreground mt-4 uppercase tracking-[0.2em] font-black opacity-30">Analytical AI Mentor • Visual Learning Enabled</p>
            </div>
          </div>
        </div>

        {/* Floating Voice Agent Symbol & Hub */}
        <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-4">
          <AnimatePresence>
            {showVoiceSettings && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="mb-2"
              >
                <Card className="w-72 bg-card/95 backdrop-blur-xl border-accent/20 shadow-premium p-6 rounded-[2rem]">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display font-bold text-foreground flex items-center gap-2">
                       <Sparkles className="w-4 h-4 text-primary animate-pulse" /> Voice Hub
                    </h2>
                    <Button variant="ghost" size="icon" onClick={() => setShowVoiceSettings(false)} className="rounded-full hover:bg-secondary h-8 w-8">
                       <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-6">
                     {/* Auto Speak */}
                     <div className="bg-secondary/50 rounded-2xl p-4 border border-border/50">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Volume2 className={`w-4 h-4 ${isAutoSpeak ? "text-primary" : "text-muted-foreground"}`} />
                            <span className="text-xs font-bold">Auto-Speak</span>
                          </div>
                          <Switch checked={isAutoSpeak} onCheckedChange={setIsAutoSpeak} />
                        </div>
                        <p className="text-[10px] text-muted-foreground">Hear AI answers immediately.</p>
                     </div>

                     {/* Multi-language Selector */}
                     <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Language</label>
                          <Select value={language} onValueChange={setLanguage}>
                            <SelectTrigger className="w-full h-11 bg-background rounded-xl border-border/50 text-xs text-left">
                              <SelectValue placeholder="AI Language" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {Object.keys(languageMap).map(lang => (
                                 <SelectItem key={lang} value={lang} className="text-xs">{lang}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Voice Accent</label>
                          <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                            <SelectTrigger className="w-full h-11 bg-background rounded-xl border-border/50 text-xs text-left">
                              <SelectValue placeholder="Select Accent" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {voices
                                .filter(v => (languageMap[language] || []).includes(v.lang) || v.lang.startsWith('en'))
                                .map((voice) => (
                                  <SelectItem key={voice.name} value={voice.name} className="text-[10px]">
                                    {voice.name.split(' (')[0].substring(0, 20)}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                     </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pulsing Floating Agent Symbol */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowVoiceSettings(!showVoiceSettings)}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl relative transition-all duration-500 overflow-hidden ${
              showVoiceSettings || isAutoSpeak || isListening 
                ? "gradient-red text-accent-foreground" 
                : "bg-card border-2 border-primary/20 text-primary"
            }`}
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity" />
            <AnimatePresence mode="wait">
              {isListening ? (
                <motion.div
                  key="listening"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                   <Mic className="w-7 h-7 animate-pulse" />
                </motion.div>
              ) : !!speakingId ? (
                <motion.div
                  key="speaking"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                   <Volume2 className="w-7 h-7 animate-bounce" />
                </motion.div>
              ) : (
                <motion.div
                  key="default"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="flex flex-col items-center"
                >
                   <Bot className="w-8 h-8" />
                   <Sparkles className="w-3 h-3 absolute top-3 right-3 text-white/80 animate-pulse" />
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Pulsing Ripple Effect */}
            {(isListening || isAutoSpeak || !!speakingId) && (
              <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping opacity-20" />
            )}
          </motion.button>
        </div>

      </div>
    </AppLayout>
  );
}
