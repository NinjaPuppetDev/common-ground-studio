import { useState, useCallback } from 'react';
import type { AnalysisReport, AnalysisInput, ProgressEvent } from './types';
import LandingScreen from './components/LandingScreen';
import InvestigationView from './components/InvestigationView';
import AuthModal from './components/AuthModal';
import { AuthProvider, useAuth } from './context/AuthContext';

function MainApp() {
  const [screen, setScreen] = useState<'landing' | 'investigating'>('landing');
  const [progress, setProgress] = useState<ProgressEvent[]>([]);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    session,
    canSearch,
    openAuthModal,
    recordSearchPerformed,
  } = useAuth();

  const handleAnalyze = useCallback(async (input: AnalysisInput) => {
    // 1. Check guest limit
    if (!canSearch) {
      openAuthModal(
        'login',
        "You've used your 1 free guest analysis. Please sign in with Google or create an account to continue."
      );
      return;
    }

    setScreen('investigating');
    setProgress([]);
    setReport(null);
    setError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        if (response.status === 429) {
          if (errBody?.requiresAuth) {
            openAuthModal('login', errBody.message || 'Free guest limit reached. Please sign in to continue.');
          }
          throw new Error(errBody?.message || 'Rate limit reached. Please try again later.');
        }
        throw new Error(errBody?.message || errBody?.error || `Server returned error (${response.status})`);
      }

      // Record that search was executed
      recordSearchPerformed();

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
              setProgress((prev) => [...prev, data as ProgressEvent]);
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
  }, [canSearch, openAuthModal, session, recordSearchPerformed]);

  const handleReset = useCallback(() => {
    setScreen('landing');
    setReport(null);
    setError(null);
    setProgress([]);
  }, []);

  return (
    <>
      {screen === 'investigating' ? (
        <InvestigationView
          progressEvents={progress}
          report={report}
          onReset={handleReset}
        />
      ) : (
        <LandingScreen onAnalyze={handleAnalyze} isAnalyzing={false} />
      )}

      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-rose-500/90 border border-rose-400 text-white text-sm rounded-xl px-5 py-3 shadow-2xl backdrop-blur-md max-w-md text-center z-50 animate-fade-in font-sans">
          {error}
        </div>
      )}

      <AuthModal />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

