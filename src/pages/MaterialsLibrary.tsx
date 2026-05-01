import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../lib/store';
import { BookOpen, BookOpen as LibraryIcon, Loader2, ArrowLeft, Search, Plus, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { BookReader } from '../components/BookReader';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '../components/ui/input';
import { API_BASE_URL } from '@/lib/api-config';


const BACKEND_URL = API_BASE_URL;

interface Material {
  id: string;
  name: string;
  date: string;
}

export default function MaterialsLibrary() {
  const { user, learningMaterials, addLearningMaterial } = useStore();
  const navigate = useNavigate();
  const [dbMaterials, setDbMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchMaterials = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/materials/${user.id}`);
      const data = await res.json();
      if (data.success) {
        setDbMaterials(data.materials);
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const [searchParams] = useSearchParams();

  const combinedMaterials = React.useMemo(() => {
    const safeStore = Array.isArray(learningMaterials) ? learningMaterials : [];
    const safeDb = Array.isArray(dbMaterials) ? dbMaterials : [];
    
    const storeItems = safeStore.map(m => ({ 
      ...m, 
      name: m?.title || "Untitled", 
      date: m?.createdAt || new Date().toISOString(), 
      isStore: true 
    }));
    
    const dbItems = safeDb.filter(dbm => 
      dbm && typeof dbm.name === 'string' && !storeItems.some(si => si.name === dbm.name)
    );

    return [...storeItems, ...dbItems].map((m, idx) => ({
      ...m,
      id: String(m?.id || `material-${idx}`),
      name: String(m?.name || m?.title || "Untitled Material"),
      date: String(m?.date || m?.createdAt || new Date().toISOString())
    }));
  }, [learningMaterials, dbMaterials]);

  const filteredMaterials = combinedMaterials.filter(m => 
    String(m?.name || "").toLowerCase().includes((searchQuery || "").toLowerCase())
  );

  useEffect(() => {
    fetchMaterials();
  }, [user]);

  // Handle deep-linking to a specific book
  useEffect(() => {
    const bookId = searchParams.get('id');
    if (bookId && combinedMaterials.length > 0) {
      const target = combinedMaterials.find(m => m.id === bookId);
      if (target) {
        openBook(target, target.type === 'generated');
      }
    }
  }, [searchParams, combinedMaterials]);

  const handleFileUpload = async (file: File) => {
    const allowedExts = ['.txt', '.docx', '.doc', '.pdf'];
    if (!allowedExts.some(ext => file.name.toLowerCase().endsWith(ext))) {
       alert('Supported formats: TXT, DOCX, DOC, PDF');
       return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (user?.id) formData.append('userId', user.id);

    try {
      const res = await fetch(`${BACKEND_URL}/api/upload-material`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        // Also add to local store for instant visibility
        addLearningMaterial({
          id: data.material?.id || crypto.randomUUID(),
          title: file.name,
          subject: "Uploaded",
          type: "uploaded",
          format: file.name.endsWith('.pdf') ? 'pdf' : 'notes',
          content: data.url || "Local File",
          createdAt: new Date().toISOString()
        });
        fetchMaterials();
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Network or server error during upload');
    } finally {
      setUploading(false);
    }
  };

  const openBook = async (material: any, isStoreItem: boolean = false) => {
    if (!material) return;
    console.log('📖 Opening material:', material.name, 'isStore:', isStoreItem);
    
    // Reset reader to page 0
    setSelectedMaterial(null);
    
    if (isStoreItem) {
      try {
        const parsed = typeof material.content === 'string' ? JSON.parse(material.content) : material.content;
        setSelectedMaterial({
           name: material.title || material.name || "Untitled",
           content: String(parsed.content || material.content || material.quick_revision || "No content available.")
        });
      } catch {
        setSelectedMaterial({ 
          name: material.title || material.name || "Untitled", 
          content: String(material.content || "No content available.") 
        });
      }
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/material/${material.id}`);
      const data = await res.json();
      if (data.success && data.material) {
        setSelectedMaterial(data.material);
      } else {
        setSelectedMaterial({ name: material.name || "Material", content: "Material not found on server." });
      }
    } catch (error) {
       console.error('Failed to open book:', error);
       setSelectedMaterial({ name: material.name || "Material", content: "Network error while fetching material." });
    } finally {
      setLoading(false);
    }
  };




  const colors = [
    'from-amber-700/80 to-amber-900',
    'from-emerald-700/80 to-emerald-900',
    'from-slate-700/80 to-slate-900',
    'from-indigo-700/80 to-indigo-900',
    'from-rose-700/80 to-rose-900',
  ];

  return (
    <div className="min-h-screen bg-stone-50/50 p-6 pt-24 md:p-12 md:pt-32">
      
      {/* Header section with bookshelf aesthetic */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto mb-12"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <LibraryIcon className="w-8 h-8 text-amber-600" />
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Elite Library</h1>
              <div className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest border border-amber-200">
                {combinedMaterials.length} {combinedMaterials.length === 1 ? 'Volume' : 'Volumes'}
              </div>
            </div>
            <p className="text-muted-foreground font-serif italic text-lg leading-relaxed">
              Explore your personal collection of AI-generated mastery guides and research.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   placeholder="Search library..." 
                   className="pl-10 w-full md:w-64 rounded-full border-stone-300 focus:ring-amber-500 bg-white" 
                />
             </div>
             
             {/* New Add Material Button with Options */}
             <div className="relative group">
                <Button className="rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2">
                   <Plus className="w-4 h-4" />
                   Add Material
                </Button>
                
                {/* Custom Dropdown Menu */}
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-stone-200 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                   <label className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 cursor-pointer transition-colors border-b border-stone-100">
                      <input 
                         type="file" 
                         accept=".txt,.docx,.doc,.pdf" 
                         className="hidden" 
                         onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                         disabled={uploading}
                      />
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                         <Plus className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex flex-col">
                         <span className="text-sm font-bold text-slate-900">Device Upload</span>
                         <span className="text-[10px] text-muted-foreground uppercase font-black">Local Files</span>
                      </div>
                   </label>
                   <button 
                      onClick={() => navigate('/material-generator')}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors"
                   >
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                         <Sparkles className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex flex-col text-left">
                         <span className="text-sm font-bold text-slate-900">Generate Material</span>
                         <span className="text-[10px] text-muted-foreground uppercase font-black">AI Synthesis</span>
                      </div>
                   </button>
                </div>
             </div>

             <Button 
               variant="outline" 
               className="rounded-full border-stone-300 hover:bg-stone-100"
               onClick={() => navigate('/dashboard')}
             >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
             </Button>
          </div>
        </div>

        {/* The Bookshelf UI */}
        <div className="bg-stone-200/50 p-1 rounded-3xl border border-stone-300 shadow-xl overflow-hidden">
          <div className="bg-[#5c4033] p-12 rounded-[1.4rem] shadow-inner relative overflow-hidden">
             {/* Dynamic background texture */}
             <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
             
             {loading && combinedMaterials.length === 0 ? (
                <div className="h-96 flex flex-col items-center justify-center text-stone-300">
                   <Loader2 className="w-12 h-12 animate-spin mb-4" />
                   <p className="font-serif italic text-xl">Dusting the shelves...</p>
                </div>
             ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-8 gap-y-16 relative z-10">
                   
                   {/* Add Book Card (Always first) */}
                   <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group cursor-pointer flex flex-col items-center"
                   >
                      <input 
                        type="file" 
                        accept=".txt,.docx,.doc,.pdf" 
                        className="hidden" 
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                        disabled={uploading}
                      />
                      <div className="relative perspective-1000 mb-4">
                         <div className="w-32 h-44 rounded-l-md bg-stone-700/40 border-2 border-dashed border-stone-500 flex flex-col items-center justify-center transition-all group-hover:border-amber-500/50 group-hover:bg-stone-700/60 group-hover:-translate-y-2 group-hover:rotate-y-[-10deg] shadow-lg overflow-hidden">
                            {uploading ? (
                               <div className="flex flex-col items-center">
                                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-2" />
                                  <span className="text-[8px] font-black uppercase text-amber-500 animate-pulse">Writing...</span>
                               </div>
                            ) : (
                               <div className="flex flex-col items-center italic">
                                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                     <Plus className="w-5 h-5 text-amber-500" />
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 group-hover:text-amber-500 transition-colors">Add Book</span>
                               </div>
                            )}
                         </div>
                         <div className="absolute right-0 top-0 bottom-0 w-2 bg-stone-800 rounded-r-sm translate-x-full opacity-30" />
                      </div>
                      <div className="text-center opacity-40 group-hover:opacity-100 transition-opacity">
                         <p className="text-[10px] font-black uppercase tracking-widest text-stone-300">Device Upload</p>
                      </div>
                   </motion.div>

                   {filteredMaterials.map((material, i) => (
                      <motion.div
                        key={material.id || i}
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group cursor-pointer flex flex-col items-center"
                        onClick={() => openBook(material, material.isStore)}
                      >
                         <div className="relative perspective-1000 mb-4">
                            <div className={`w-32 h-44 rounded-l-md bg-gradient-to-br ${colors[i % colors.length]} shadow-[15px_10px_25px_rgba(0,0,0,0.4)] transition-all group-hover:shadow-[20px_15px_35px_rgba(0,0,0,0.5)] group-hover:-translate-y-2 group-hover:rotate-y-[-10deg] transform-gpu flex flex-col justify-between p-4 border-l-4 border-white/20`}>
                               <div className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-2">
                                 {material.isStore ? (material.type === 'generated' ? 'AI Generated' : 'Uploaded') : 'Brainexa'}
                               </div>
                               <div className="text-xs font-serif italic text-stone-100 font-medium leading-tight line-clamp-3">
                                  {material.name}
                                </div>
                                <div className="mt-auto flex justify-end">
                                   <BookOpen className="w-4 h-4 text-white/50" />
                                </div>
                             </div>
                             <div className="absolute right-0 top-0 bottom-0 w-2 bg-stone-200 rounded-r-sm translate-x-full shadow-inner opacity-80" />
                          </div>
                          <div className="text-center mt-2">
                             <p className="text-xs font-bold text-slate-800 line-clamp-2 max-w-[120px] mb-1">{material.name}</p>
                             <p className="text-[10px] text-stone-500 uppercase font-black tracking-widest">{new Date(material.date).toLocaleDateString()}</p>
                          </div>
                       </motion.div>
                   ))}
                </div>
             )}

             {!loading && (combinedMaterials || []).length > 0 && <div className="mt-12 h-6 bg-gradient-to-b from-stone-800 to-stone-900 rounded-lg shadow-xl" />}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedMaterial && (
          <BookReader 
            title={selectedMaterial.name}
            content={selectedMaterial.content}
            onClose={() => setSelectedMaterial(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}



