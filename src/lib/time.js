export function msUntil(deadlineIso) {
  if (!deadlineIso) return Infinity;
  return new Date(deadlineIso).getTime() - Date.now();
}

export function urgencyLevel(deadlineIso) {
  const ms = msUntil(deadlineIso);
  if (ms <= 0) return 'overdue';
  const hours = ms / 36e5;
  if (hours <= 3) return 'critical';
  if (hours <= 24) return 'soon';
  return 'safe';
}

export const URGENCY_COLOR = {
  overdue: 'var(--color-danger)',
  critical: 'var(--color-signal)',
  soon: '#F2C45A',
  safe: 'var(--color-safe)',
};

export function formatCountdown(deadlineIso) {
  if (!deadlineIso) return 'No deadline';
  const ms = msUntil(deadlineIso);
  const abs = Math.abs(ms);
  const mins = Math.floor(abs / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);

  let label;
  if (days >= 1) {
    label = `${days}d ${hrs % 24}h`;
  } else if (hrs >= 1) {
    label = `${hrs}h ${mins % 60}m`;
  } else {
    label = `${Math.max(mins, 0)}m`;
  }
  return ms <= 0 ? `${label} overdue` : `${label} left`;
}

export function formatDeadlineLabel(deadlineIso) {
  if (!deadlineIso) return 'No deadline';
  const d = new Date(deadlineIso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}

/** Minutes since midnight, for placing things on the 24h BrinkLine */
export function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function hhmmToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}
