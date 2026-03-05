import React, { useState, useEffect } from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Save } from 'lucide-react';

export default function TimelineConfigDialog({ open, onClose }) {
  const { effectiveMeta, updateConfig, configOverride, timelineData } = useTimeline();
  const { theme } = useTheme();

  const baseMeta = timelineData?.timeline || {};

  const [form, setForm] = useState({
    title: '',
    description: '',
    startYear: 0,
    endYear: 0,
  });

  useEffect(() => {
    if (effectiveMeta) {
      setForm({
        title: effectiveMeta.title || '',
        description: effectiveMeta.description || '',
        startYear: effectiveMeta.startYear || 0,
        endYear: effectiveMeta.endYear || 0,
      });
    }
  }, [effectiveMeta, open]);

  const handleSave = () => {
    const config = {};
    if (form.title !== baseMeta.title) config.title = form.title;
    if (form.description !== (baseMeta.description || '')) config.description = form.description;
    if (parseInt(form.startYear) !== baseMeta.startYear) config.startYear = parseInt(form.startYear);
    if (parseInt(form.endYear) !== baseMeta.endYear) config.endYear = parseInt(form.endYear);

    updateConfig(Object.keys(config).length > 0 ? config : null);
    onClose();
  };

  const handleReset = () => {
    updateConfig(null);
    onClose();
  };

  const inputClass = theme === 'fantasy'
    ? 'bg-fantasy-bg border border-fantasy-border/60 text-fantasy-text font-fantasy-body px-3 py-2 w-full focus:outline-none focus:border-fantasy-accent'
    : 'bg-scifi-bg border border-scifi-border text-scifi-text font-scifi-body px-3 py-2 w-full focus:outline-none focus:border-scifi-accent';

  const labelClass = `block mb-1 text-xs font-bold uppercase tracking-wider ${theme === 'fantasy' ? 'text-fantasy-muted font-fantasy-heading' : 'text-scifi-muted font-scifi-heading'}`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-testid="config-dialog-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: theme === 'fantasy' ? 'rgba(10,8,4,0.7)' : 'rgba(0,0,0,0.8)' }}
          onClick={onClose}
        >
          <motion.div
            data-testid="config-dialog"
            initial={{ scale: 0.9, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 30 }}
            onClick={e => e.stopPropagation()}
            className={`
              w-full max-w-md p-6
              ${theme === 'fantasy'
                ? 'bg-fantasy-card border border-fantasy-border shadow-[0_4px_40px_rgba(0,0,0,0.7)]'
                : 'bg-scifi-bg-secondary border border-scifi-border shadow-[0_0_30px_rgba(0,243,255,0.1)] backdrop-blur-md'
              }
            `}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Settings size={18} className={theme === 'fantasy' ? 'text-fantasy-accent' : 'text-scifi-accent'} />
                <h3 className={`text-xl font-bold ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-accent' : 'font-scifi-heading text-scifi-accent text-base'}`}>
                  Timeline Settings
                </h3>
              </div>
              <button onClick={onClose} data-testid="close-config" className={`p-1 ${theme === 'fantasy' ? 'text-fantasy-muted hover:text-fantasy-text' : 'text-scifi-muted hover:text-scifi-accent'}`}>
                <X size={18} />
              </button>
            </div>

            {/* Title */}
            <div className="mb-4">
              <label className={labelClass}>Title</label>
              <input data-testid="config-title-input" type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className={labelClass}>Description</label>
              <textarea data-testid="config-description-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`${inputClass} h-20 resize-none`} placeholder="A brief description of this timeline..." />
            </div>

            {/* Date range */}
            <div className="mb-6 grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Start Year</label>
                <input data-testid="config-start-year" type="number" value={form.startYear} onChange={e => setForm(f => ({ ...f, startYear: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>End Year</label>
                <input data-testid="config-end-year" type="number" value={form.endYear} onChange={e => setForm(f => ({ ...f, endYear: e.target.value }))} className={inputClass} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button data-testid="config-save-btn" type="button" onClick={handleSave}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-sm transition-all
                  ${theme === 'fantasy' ? 'bg-fantasy-accent text-fantasy-bg border border-fantasy-accent font-fantasy-heading hover:bg-yellow-600' : 'bg-scifi-accent text-scifi-bg border border-scifi-accent font-scifi-heading hover:bg-cyan-300'}`}>
                <Save size={15} />
                Save
              </button>
              {configOverride && (
                <button data-testid="config-reset-btn" type="button" onClick={handleReset}
                  className={`px-4 py-2.5 font-bold text-sm transition-all
                    ${theme === 'fantasy' ? 'text-fantasy-muted border border-fantasy-border/60 font-fantasy-heading hover:text-fantasy-text hover:border-fantasy-border' : 'text-scifi-muted border border-scifi-border font-scifi-heading hover:text-scifi-accent hover:border-scifi-accent'}`}>
                  Reset
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
