import React from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { TimelineProvider, useTimeline } from './contexts/TimelineContext';
import { useTheme } from './contexts/ThemeContext';
import ThemeSwitcher from './components/ThemeSwitcher';
import TimelinePicker from './components/TimelinePicker';
import ZoomControls from './components/ZoomControls';
import JsonDownloadButton from './components/JsonDownloadButton';
import TimelineView from './components/TimelineView';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { loading, error } = useTimeline();
  const { theme } = useTheme();

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className={`text-center p-8 ${theme === 'fantasy' ? 'text-fantasy-accent font-fantasy-heading' : 'text-red-400 font-scifi-heading'}`}>
          <p className="text-xl font-bold mb-2">Chronicle Lost</p>
          <p className="text-sm opacity-70">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className={`animate-spin mx-auto mb-4 ${theme === 'fantasy' ? 'text-fantasy-accent' : 'text-scifi-accent'}`} />
          <p className={`text-sm ${theme === 'fantasy' ? 'text-fantasy-muted font-fantasy-heading' : 'text-scifi-muted font-scifi-heading'}`}>
            Loading timeline...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ThemeSwitcher />
      <TimelinePicker />
      <ZoomControls />
      <JsonDownloadButton />
      <TimelineView />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <TimelineProvider>
        <AppContent />
      </TimelineProvider>
    </ThemeProvider>
  );
}

export default App;
