import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('common-ground-theme');
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    }
    return 'light'; // Default to light mode
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('common-ground-theme', theme);
    } catch {
      // Ignore local storage error
    }

    const handleThemeChange = (e: CustomEvent<string>) => {
      if (e.detail === 'dark' || e.detail === 'light') {
        setTheme(e.detail);
      }
    };

    window.addEventListener('theme-changed' as any, handleThemeChange);
    return () => {
      window.removeEventListener('theme-changed' as any, handleThemeChange);
    };
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: next }));
  };

  return { theme, toggleTheme, setTheme };
}

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      id="theme-toggle-button"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all duration-200 border cursor-pointer select-none
        bg-card hover:bg-card-hover text-foreground/70 hover:text-foreground border-border active:scale-95 shadow-sm ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {theme === 'dark' ? (
          <Sun className="w-3.5 h-3.5 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-indigo-500 transition-transform duration-300 rotate-0 hover:-rotate-12" />
        )}
      </div>
      {showLabel && (
        <span className="text-[11px] text-foreground/60 hidden sm:inline">
          {theme === 'dark' ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
}
