import { useState, useCallback } from 'react';
import type { AnalysisReport, AnalysisInput, ProgressEvent } from './types';
import LandingScreen from './components/LandingScreen';
import InvestigationView from './components/InvestigationView';

export default function App() {
  const [screen, setScreen] = useState<'landing' | 'investigating'>('landing');
  const [progress, setProgress] = useState<ProgressEvent[]>([]);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async (input: AnalysisInput) => {
    setScreen('investigating');
    setProgress([]);
    setReport(null);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2ZGxvbHJrbHpsZHFreWlqbnR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNTYyMjksImV4cCI6MjA5ODYzMjIyOX0.3ychI7oiC9zdatwy6QP8SQTfVI-x6vl4x3NpN53TvBI';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (anonKey) {
        headers['Authorization'] = `Bearer ${anonKey}`;
      }

      let analyzeEndpoint = supabaseUrl
        ? `${supabaseUrl}/functions/v1/analyze`
        : '/api/analyze';

      let response = await fetch(analyzeEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      });

      // If external Supabase endpoint fails (e.g. 401), fallback to local Express endpoint
      if (!response.ok && supabaseUrl) {
        console.warn(`External endpoint returned ${response.status}, falling back to local /api/analyze`);
        analyzeEndpoint = '/api/analyze';
        response = await fetch(analyzeEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
      }

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.error || `Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let finalReport: AnalysisReport | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventBlock of events) {
          const lines = eventBlock.split('\n');
          let eventType = '';
          let dataStr = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              dataStr = line.slice(6).trim();
            }
          }

          if (!eventType || !dataStr) continue;

          try {
            const data = JSON.parse(dataStr);

            if (eventType === 'complete') {
              finalReport = data as AnalysisReport;
              break;
            } else if (eventType === 'error') {
              throw new Error(data.message || 'Analysis failed');
            } else if (eventType === 'progress') {
              setProgress(prev => [...prev, data as ProgressEvent]);
            }
          } catch (parseErr) {
            if (parseErr instanceof Error) throw parseErr;
          }
        }

        if (finalReport) break;
      }

      if (!finalReport) throw new Error('No report received from analysis');

      // Short delay so the user sees the final loading state transition
      await new Promise((r) => setTimeout(r, 400));
      setReport(finalReport);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
      setScreen('landing');
    }
  }, []);

  const handleReset = useCallback(() => {
    setScreen('landing');
    setReport(null);
    setError(null);
    setProgress([]);
  }, []);

  if (screen === 'investigating') {
    return (
      <InvestigationView
        progressEvents={progress}
        report={report}
        onReset={handleReset}
      />
    );
  }

  return (
    <>
      <LandingScreen onAnalyze={handleAnalyze} isAnalyzing={false} />
      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-evidence-low/15 border border-evidence-low/25 text-evidence-low text-sm rounded-xl px-5 py-3 shadow-card backdrop-blur-sm max-w-md text-center">
          We couldn't complete that investigation — {error}
        </div>
      )}
    </>
  );
}
