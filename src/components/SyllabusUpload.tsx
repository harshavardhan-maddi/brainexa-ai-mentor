import { useCallback, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { FileText, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api-config';


const BACKEND_URL = API_BASE_URL;

export function SyllabusUpload() {
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const { setStudentSubjects, user } = useStore();
  const { toast } = useToast();

  const handleUpload = async (file) => {
    if (!['.txt', '.docx'].some(ext => file.name.toLowerCase().endsWith(ext))) {
      toast({ variant: 'destructive', title: 'Only TXT/DOCX' });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('syllabus', file);
    if (user?.id) formData.append('userId', user.id);

    try {
      const res = await fetch(`${BACKEND_URL}/upload-syllabus`, { method: 'POST', body: formData });
      const data = await res.json();
      
      if (data.success) {
        setSubjects(data.subjects);
        setStudentSubjects(data.subjects.map(s => ({
          subject: s.name,
          topics: s.topics.map(topic => ({
            topic,
            questionsAttempted: 0,
            questionsCorrect: 0
          })),
          currentTopicIndex: 0
        })));
        setSuccess(true);
        toast({ title: '✅ Syllabus Parsed!', description: `${data.subjects.length} subjects extracted` });
      } else throw data.error;
    } catch (error) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: error });
    } finally {
      setUploading(false);
    }
  };

  const files = useState(null)[0];

  if (uploading) return (
    <div className="flex flex-col items-center p-8 border-2 border-dashed border-gray-300 rounded-lg animate-pulse">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
      <p className="mt-4 text-muted-foreground">AI extracting syllabus...</p>
    </div>
  );

  if (success) return (
    <div className="flex flex-col items-center p-8 border-2 border-dashed border-green-300 rounded-lg bg-green-50">
      <CheckCircle2 className="w-12 h-12 text-green-500" />
      <h3 className="mt-4 text-lg font-semibold">Success!</h3>
      <p className="text-sm text-muted-foreground mb-4">{subjects.length} subjects extracted</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {subjects.slice(0, 6).map((s, i) => (
          <span key={i} className="bg-primary/10 px-2 py-1 rounded text-xs font-medium">{s.name}</span>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={() => { setSuccess(false); setSubjects([]); }}>
        New Upload
      </Button>
    </div>
  );

  return (
    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary hover:bg-accent p-6 group transition-all">
      <FileText className="w-12 h-12 text-muted-foreground mb-4 group-hover:text-primary" />
      <h3 className="text-lg font-semibold mb-1 text-foreground">Upload Syllabus</h3>
      <p className="text-sm text-muted-foreground mb-4">Drop TXT or DOCX file (AI extracts subjects)</p>
      <input 
        type="file" 
        accept=".txt,.docx" 
        className="hidden"
        onChange={(e) => handleUpload(e.target.files[0])}
      />
    </label>
  );
}

