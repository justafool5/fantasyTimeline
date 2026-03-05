import React, { useState } from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { X, Save, Trash2 } from 'lucide-react';

export default function EditTimelineForm({ onClose }) {
  const { timelineMeta, updateTimelineMeta, clearLocalData, localEvents, localTracks } = useTimeline();
  const { theme } = useTheme();

  const [form, setForm] = useState({
    title: timelineMeta?.title || '',
    description: timelineMeta?.description || '',
    masterStart: timelineMeta?.masterStart || -1000,
    masterEnd: timelineMeta?.masterEnd || 2000,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    updateTimelineMeta({
      title: form.title.trim(),
      description: form.description.trim(),
      masterStart: parseInt(form.masterStart),
      masterEnd: parseInt(form.masterEnd),
    });
    onClose();
  };

  const handleClearLocalData = () => {
    if (window.confirm('Clear all locally added events and tracks? This cannot be undone. (Data from the JSON file will remain)')) {
      clearLocalData();
      onClose();
    }
  };

  const hasLocalData = localEvents.length > 0 || localTracks.length > 0;

  const inputClass = theme === 'fantasy'
    ? 'bg-fantasy-bg border border-fantasy-border/60 text-fantasy-text font-fantasy-body px-3 py-2 w-full focus:outline-none focus:border-fantasy-accent'
    : 'bg-scifi-bg border border-scifi-border text-scifi-text font-scifi-body px-3 py-2 w-full focus:outline-none focus:border-scifi-accent';

  const labelClass = `block mb-1 text-xs font-bold uppercase tracking-wider ${theme === 'fantasy' ? 'text-fantasy-muted font-fantasy-heading' : 'text-scifi-muted font-scifi-heading'}`;

  return (
    <motion.div
      data-testid="edit-timeline-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: theme === 'fantasy' ? 'rgba(10,8,4,0.7)' : 'rgba(0,0,0,0.8)' }}
      onClick={onClose}
    >
      <motion.form
        data-testid="edit-timeline-form"
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 30 }}
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
        className={`
          w-full max-w-md max-h-[85vh] overflow-y-auto p-6
          ${theme === 'fantasy'
            ? 'bg-fantasy-card border border-fantasy-border shadow-[0_4px_40px_rgba(0,0,0,0.7)]'
            : 'bg-scifi-bg-secondary border border-scifi-border shadow-[0_0_30px_rgba(0,243,255,0.1)] backdrop-blur-md'
          }
        `}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-xl font-bold ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-accent' : 'font-scifi-heading text-scifi-accent text-base'}`}>
            Edit Timeline
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            data-testid="close-edit-timeline" 
            className={`p-1 ${theme === 'fantasy' ? 'text-fantasy-muted hover:text-fantasy-text' : 'text-scifi-muted hover:text-scifi-accent'}`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className={labelClass}>Title *</label>
          <input
            data-testid="timeline-title-input"
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className={inputClass}
            placeholder="Timeline name..."
            required
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className={labelClass}>Description</label>
          <textarea
            data-testid="timeline-description-input"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className={`${inputClass} h-24 resize-none`}
            placeholder="Describe this timeline..."
          />
        </div>

        {/* Master Range */}
        <div className="mb-6">
          <label className={labelClass}>Reference Frame Range</label>
          <p className={`text-xs mb-2 ${theme === 'fantasy' ? 'text-fantasy-muted/60' : 'text-scifi-muted'}`}>
            The internal coordinate system used to align all tracks. Not displayed to users.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                data-testid="timeline-master-start-input"
                type="number"
                value={form.masterStart}
                onChange={e => setForm(f => ({ ...f, masterStart: e.target.value }))}
                className={inputClass}
              />
              <p className={`text-xs mt-1 ${theme === 'fantasy' ? 'text-fantasy-muted/60' : 'text-scifi-muted'}`}>Start</p>
            </div>
            <div>
              <input
                data-testid="timeline-master-end-input"
                type="number"
                value={form.masterEnd}
                onChange={e => setForm(f => ({ ...f, masterEnd: e.target.value }))}
                className={inputClass}
              />
              <p className={`text-xs mt-1 ${theme === 'fantasy' ? 'text-fantasy-muted/60' : 'text-scifi-muted'}`}>End</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          data-testid="save-timeline-btn"
          type="submit"
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm transition-all
            ${theme === 'fantasy'
              ? 'bg-fantasy-accent text-fantasy-bg border border-fantasy-accent font-fantasy-heading hover:bg-yellow-600'
              : 'bg-scifi-accent text-scifi-bg border border-scifi-accent font-scifi-heading hover:bg-cyan-300'
            }`}
        >
          <Save size={16} />
          Save Changes
        </button>

        {/* Clear Local Data */}
        {hasLocalData && (
          <div className={`mt-4 pt-4 border-t ${theme === 'fantasy' ? 'border-fantasy-border/30' : 'border-scifi-border/30'}`}>
            <p className={`text-xs mb-2 ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}`}>
              You have {localEvents.length} local event(s) and {localTracks.length} local track(s) stored in browser.
            </p>
            <button
              data-testid="clear-local-data-btn"
              type="button"
              onClick={handleClearLocalData}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm transition-all
                ${theme === 'fantasy'
                  ? 'bg-red-900/30 text-red-400 border border-red-700/50 hover:bg-red-900/50'
                  : 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                }`}
            >
              <Trash2 size={14} />
              Clear Local Data
            </button>
          </div>
        )}
      </motion.form>
    </motion.div>
  );
}
