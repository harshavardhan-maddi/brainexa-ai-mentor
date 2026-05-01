import React, { useState } from 'react';
import { Search, Loader2, BookOpen, ExternalLink, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingStatus } from './LoadingStatus';
import { API_BASE_URL } from '@/lib/api-config';


interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

interface KnowledgeSearchProps {
  onSelectResult: (url: string, title: string, initialSummary?: string) => void;
}

const KnowledgeSearch: React.FC<KnowledgeSearchProps> = ({ onSelectResult }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/knowledge/direct-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: query })
      });
      const data = await response.json();
      if (data.success) {
        // Instead of showing results, we immediately go to the learning session
        // Using the first source as the reference link
        const firstLink = data.sources && data.sources.length > 0 ? data.sources[0].link : 'https://brainexa.ai';
        onSelectResult(firstLink, query, data.summary);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="w-6 h-6 text-primary" />
            Knowledge Engine
          </CardTitle>
          <CardDescription>
            Search for any topic
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="What do you want to learn today? (e.g. React Hooks, Photosynthesis)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
            <Button type="submit" disabled={loading} className="px-8 h-12 text-lg font-semibold min-w-[160px]">
              {loading ? (
                <div className="flex flex-col items-center">
                  <span>Searching...</span>
                  <LoadingStatus 
                    isLoading={true} 
                    steps={['Querying sources...', 'Analyzing data...']}
                  />
                </div>
              ) : 'Search'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results list hidden as per user request: "Do not show the resources" */}
    </div>
  );
};

export default KnowledgeSearch;
