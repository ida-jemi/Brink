import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8787;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!process.env.GEMINI_API_KEY) {
  console.warn('[brink] WARNING: GEMINI_API_KEY is not set. AI features will fail until it is.');
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ---------- helpers ----------

/** Strip markdown code fences a model sometimes wraps JSON in, then parse. */
function parseJsonResponse(text) {
  if (!text) throw new Error('Empty model response');
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}

async function generateJson(prompt, { systemInstruction } = {}) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      systemInstruction,
      temperature: 0.4,
    },
  });
  const text = response.text;
  return parseJsonResponse(text);
}

function fmtTask(t) {
  const deadline = t.deadline ? new Date(t.deadline) : null;
  const recurrence = t.recurrence === 'daily' ? `daily habit, streak:${t.streak || 0}` : 'one-off';
  return `- id:${t.id} | "${t.title}" | deadline:${deadline ? deadline.toISOString() : 'none'} | est:${t.estimatedMinutes || 30}min | done:${!!t.done} | ${recurrence} | notes:${t.notes || 'none'}`;
}

// ---------- routes ----------

app.get('/api/health', (req, res) => res.json({ ok: true, model: MODEL }));

// Rank tasks by urgency/importance with a short rationale for each
app.post('/api/prioritize', async (req, res) => {
  try {
    const { tasks = [], now } = req.body;
    const nowIso = now || new Date().toISOString();
    if (tasks.length === 0) {
      return res.json({ ranked: [], insight: 'No tasks yet. Add something with a deadline to get started.' });
    }
    const prompt = `Current time: ${nowIso}\n\nTasks:\n${tasks.map(fmtTask).join('\n')}\n\nRank these tasks from most to least urgent/important right now, considering deadline proximity, estimated effort, and any notes. Return ONLY JSON matching exactly this shape, no extra commentary:\n{"ranked": [{"id": "<task id>", "priority": 1, "reason": "<one short sentence, under 18 words>"}], "insight": "<one short, encouraging, plain-spoken sentence summarizing what matters most right now>"}`;
    const json = await generateJson(prompt, {
      systemInstruction: 'You are Brink, a calm, direct productivity copilot. You never pad your answers, you speak plainly, and you always return strictly valid JSON with no markdown fences.',
    });
    res.json(json);
  } catch (err) {
    console.error('prioritize error:', err.message);
    res.status(500).json({ error: 'Could not prioritize tasks right now. Please try again.' });
  }
});

// Generate a realistic time-blocked plan for the rest of today, or revise an existing one based on feedback
app.post('/api/plan', async (req, res) => {
  try {
    const { tasks = [], now, feedback, previousBlocks, calendarEvents = [] } = req.body;
    const nowIso = now || new Date().toISOString();
    if (tasks.length === 0) {
      return res.json({ blocks: [], summary: 'No tasks to plan yet.' });
    }

    const taskLines = tasks.filter(t => !t.done).map(fmtTask).join('\n');
    const calendarLines = calendarEvents.length
      ? calendarEvents.map(e => `- "${e.title}" ${e.start} to ${e.end}${e.allDay ? ' (all day)' : ''}`).join('\n')
      : null;
    const calendarBlock = calendarLines
      ? `\n\nThe user's real Google Calendar has these fixed commitments today — treat these as unmovable and schedule everything else around them, never overlapping:\n${calendarLines}`
      : '';
    const blockShape = '{"type": "task", "taskId": "<task id>", "title": "<task title>", "start": "HH:MM", "end": "HH:MM", "note": "<short tactical tip, under 14 words>"}';
    const breakShape = '{"type": "break", "title": "Break", "start": "HH:MM", "end": "HH:MM", "note": "<optional short tip, under 10 words>"}';
    const responseShape = `{"blocks": [${blockShape} or ${breakShape}, ...], "summary": "<one short, plain-spoken sentence on the plan, under 28 words>"}`;

    let prompt;
    if (feedback && previousBlocks?.length) {
      const prevLines = previousBlocks
        .map(b => `- [${b.type || 'task'}] "${b.title}" ${b.start}-${b.end}${b.note ? ' | ' + b.note : ''}`)
        .join('\n');
      prompt = `Current time: ${nowIso}\n\nTasks (not done):\n${taskLines}${calendarBlock}\n\nThe existing schedule for the rest of today is:\n${prevLines}\n\nThe user gave this feedback on the schedule: "${feedback}"\n\nRevise the schedule to address their feedback while keeping it realistic: respect estimated durations, keep it ending by 11:00 PM, never overlap the fixed calendar commitments listed above (if any), and prioritize whatever is closest to its deadline or most important unless the feedback says otherwise. Each break must be its own block with type "break" (e.g. lunch, short rest) — do not skip break blocks unless the user explicitly asked to remove them. Return ONLY JSON matching exactly this shape, no extra commentary:\n${responseShape}\nUse 24-hour HH:MM format for start/end.`;
    } else {
      prompt = `Current time: ${nowIso}\n\nTasks (not done):\n${taskLines}${calendarBlock}\n\nBuild a realistic time-blocked plan for the rest of today only, starting from the current time, ending by 11:00 PM. Respect estimated durations, never overlap the fixed calendar commitments listed above (if any), and prioritize whatever is closest to its deadline or most important. Skip tasks that can't realistically fit and mention that in the summary. Each break must be its own block with type "break" (e.g. a 10-15 min break after a long task, a longer lunch break around midday if it falls in range) — represent breaks as real blocks with their own start/end, not just gaps. Return ONLY JSON matching exactly this shape, no extra commentary:\n${responseShape}\nUse 24-hour HH:MM format for start/end.`;
    }

    const json = await generateJson(prompt, {
      systemInstruction: 'You are Brink, a calm, direct productivity copilot. You build realistic, achievable schedules, not fantasy ones, and you take user feedback on a schedule seriously rather than ignoring it. Always return strictly valid JSON with no markdown fences.',
    });
    res.json(json);
  } catch (err) {
    console.error('plan error:', err.message);
    res.status(500).json({ error: 'Could not build a plan right now. Please try again.' });
  }
});

