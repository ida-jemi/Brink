import { useState } from 'react';
import { Coffee, Sparkles, Send } from 'lucide-react';
import { urgencyLevel, URGENCY_COLOR } from '../lib/time';

function to12h(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function durationLabel(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return '';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const FEEDBACK_SUGGESTIONS = [
  'Add more breaks',
  'Remove the breaks',
  'I start later than this',
];

export default function ScheduleTable({ tasks, blocks, summary, onRevise, revising }) {
  const [feedback, setFeedback] = useState('');

  if (!blocks?.length) return null;

  const submit = (text) => {
    const value = (text ?? feedback).trim();
    if (!value || revising) return;
    setFeedback('');
    onRevise(value);
  };

  return (
    <div className="animate-slide-up rounded-2xl bg-(--color-surface) border border-(--color-border-line) p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-(--color-text-primary)">Today's schedule</h2>
          {summary && <p className="text-xs text-(--color-text-faint) mt-0.5">{summary}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {blocks.map((b, i) => {
          const isBreak = b.type === 'break';
          const task = !isBreak ? tasks.find((t) => t.id === b.taskId) : null;
          const color = isBreak ? 'var(--color-text-faint)' : URGENCY_COLOR[urgencyLevel(task?.deadline)];
          return (
            <div
              key={i}
              style={{ animationDelay: `${i * 40}ms` }}
              className={`animate-slide-up flex items-center gap-3 px-3 py-2.5 rounded-lg ${
                isBreak ? 'bg-transparent' : 'bg-(--color-surface-raised)'
              }`}
            >
              <div className="w-[108px] shrink-0 font-mono-tabular text-xs text-(--color-text-muted)">
                {to12h(b.start)} – {to12h(b.end)}
              </div>
              <span className="w-1 h-1 rounded-full shrink-0" style={{ background: color }} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate flex items-center gap-1.5 ${isBreak ? 'text-(--color-text-faint) italic' : 'text-(--color-text-primary) font-medium'}`}>
                  {isBreak && <Coffee size={12} className="shrink-0" />}
                  {b.title}
                </p>
                {b.note && <p className="text-xs text-(--color-text-faint) truncate">{b.note}</p>}
              </div>
              <span className="shrink-0 text-xs font-mono-tabular text-(--color-text-faint)">{durationLabel(b.start, b.end)}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-(--color-border-line)">
        <p className="text-xs font-medium text-(--color-text-muted) mb-2">Want to adjust it?</p>
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {FEEDBACK_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => submit(s)}
              disabled={revising}
              className="text-xs text-(--color-text-muted) border border-(--color-border-line) rounded-lg px-2.5 py-1.5 transition-all duration-150 hover:border-(--color-signal)/40 hover:bg-(--color-signal-dim) hover:text-(--color-text-primary) disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex items-center gap-2"
        >
          <input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="e.g. give me a longer break after lunch"
            disabled={revising}
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={!feedback.trim() || revising}
            aria-label="Revise schedule"
            className="shrink-0 p-2 rounded-lg bg-(--color-signal) text-(--color-void) disabled:opacity-40 transition-all duration-150 hover:scale-105 active:scale-95 disabled:hover:scale-100"
          >
            {revising ? <Sparkles size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </form>
      </div>
    </div>
  );
}
