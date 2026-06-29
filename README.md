# Brink — Your Last-Minute Life Saver

An AI productivity copilot that prioritizes your tasks, builds a realistic plan for the rest of your day, and lets you talk to it like a sharp, supportive friend — powered by Gemini via Google AI Studio.

## What it does

- **AI Prioritization** — ranks your open tasks by urgency/importance with a one-line reason for each
- **AI Daily Plan** — builds a realistic, time-blocked schedule for the rest of today
- **Conversational assistant** — add, complete, or replan tasks just by talking (typed or voice)
- **Brink Line** — a live 12-hour timeline showing what's planned and what's looming

## Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node/Express (keeps your Gemini API key server-side, never exposed to the browser)
- AI: Gemini API via the `@google/genai` SDK (get your key from **Google AI Studio**)
- Deployment target: **Google Cloud Run**

---

## 1. Run it locally

```bash
npm install
cp .env.example .env
# open .env and paste your Gemini API key into GEMINI_API_KEY
npm run dev
```

This runs the Vite dev server (frontend) and the Express server (backend) together. Open the URL Vite prints (usually `http://localhost:5173`).

### Getting a Gemini API key
1. Go to https://aistudio.google.com
2. Click **Get API key** → **Create API key**
3. Copy it into your `.env` file as `GEMINI_API_KEY=...`

Never commit `.env` — it's already in `.gitignore`.

---

## 2. Deploy to Google Cloud Run

You need: a Google Cloud project with billing enabled (the free tier/credits cover this easily), and the gcloud CLI (https://cloud.google.com/sdk/docs/install) installed.

```bash
# 1. Authenticate and set your project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Enable the services Cloud Run needs (one-time)
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

# 3. From inside the brink-app folder, deploy directly from source
#    (Cloud Build will read the Dockerfile and build the container for you)
gcloud run deploy brink-app \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

That's it — gcloud will build the Docker image with Cloud Build, push it to Artifact Registry, and deploy it to Cloud Run. At the end it prints a **Service URL** like:

```
https://brink-app-xxxxxxxxxx.us-central1.run.app
```

That URL is your **Deployed Application Link** for submission.

### Updating after a code change
Just re-run the same `gcloud run deploy` command — it rebuilds and redeploys in place, same URL.

### Keeping your API key out of the command line (optional, more secure)
Instead of `--set-env-vars`, store the key in Secret Manager:
```bash
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-
gcloud run deploy brink-app --source . --region us-central1 --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest
```

---

## 3. Push to GitHub

```bash
git init
git add .
git commit -m "Brink: AI-powered last-minute life saver"
gh repo create brink-app --public --source=. --remote=origin --push
# (or create the repo on github.com and `git remote add origin <url>` then `git push -u origin main`)
```

Use this repo URL as your **GitHub Repository Link**.

---

## Project structure

```
brink-app/
├── server/index.js        # Express backend — all Gemini calls happen here
├── src/
│   ├── App.jsx             # Main layout
│   ├── components/         # BrinkLine, TaskList, TaskCard, ChatPanel, AddTaskModal, TopBar
│   ├── state/useTasks.js   # Task state, persisted to localStorage
│   └── lib/                 # api.js (fetch wrapper), time.js (countdown/urgency helpers)
├── Dockerfile               # Multi-stage build for Cloud Run
└── .env.example
```

## Notes for the submission doc

- **Google technologies used:** Gemini API, Google AI Studio (key generation + model development), Google Cloud Run (deployment), Cloud Build & Artifact Registry (build pipeline)
- **Model used:** gemini-2.5-flash by default — configurable via GEMINI_MODEL env var
