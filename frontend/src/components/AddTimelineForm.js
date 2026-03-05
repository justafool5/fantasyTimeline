import React, { useState } from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { TRACK_COLORS } from '../utils/timelineUtils';

export default function AddTimelineForm({ onClose, onCreated }) {
  const { createTimeline } = useTimeline();
  const { theme, setTheme } = useTheme();

  const [form, setForm] = useState({
    title: '',
    description: '',
    defaultTheme: theme,
    // First track info
    trackName: '',
    trackCalendarName: '',
    trackAbbr: '',
    trackColor: TRACK_COLORS[0],
    trackEpoch: 0,
    trackStartYear: 0,
    trackEndYear: 1000,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.trackName.trim() || !form.trackCalendarName.trim()) return;

    const newTimelineId = createTimeline({
      title: form.title.trim(),
      description: form.description.trim(),
      defaultTheme: form.defaultTheme,
      firstTrack: {
        name: form.trackName.trim(),
        calendarName: form.trackCalendarName.trim(),
        abbr: form.trackAbbr.trim() || form.trackCalendarName.substring(0, 2).toUpperCase(),
        color: form.trackColor,
        epoch: parseInt(form.trackEpoch) || 0,
        startYear: parseInt(form.trackStartYear) || 0,
        endYear: parseInt(form.trackEndYear) || 1000,
      }
    });

    // Switch theme to match new timeline
    setTheme(form.defaultTheme);
    
    onClose();
    if (onCreated) onCreated(newTimelineId);
  };

  const inputClass = theme === 'fantasy'
    ? 'bg-fantasy-bg border border-fantasy-border/60 text-fantasy-text font-fantasy-body px-3 py-2 w-full focus:outline-none focus:border-fantasy-accent'
    : 'bg-scifi-bg border border-scifi-border text-scifi-text font-scifi-body px-3 py-2 w-full focus:outline-none focus:border-scifi-accent';

  const labelClass = `block mb-1 text-xs font-bold uppercase tracking-wider ${theme === 'fantasy' ? 'text-fantasy-muted font-fantasy-heading' : 'text-scifi-muted font-scifi-heading'}`;

  return (
    <motion.div
      data-testid="add-timeline-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: theme === 'fantasy' ? 'rgba(10,8,4,0.85)' : 'rgba(0,0,0,0.9)' }}
      onClick={onClose}
    >
      <motion.form
        data-testid="add-timeline-form"
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 30 }}
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
        className={`
          w-full max-w-lg max-h-[90vh] overflow-y-auto p-6
          ${theme === 'fantasy'
            ? 'bg-fantasy-card border-2 border-fantasy-border shadow-[0_4px_40px_rgba(0,0,0,0.7)]'
            : 'bg-scifi-bg-secondary border border-scifi-border shadow-[0_0_40px_rgba(0,243,255,0.15)] backdrop-blur-md'
          }
        `}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-xl font-bold ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-accent' : 'font-scifi-heading text-scifi-accent text-base tracking-widest'}`}>
            Create New Timeline
          </h3>
          <button type="button" onClick={onClose} data-testid="close-add-timeline" className={`p-1 ${theme === 'fantasy' ? 'text-fantasy-muted hover:text-fantasy-text' : 'text-scifi-muted hover:text-scifi-accent'}`}>
            <X size={18} />
          </button>
        </div>

        {/* Timeline Info Section */}
        <div className={`mb-6 pb-4 border-b ${theme === 'fantasy' ? 'border-fantasy-border/40' : 'border-scifi-border/40'}`}>
          <h4 className={`text-sm font-bold mb-4 ${theme === 'fantasy' ? 'text-fantasy-text font-fantasy-heading' : 'text-scifi-text font-scifi-heading'}`}>
            Timeline Info
          </h4>
          
          {/* Title */}
          <div className="mb-4">
            <label className={labelClass}>Title *</label>
            <input
              data-testid="timeline-title-input"
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className={inputClass}
              placeholder="e.g., The Elder Scrolls Timeline"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className={labelClass}>Description</label>
            <input
              data-testid="timeline-description-input"
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className={inputClass}
              placeholder="Brief description of this timeline"
            />
          </div>

          {/* Default Theme */}
          <div className="mb-4">
            <label className={labelClass}>Theme</label>
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, defaultTheme: 'fantasy' }))}
                className={`flex-1 px-4 py-2 text-sm font-bold transition-all border ${
                  form.defaultTheme === 'fantasy'
                    ? 'bg-amber-900/50 text-amber-200 border-amber-600'
                    : theme === 'fantasy' 
                      ? 'bg-fantasy-bg text-fantasy-muted border-fantasy-border/50 hover:border-fantasy-border' 
                      : 'bg-scifi-bg text-scifi-muted border-scifi-border/50 hover:border-scifi-border'
                }`}
              >
                Fantasy
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, defaultTheme: 'scifi' }))}
                className={`flex-1 px-4 py-2 text-sm font-bold transition-all border ${
                  form.defaultTheme === 'scifi'
                    ? 'bg-cyan-900/50 text-cyan-200 border-cyan-600'
                    : theme === 'fantasy' 
                      ? 'bg-fantasy-bg text-fantasy-muted border-fantasy-border/50 hover:border-fantasy-border' 
                      : 'bg-scifi-bg text-scifi-muted border-scifi-border/50 hover:border-scifi-border'
                }`}
              >
                Sci-Fi
              </button>
            </div>
          </div>
        </div>

        {/* First Track Section */}
        <div className="mb-6">
          <h4 className={`text-sm font-bold mb-4 ${theme === 'fantasy' ? 'text-fantasy-text font-fantasy-heading' : 'text-scifi-text font-scifi-heading'}`}>
            First Track
          </h4>

          {/* Track Name */}
          <div className="mb-4">
            <label className={labelClass}>Track Name *</label>
            <input
              data-testid="first-track-name-input"
              type="text"
              value={form.trackName}
              onChange={e => setForm(f => ({ ...f, trackName: e.target.value }))}
              className={inputClass}
              placeholder="e.g., Main Events"
              required
            />
          </div>

          {/* Calendar Name */}
          <div className="mb-4">
            <label className={labelClass}>Calendar Name *</label>
            <input
              data-testid="first-track-calendar-input"
              type="text"
              value={form.trackCalendarName}
              onChange={e => setForm(f => ({ ...f, trackCalendarName: e.target.value }))}
              className={inputClass}
              placeholder="e.g., Common Era"
              required
            />
          </div>

          {/* Abbreviation */}
          <div className="mb-4">
            <label className={labelClass}>Abbreviation</label>
            <input
              data-testid="first-track-abbr-input"
              type="text"
              value={form.trackAbbr}
              onChange={e => setForm(f => ({ ...f, trackAbbr: e.target.value }))}
              className={`${inputClass} max-w-[100px]`}
              placeholder="CE"
              maxLength={4}
            />
          </div>

          {/* Color */}
          <div className="mb-4">
            <label className={labelClass}>Color</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {TRACK_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, trackColor: color }))}
                  className={`w-7 h-7 rounded transition-all ${form.trackColor === color ? 'ring-2 ring-offset-2 ring-offset-black scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: color, ringColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Epoch */}
          <div className="mb-4">
            <label className={labelClass}>Epoch</label>
            <input
              data-testid="first-track-epoch-input"
              type="number"
              value={form.trackEpoch}
              onChange={e => setForm(f => ({ ...f, trackEpoch: e.target.value }))}
              className={inputClass}
            />
            <p className={`text-xs mt-1 ${theme === 'fantasy' ? 'text-fantasy-muted/60' : 'text-scifi-muted'}`}>
              Master year for local year 0
            </p>
          </div>

          {/* Track Range */}
          <div className="mb-4">
            <label className={labelClass}>Year Range</label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <input
                  data-testid="first-track-start-input"
                  type="number"
                  value={form.trackStartYear}
                  onChange={e => setForm(f => ({ ...f, trackStartYear: e.target.value }))}
                  className={inputClass}
                  placeholder="Start"
                />
                <p className={`text-xs mt-1 ${theme === 'fantasy' ? 'text-fantasy-muted/60' : 'text-scifi-muted'}`}>Start</p>
              </div>
              <div>
                <input
                  data-testid="first-track-end-input"
                  type="number"
                  value={form.trackEndYear}
                  onChange={e => setForm(f => ({ ...f, trackEndYear: e.target.value }))}
                  className={inputClass}
                  placeholder="End"
                />
                <p className={`text-xs mt-1 ${theme === 'fantasy' ? 'text-fantasy-muted/60' : 'text-scifi-muted'}`}>End</p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          data-testid="submit-timeline-btn"
          type="submit"
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm transition-all
            ${theme === 'fantasy'
              ? 'bg-fantasy-accent text-fantasy-bg border border-fantasy-accent font-fantasy-heading hover:bg-yellow-600'
              : 'bg-scifi-accent text-scifi-bg border border-scifi-accent font-scifi-heading hover:bg-cyan-300'
            }`}
        >
          <Plus size={16} />
          Create Timeline
        </button>
      </motion.form>
    </motion.div>
  );
}