// Conversational assistant that can also propose task actions
app.post('/api/chat', async (req, res) => {
  try {
    const { message, tasks = [], history = [], now } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }
    const nowIso = now || new Date().toISOString();
    const historyText = history
      .slice(-8)
      .map(h => `${h.role === 'user' ? 'User' : 'Brink'}: ${h.content}`)
      .join('\n');

    const prompt = `Current time: ${nowIso}\n\nCurrent tasks:\n${tasks.length ? tasks.map(fmtTask).join('\n') : '(none yet)'}\n\nRecent conversation:\n${historyText || '(start of conversation)'}\n\nUser just said: "${message}"\n\nRespond as Brink. If the user wants to add, complete, update, or delete a task, include the corresponding action(s). Deadlines you propose must be ISO 8601 datetimes; infer a sensible deadline/time if the user is vague (e.g. "tomorrow" -> tomorrow same time, "tonight" -> 9pm today) relative to the current time above. If the user describes something they want to do every day or as a habit (e.g. "every day", "daily", "each morning"), set recurrence to "daily" on that add_task action. Return ONLY JSON matching exactly this shape, no extra commentary:\n{"reply": "<your short, direct, warm reply to show the user, 1-3 sentences>", "actions": [{"type": "add_task", "title": "...", "deadline": "<ISO datetime>", "estimatedMinutes": 30, "notes": "", "recurrence": null}]}\nValid action types: add_task (title, deadline, estimatedMinutes, notes, recurrence: "daily" or null), complete_task (id), update_task (id, and any of title/deadline/estimatedMinutes/notes/recurrence), delete_task (id). If no action is needed, return an empty actions array.`;

    const json = await generateJson(prompt, {
      systemInstruction: 'You are Brink, a calm, encouraging, no-nonsense productivity copilot embedded in a task app. You talk like a sharp, supportive friend, not a corporate assistant. Keep replies short. Always return strictly valid JSON with no markdown fences. Never invent task ids; only reference ids that were given to you in the current tasks list.',
    });
    res.json(json);
  } catch (err) {
    console.error('chat error:', err.message);
    res.status(500).json({ error: "Couldn't reach the assistant just now. Please try again." });
  }
});

// Phrase a detected risk as a short, personalized, actionable recommendation
app.post('/api/recommend', async (req, res) => {
  try {
    const { riskDescription, riskType, tasks = [], now } = req.body;
    if (!riskDescription) {
      return res.status(400).json({ error: 'riskDescription is required.' });
    }
    const nowIso = now || new Date().toISOString();
    const prompt = `Current time: ${nowIso}\n\nTasks:\n${tasks.length ? tasks.map(fmtTask).join('\n') : '(none)'}\n\nA rules-based check just detected this situation: ${riskDescription} (type: ${riskType})\n\nWrite this up as a short, warm, direct heads-up from Brink to the user — one or two sentences, plain language, no corporate tone. Then propose exactly one concrete next action the user could take with a single tap, phrased as a short imperative button label (under 6 words, e.g. "Move it to tonight" or "Re-plan my day"). Return ONLY JSON matching exactly this shape, no extra commentary:\n{"message": "<the heads-up, 1-2 sentences>", "actionLabel": "<short button label>"}`;
    const json = await generateJson(prompt, {
      systemInstruction: 'You are Brink, a calm, direct productivity copilot. You proactively flag real risks without being alarmist, and you always propose one specific, doable next step. Always return strictly valid JSON with no markdown fences.',
    });
    res.json(json);
  } catch (err) {
    console.error('recommend error:', err.message);
    res.status(500).json({ error: 'Could not generate a recommendation right now.' });
  }
});

// ---------- static frontend (production) ----------
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[brink] server listening on port ${PORT} (model: ${MODEL})`);
});
