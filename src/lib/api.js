async function post(path, body) {
  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request to /api/${path} failed`);
  }
  return res.json();
}

export const api = {
  prioritize: (tasks) => post('prioritize', { tasks, now: new Date().toISOString() }),
  plan: (tasks, options = {}) => post('plan', { tasks, now: new Date().toISOString(), feedback: options.feedback, previousBlocks: options.previousBlocks, calendarEvents: options.calendarEvents }),
  recommend: (riskDescription, riskType, tasks) => post('recommend', { riskDescription, riskType, tasks, now: new Date().toISOString() }),
  chat: (message, tasks, history) => post('chat', { message, tasks, history, now: new Date().toISOString() }),
};
