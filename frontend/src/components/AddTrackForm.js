import React, { useState } from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { TRACK_COLORS } from '../utils/timelineUtils';

export default function AddTrackForm({ onClose }) {
  const { addTrack } = useTimeline();
  const { theme } = useTheme();

  const [form, setForm] = useState({
    name: '',
    calendarName: '',
    abbr: '',
    color: TRACK_COLORS[0],
    epoch: 0,
    startYear: -500,
    endYear: 1000,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.calendarName.trim()) return;

    addTrack({
      name: form.name.trim(),
      calendarName: form.calendarName.trim(),
      abbr: form.abbr.trim() || form.calendarName.substring(0, 2).toUpperCase(),
      color: form.color,
      epoch: parseInt(form.epoch) || 0,
      startYear: parseInt(form.startYear) || -500,
      endYear: parseInt(form.endYear) || 1000,
    });
    onClose();
  };

  const inputClass = theme === 'fantasy'
    ? 'bg-fantasy-bg border border-fantasy-border/60 text-fantasy-text font-fantasy-body px-3 py-2 w-full focus:outline-none focus:border-fantasy-accent'
    : 'bg-scifi-bg border border-scifi-border text-scifi-text font-scifi-body px-3 py-2 w-full focus:outline-none focus:border-scifi-accent';

  const labelClass = `block mb-1 text-xs font-bold uppercase tracking-wider ${theme === 'fantasy' ? 'text-fantasy-muted font-fantasy-heading' : 'text-scifi-muted font-scifi-heading'}`;

  return (
    <motion.div
      data-testid="add-track-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: theme === 'fantasy' ? 'rgba(10,8,4,0.7)' : 'rgba(0,0,0,0.8)' }}
      onClick={onClose}
    >
      <motion.form
        data-testid="add-track-form"
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
            Add New Track
          </h3>
          <button type="button" onClick={onClose} data-testid="close-add-track" className={`p-1 ${theme === 'fantasy' ? 'text-fantasy-muted hover:text-fantasy-text' : 'text-scifi-muted hover:text-scifi-accent'}`}>
            <X size={18} />
          </button>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className={labelClass}>Name *</label>
          <input
            data-testid="track-name-input"
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className={inputClass}
            placeholder="e.g., Dwarven Kingdoms"
            required
          />
        </div>

        {/* Calendar Name */}
        <div className="mb-4">
          <label className={labelClass}>Calendar Name *</label>
          <input
            data-testid="track-calendar-input"
            type="text"
            value={form.calendarName}
            onChange={e => setForm(f => ({ ...f, calendarName: e.target.value }))}
            className={inputClass}
            placeholder="e.g., Stone Reckoning"
            required
          />
        </div>

        {/* Abbreviation */}
        <div className="mb-4">
          <label className={labelClass}>Abbreviation</label>
          <input
            data-testid="track-abbr-input"
            type="text"
            value={form.abbr}
            onChange={e => setForm(f => ({ ...f, abbr: e.target.value }))}
            className={`${inputClass} max-w-[100px]`}
            placeholder="SR"
            maxLength={4}
          />
          <p className={`text-xs mt-1 ${theme === 'fantasy' ? 'text-fantasy-muted/60' : 'text-scifi-muted'}`}>
            Short label for year display (e.g., "100 SR")
          </p>
        </div>

        {/* Color */}
        <div className="mb-4">
          <label className={labelClass}>Color</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {TRACK_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setForm(f => ({ ...f, color }))}
                className={`w-8 h-8 rounded transition-all ${form.color === color ? 'ring-2 ring-offset-2 ring-offset-black scale-110' : 'hover:scale-110'}`}
                style={{ backgroundColor: color, ringColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Epoch */}
        <div className="mb-4">
          <label className={labelClass}>Epoch (Master Year for Local Year 0)</label>
          <input
            data-testid="track-epoch-input"
            type="number"
            value={form.epoch}
            onChange={e => setForm(f => ({ ...f, epoch: e.target.value }))}
            className={inputClass}
          />
          <p className={`text-xs mt-1 ${theme === 'fantasy' ? 'text-fantasy-muted/60' : 'text-scifi-muted'}`}>
            Example: If epoch is 800, then local year 100 aligns with master year 900
          </p>
        </div>

        {/* Track Range */}
        <div className="mb-6">
          <label className={labelClass}>Track Range (Local Years)</label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <input
                data-testid="track-start-input"
                type="number"
                value={form.startYear}
                onChange={e => setForm(f => ({ ...f, startYear: e.target.value }))}
                className={inputClass}
                placeholder="Start"
              />
              <p className={`text-xs mt-1 ${theme === 'fantasy' ? 'text-fantasy-muted/60' : 'text-scifi-muted'}`}>Start year</p>
            </div>
            <div>
              <input
                data-testid="track-end-input"
                type="number"
                value={form.endYear}
                onChange={e => setForm(f => ({ ...f, endYear: e.target.value }))}
                className={inputClass}
                placeholder="End"
              />
              <p className={`text-xs mt-1 ${theme === 'fantasy' ? 'text-fantasy-muted/60' : 'text-scifi-muted'}`}>End year</p>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className={`mb-6 p-3 ${theme === 'fantasy' ? 'bg-fantasy-bg/50 border border-fantasy-border/30' : 'bg-scifi-bg/50 border border-scifi-border/30'}`}>
          <p className={`text-xs ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}`}>Preview:</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: form.color }} />
            <span className={`text-sm font-bold ${theme === 'fantasy' ? 'text-fantasy-text' : 'text-scifi-text'}`}>
              {form.name || 'Track Name'}
            </span>
            <span className={`text-xs ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}`}>
              ({form.calendarName || 'Calendar'})
            </span>
          </div>
          <p className={`text-xs mt-2 ${theme === 'fantasy' ? 'text-fantasy-muted/60' : 'text-scifi-muted'}`}>
            Range: {form.startYear} {form.abbr || 'YR'} to {form.endYear} {form.abbr || 'YR'}
          </p>
        </div>

        {/* Submit */}
        <button
          data-testid="submit-track-btn"
          type="submit"
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm transition-all
            ${theme === 'fantasy'
              ? 'bg-fantasy-accent text-fantasy-bg border border-fantasy-accent font-fantasy-heading hover:bg-yellow-600'
              : 'bg-scifi-accent text-scifi-bg border border-scifi-accent font-scifi-heading hover:bg-cyan-300'
            }`}
        >
          <Plus size={16} />
          Create Track
        </button>
      </motion.form>
    </motion.div>
  );
}
