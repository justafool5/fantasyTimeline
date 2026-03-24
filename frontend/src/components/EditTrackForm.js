import React, { useState } from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { X, Save, Trash2 } from 'lucide-react';
import { TRACK_COLORS } from '../utils/timelineUtils';

export default function EditTrackForm({ track, onClose }) {
  const { updateTrack, deleteTrack } = useTimeline();
  const { theme } = useTheme();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [form, setForm] = useState({
    name: track.name || '',
    calendarName: track.calendarName || '',
    abbr: track.abbr || '',
    color: track.color || TRACK_COLORS[0],
    epoch: track.epoch ?? 0,
    startYear: track.startYear ?? -500,
    endYear: track.endYear ?? 1000,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.calendarName.trim()) return;

    const parsedEpoch = parseInt(form.epoch, 10);
    const parsedStartYear = parseInt(form.startYear, 10);
    const parsedEndYear = parseInt(form.endYear, 10);

    updateTrack(track.id, {
      name: form.name.trim(),
      calendarName: form.calendarName.trim(),
      abbr: form.abbr.trim() || form.calendarName.substring(0, 2).toUpperCase(),
      color: form.color,
      epoch: Number.isNaN(parsedEpoch) ? 0 : parsedEpoch,
      startYear: Number.isNaN(parsedStartYear) ? -500 : parsedStartYear,
      endYear: Number.isNaN(parsedEndYear) ? 1000 : parsedEndYear,
    });
    onClose();
  };

  const handleDelete = () => {
    deleteTrack(track.id);
    onClose();
  };

  const inputClass = theme === 'fantasy'
    ? 'bg-fantasy-bg-card border-2 border-fantasy-border text-fantasy-text font-fantasy-body px-3 py-2.5 w-full focus:outline-none focus:border-fantasy-gold transition-colors'
    : 'bg-scifi-bg border border-scifi-cyan-dim text-scifi-text font-scifi-body px-3 py-2.5 w-full focus:outline-none focus:border-scifi-cyan focus:shadow-scifi-glow transition-all';

  const labelClass = `block mb-1.5 text-xs font-bold uppercase tracking-wider ${theme === 'fantasy' ? 'text-fantasy-muted font-fantasy-heading' : 'text-scifi-cyan-dim font-scifi-heading'}`;

  return (
    <motion.div
      data-testid="edit-track-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: theme === 'fantasy' ? 'rgba(42, 24, 16, 0.85)' : 'rgba(3, 3, 8, 0.9)' }}
      onClick={onClose}
    >
      <motion.form
        data-testid="edit-track-form"
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 30 }}
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
        className={`
          w-full max-w-md max-h-[85vh] overflow-y-auto p-6
          ${theme === 'fantasy'
            ? 'bg-gradient-to-b from-fantasy-bg-card to-fantasy-bg-dark border-2 border-fantasy-border shadow-fantasy-lg'
            : 'bg-gradient-to-b from-scifi-bg-elevated to-scifi-bg-surface border border-scifi-cyan-dim shadow-scifi-lg'
          }
        `}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-xl font-bold ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-text' : 'font-scifi-heading text-scifi-cyan uppercase tracking-wider text-base'}`}>
            Edit Track
          </h3>
          <button type="button" onClick={onClose} data-testid="close-edit-track" className={`p-1.5 transition-colors ${theme === 'fantasy' ? 'text-fantasy-muted hover:text-fantasy-gold' : 'text-scifi-text-dim hover:text-scifi-cyan'}`}>
            <X size={18} />
          </button>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className={labelClass}>Name * <span className="font-normal opacity-60">(max 75 chars)</span></label>
          <input
            data-testid="edit-track-name-input"
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value.slice(0, 75) }))}
            className={inputClass}
            placeholder="e.g., Dwarven Kingdoms"
            maxLength={75}
            required
          />
          <p className={`text-xs mt-1 ${theme === 'fantasy' ? 'text-fantasy-muted/60' : 'text-scifi-text-dim'}`}>
            {form.name.length}/75 characters
          </p>
        </div>

        {/* Calendar Name */}
        <div className="mb-4">
          <label className={labelClass}>Calendar Name *</label>
          <input
            data-testid="edit-track-calendar-input"
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
            data-testid="edit-track-abbr-input"
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
            data-testid="edit-track-epoch-input"
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
                data-testid="edit-track-start-input"
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
                data-testid="edit-track-end-input"
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

        {/* Action Buttons */}
        <div className="flex gap-3">
          {/* Delete Button - only for local tracks */}
          {track.isLocal && (
            <button
              data-testid="delete-track-btn"
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className={`flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm transition-all
                ${theme === 'fantasy'
                  ? 'bg-red-900/30 text-red-400 border border-red-900/50 font-fantasy-heading hover:bg-red-900/50'
                  : 'bg-red-900/30 text-red-400 border border-red-900/50 font-scifi-heading hover:bg-red-900/50'
                }`}
            >
              <Trash2 size={16} />
            </button>
          )}

          {/* Submit */}
          <button
            data-testid="submit-edit-track-btn"
            type="submit"
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm transition-all
              ${theme === 'fantasy'
                ? 'bg-fantasy-gold text-fantasy-bg-dark border-2 border-fantasy-gold font-fantasy-heading hover:bg-fantasy-accent-light shadow-fantasy-glow'
                : 'bg-scifi-cyan/20 text-scifi-cyan border border-scifi-cyan font-scifi-heading uppercase tracking-wider hover:bg-scifi-cyan/30 hover:shadow-scifi-glow'
              }`}
          >
            <Save size={16} />
            Save Changes
          </button>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className={`mt-4 p-4 ${theme === 'fantasy' ? 'bg-fantasy-crimson/20 border-2 border-fantasy-crimson/40' : 'bg-scifi-magenta/10 border border-scifi-magenta/40'}`}>
            <p className={`text-sm mb-3 ${theme === 'fantasy' ? 'text-fantasy-text' : 'text-scifi-text'}`}>
              Delete this track and all its events? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className={`flex-1 px-3 py-2 text-sm font-bold transition-colors ${theme === 'fantasy' ? 'bg-fantasy-bg-card text-fantasy-muted border-2 border-fantasy-border hover:border-fantasy-gold' : 'bg-scifi-bg text-scifi-text-dim border border-scifi-cyan-dim hover:border-scifi-cyan'}`}
              >
                Cancel
              </button>
              <button
                data-testid="confirm-delete-track-btn"
                type="button"
                onClick={handleDelete}
                className={`flex-1 px-3 py-2 text-sm font-bold transition-colors ${theme === 'fantasy' ? 'bg-fantasy-crimson text-white border-2 border-fantasy-crimson hover:bg-fantasy-crimson/80' : 'bg-scifi-magenta/30 text-scifi-magenta border border-scifi-magenta hover:bg-scifi-magenta/40'}`}
              >
                Delete Track
              </button>
            </div>
          </div>
        )}
      </motion.form>
    </motion.div>
  );
}
