const BASE = 'https://www.googleapis.com/calendar/v3';

async function call(accessToken, path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 401) {
      const err = new Error('Your Google Calendar connection expired — please reconnect.');
      err.code = 'TOKEN_EXPIRED';
      throw err;
    }
    const body = await res.json().catch(() => ({}));
    const message = body?.error?.message || `Calendar request failed (${res.status})`;
    // A 403 with this specific message means the cached token was granted under
    // an incomplete/different scope (e.g. from an interrupted earlier sign-in) —
    // treat it the same as an expired token rather than surfacing a raw API error.
    if (res.status === 403 && /insufficient.*scope/i.test(message)) {
      const err = new Error('Your Google Calendar connection needs to be refreshed — please reconnect.');
      err.code = 'TOKEN_EXPIRED';
      throw err;
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

/**
 * Lists events on the user's primary calendar within a time window, used so
 * the AI scheduler can see real commitments (not just Brink's own tasks)
 * when building or revising a plan.
 */
export async function listUpcomingEvents(accessToken, { timeMinIso, timeMaxIso }) {
  const params = new URLSearchParams({
    timeMin: timeMinIso,
    timeMax: timeMaxIso,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });
  const data = await call(accessToken, `/calendars/primary/events?${params.toString()}`);
  return (data?.items || [])
    .filter((e) => e.status !== 'cancelled')
    .map((e) => ({
      id: e.id,
      title: e.summary || '(untitled event)',
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      allDay: !e.start?.dateTime,
    }));
}

/**
 * Creates a calendar event for a task deadline with a popup + email reminder,
 * so an in-app proactive nudge can also become a native OS/phone notification.
 */
export async function createTaskEvent(accessToken, { title, notes, startIso, endIso, reminderMinutesBefore = 30 }) {
  const event = {
    summary: title,
    description: notes || 'Created by Brink',
    start: { dateTime: startIso },
    end: { dateTime: endIso },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: reminderMinutesBefore },
        { method: 'email', minutes: reminderMinutesBefore },
      ],
    },
  };
  return call(accessToken, '/calendars/primary/events', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

export async function deleteTaskEvent(accessToken, eventId) {
  return call(accessToken, `/calendars/primary/events/${eventId}`, { method: 'DELETE' });
}
