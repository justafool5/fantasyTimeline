import React, { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { TimelineProvider, useTimeline } from './contexts/TimelineContext';
import { useTheme } from './contexts/ThemeContext';
import ThemeSwitcher from './components/ThemeSwitcher';
import TimelinePicker from './components/TimelinePicker';
import ZoomControls from './components/ZoomControls';
import JsonDownloadButton from './components/JsonDownloadButton';
import TimelineView from './components/TimelineView';
import TimelineConfigDialog from './components/TimelineConfigDialog';
import { Loader2, Settings } from 'lucide-react';

function ConfigButton({ onClick }) {
  const { theme } = useTheme();
  return (
    <button
      data-testid="config-button"
      onClick={onClick}
      className={`
        fixed top-4 right-44 z-50 p-2 transition-all
        ${theme === 'fantasy'
          ? 'bg-fantasy-card text-fantasy-accent border border-fantasy-border hover:border-fantasy-accent'
          : 'bg-scifi-bg-secondary text-scifi-accent border border-scifi-border hover:border-scifi-accent'
        }
      `}
      title="Timeline Settings"
    >
      <Settings size={18} />
    </button>
  );
}

function AppContent() {
  const { loading, error } = useTimeline();
  const { theme } = useTheme();
  const [configOpen, setConfigOpen] = useState(false);

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
      <ConfigButton onClick={() => setConfigOpen(true)} />
      <ZoomControls />
      <JsonDownloadButton />
      <TimelineView />
      <TimelineConfigDialog open={configOpen} onClose={() => setConfigOpen(false)} />
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
