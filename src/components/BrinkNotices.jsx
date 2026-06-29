import { useEffect, useRef, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { detectRisks, describeRisk } from '../lib/recommendations';
import { api } from '../lib/api';

const DISMISSED_KEY = 'brink:dismissed_risk:v1';

/**
 * Surfaces one proactive, personalized recommendation without the user asking —
 * the "context-aware reminder" / "personalized recommendation" piece of the brief.
 * Detection is pure client-side pattern matching (cheap, instant); only the
 * phrasing + suggested action come from Gemini, and only once a real risk exists.
 */
export default function BrinkNotices({ tasks, calendarEvents, onAction }) {
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dismissedKey, setDismissedKey] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISSED_KEY) || '';
    } catch {
      return '';
    }
  });
  const lastCheckedSignature = useRef('');

  useEffect(() => {
    // Re-run detection whenever the inputs that matter actually change, not on every render.
    const signature = JSON.stringify(tasks.map((t) => [t.id, t.done, t.deadline, t.streak, t.lastCompletedDate, t.deadlinePushCount]));
    if (signature === lastCheckedSignature.current) return;
    lastCheckedSignature.current = signature;

    const risks = detectRisks(tasks, calendarEvents);
    if (!risks.length) {
      setNotice(null);
      return;
    }
    const top = risks[0];
    const key = `${top.type}:${top.task?.id || top.tasks?.map((t) => t.id).join(',') || ''}`;
    if (key === dismissedKey) return;

    setLoading(true);
    api
      .recommend(describeRisk(top), top.type, tasks)
      .then((res) => setNotice({ key, risk: top, message: res.message, actionLabel: res.actionLabel }))
      .catch(() => setNotice({ key, risk: top, message: describeRisk(top), actionLabel: null }))
      .finally(() => setLoading(false));
  }, [tasks, calendarEvents, dismissedKey]);

  const dismiss = () => {
    if (!notice) return;
    setDismissedKey(notice.key);
    try {
      sessionStorage.setItem(DISMISSED_KEY, notice.key);
    } catch {
      // non-fatal
    }
    setNotice(null);
  };

  if (loading) {
    return (
      <div className="animate-slide-up rounded-2xl bg-(--color-surface) border border-(--color-border-line) p-4 flex items-center gap-2.5">
        <Sparkles size={14} className="text-(--color-signal) animate-spin shrink-0" />
        <p className="text-sm text-(--color-text-faint)">Brink is checking on things…</p>
      </div>
    );
  }

  if (!notice) return null;

  return (
    <div className="animate-slide-up rounded-2xl bg-(--color-signal-dim) border border-(--color-signal)/25 p-4 flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-(--color-signal) flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles size={13} className="text-(--color-void)" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-(--color-text-primary) leading-relaxed">{notice.message}</p>
        {notice.actionLabel && (
          <button
            onClick={() => {
              onAction?.(notice.risk);
              dismiss();
            }}
            className="mt-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-(--color-signal) text-(--color-void) transition-all duration-150 hover:opacity-90 hover:scale-105 active:scale-95"
          >
            {notice.actionLabel}
          </button>
        )}
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 p-1 rounded-md text-(--color-text-faint) hover:text-(--color-text-primary) hover:bg-(--color-surface-hover) transition-all duration-150"
      >
        <X size={14} />
      </button>
    </div>
  );
}
