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
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      let response: Response | null = null;

      // If an external Supabase function URL is explicitly configured, try it with fallback
      if (supabaseUrl) {
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (anonKey) {
            headers['Authorization'] = `Bearer ${anonKey}`;
          }
          const externalRes = await fetch(`${supabaseUrl}/functions/v1/analyze`, {
            method: 'POST',
            headers,
            body: JSON.stringify(input),
          });
          if (externalRes.ok) {
            response = externalRes;
          }
        } catch (fetchErr) {
          console.warn('External analyze endpoint unreachable, falling back to /api/analyze:', fetchErr);
        }
      }

      // If no external response or external failed, call the container's built-in /api/analyze
      if (!response) {
        response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
      }

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.message || errBody?.error || `Server returned error (${response.status})`);
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
