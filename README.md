# 🩺 Health Screening Agent

A voice-based AI health screening agent that conducts a real-time medical intake conversation with users. The agent greets the user, collects their name, main health concern, duration, severity, and related symptoms — then generates a structured screening report. It supports English, Hindi, and natural Hinglish (code-mixed) conversations.

**Live Demo:** [https://health-screening-agent.vercel.app](https://health-screening-agent.vercel.app)

**GitHub Repo:** [https://github.com/your-username/health-screening-agent](https://github.com/your-username/health-screening-agent)

> ⚠️ **Note:** After you speak and send your message, the agent may take **5–40 seconds** to respond. This is expected — the audio goes through speech-to-text transcription, then the LLM generates a reply, then text-to-speech synthesis runs before you hear anything. Please wait after sending each message.

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        CLIENT                           │
│              (React + Vite, deployed on Vercel)         │
│                                                         │
│   ┌──────────────┐        ┌──────────────────────────┐  │
│   │  CallScreen  │        │      useCallSocket       │  │
│   │  (UI/controls│◄──────►│  (WebSocket + audio      │  │
│   │   + mic)     │        │   playback state)        │  │
│   └──────────────┘        └──────────────────────────┘  │
│                                    │ WebSocket (wss://) │
└────────────────────────────────────┼────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────┐
│                       SERVER       │                     │
│           (Node.js, deployed on Render)                  │
│                                    ▼                     │
│                        ┌─────────────────┐               │
│                        │  callHandler.js │               │
│                        │  (WS handler)   │               │
│                        └────────┬────────┘               │
│                ┌────────────────┼──────────────┐         │
│                ▼                ▼              ▼          │
│         ┌────────────┐  ┌────────────┐  ┌──────────────┐ │
│         │   stt.js   │  │   llm.js   │  │   tts.js     │ │
│         │ Sarvam STT │  │  Gemini    │  │ Sarvam TTS   │ │
│         │ (Saaras v3)│  │ 2.0 Flash  │  │ (Bulbul v3)  │ │
│         └────────────┘  └────────────┘  └──────────────┘ │
│                                    │                     │
│                        ┌───────────▼────────┐            │
│                        │  generateReport.js │            │
│                        │  (Gemini summary)  │            │
│                        └────────────────────┘            │
└──────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Workflow

1. **User opens the app** → sees the pre-call screen
2. **User clicks "Start call"** → WebSocket connection opens to the server
3. **Server sends `start_call`** → LLM generates a greeting → TTS synthesizes it → audio is sent back to the client as base64 WAV
4. **Client plays the greeting audio** → agent loading overlay disappears → "Start speaking" button becomes active
5. **User clicks "Start speaking"** → microphone starts recording → transcript shows `You: (listening...)`
6. **User clicks "Send"** → audio blob is base64-encoded and sent to the server → transcript shows `You: (processing...)`
7. **Server pipeline runs:**
   - `stt.js` → Sarvam **Saaras v3** transcribes the audio and auto-detects the language
   - `llm.js` → Google **Gemini 2.0 Flash Lite** generates the next agent response as structured JSON
   - `tts.js` → Sarvam **Bulbul v3** synthesizes the response as WAV audio
8. **Server sends back** the transcribed text + agent reply + audio → client replaces `(processing...)` with the real transcript and plays the agent's voice
9. **Steps 5–8 repeat** until all screening questions are answered
10. **User clicks "End call"** → server generates a structured health report using Gemini → report screen is shown

---

## 🧠 Models Used

| Role | Provider | Model |
|------|----------|-------|
| **Speech-to-Text (STT)** | Sarvam AI | `saaras:v3` |
| **Text-to-Speech (TTS)** | Sarvam AI | `bulbul:v3` |
| **Language Model (LLM)** | Google Gemini | `gemini-2.0-flash-lite` |

- **Saaras v3** — auto-detects language (English, Hindi, Hinglish, and 9 other Indian languages). No manual language selection needed.
- **Bulbul v3** — Indian-accent multilingual TTS supporting Hindi, English (IN), Bengali, Tamil, Telugu, Kannada, Malayalam, Marathi, Gujarati, Punjabi, and Odia.
- **Gemini 2.0 Flash Lite** — fast, cost-efficient LLM used for structured JSON response generation and report summarization.

---

## 🛠 Tech Stack

**Frontend**
- React 18
- Vite 5
- Native browser APIs: `MediaRecorder`, `Web Audio`, `WebSocket`, `SpeechSynthesis` (TTS fallback)

**Backend**
- Node.js (ES Modules)
- `ws` — WebSocket server
- `@google/generative-ai` — Gemini SDK
- `sarvamai` — Sarvam AI SDK (STT + TTS)
- `dotenv` — environment variable management

**Deployment**
- Frontend → [Vercel](https://vercel.com)
- Backend → [Render](https://render.com)

---

## 🚀 Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend (React) | Vercel | https://health-screening-agent.vercel.app |
| Backend (Node.js + WebSocket) | Render | https://health-screening-agent-server.onrender.com |

---

## 🔑 Getting API Keys

### Sarvam AI API Key (Free tier)
1. Go to [https://dashboard.sarvam.ai](https://dashboard.sarvam.ai)
2. Sign up for a free account
3. Navigate to **API Keys** in the dashboard
4. Click **Generate API Key** and copy it
5. Free tier gives ₹100 credit — enough for many hours of testing

### Google Gemini API Key (Free tier)
1. Go to [https://aistudio.google.com](https://aistudio.google.com)
2. Sign in with your Google account
3. Click **Get API Key** → **Create API Key**
4. Copy the generated key
5. `gemini-2.0-flash-lite` is available on the free tier with rate limits (15 requests/minute, 1500 requests/day)

---

## ⚙️ Environment Variables

### Server — `server/.env`
```env
SARVAM_API_KEY=your_sarvam_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
PORT=8080
```

### Client — `client/.env`
```env
VITE_WS_URL=ws://localhost:8080
```
> For production, change this to your deployed backend URL: `wss://your-render-app.onrender.com`

---

## 💻 Local Setup

> **Use Command Prompt (cmd) for all commands below.** All steps must be run in order.

### Prerequisites
- [Node.js](https://nodejs.org) v18 or higher
- A Sarvam AI API key
- A Google Gemini API key

---

### Step 1 — Clone the repository

```cmd
git clone https://github.com/your-username/health-screening-agent.git
```

```cmd
cd health-screening-agent
```

---

### Step 2 — Set up the server

```cmd
cd server
```

Install dependencies:

```cmd
npm install
```

Create the environment file by copying the example:

```cmd
copy .env.example .env
```

Open `server/.env` in any text editor and fill in your keys:

```env
SARVAM_API_KEY=your_sarvam_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
PORT=8080
```

Start the server:

```cmd
npm run dev
```

You should see:
```
[server] listening on http://localhost:8080
```

**Keep this terminal open.**

---

### Step 3 — Set up the client (open a new Command Prompt window)

Navigate back to the root and into the client folder:

```cmd
cd path\to\health-screening-agent\client
```

Install dependencies:

```cmd
npm install
```

Create the environment file:

```cmd
copy .env.example .env
```

Open `client/.env` and set:

```env
VITE_WS_URL=ws://localhost:8080
```

Start the client dev server:

```cmd
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in Xms

  ➜  Local:   http://localhost:5173/
```

---

### Step 4 — Open the app

Open your browser and go to:

```
http://localhost:5173
```

Click **Start call**, wait for the agent to greet you, then click **Start speaking** to begin the screening.

---

## 📦 Dependencies

### Server
```json
{
  "sarvamai": "^1.1.8",
  "@google/generative-ai": "^0.21.0",
  "dotenv": "^16.4.5",
  "ws": "^8.18.0"
}
```

### Client
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "vite": "^5.4.0",
  "@vitejs/plugin-react": "^4.3.1"
}
```

---

## 📁 Project Structure

```
health-screening-agent/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CallScreen.jsx     # Main call UI + mic controls
│   │   │   └── ReportView.jsx     # Post-call report display
│   │   ├── hooks/
│   │   │   └── useCallSocket.js   # WebSocket + audio playback logic
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── src/
│   │   ├── pipeline/
│   │   │   ├── stt.js             # Sarvam Saaras v3 — speech to text
│   │   │   ├── llm.js             # Gemini 2.0 Flash Lite — conversation logic
│   │   │   └── tts.js             # Sarvam Bulbul v3 — text to speech
│   │   ├── report/
│   │   │   └── generateReport.js  # End-of-call report generation
│   │   ├── state/
│   │   │   └── conversationState.js  # In-memory call state
│   │   ├── ws/
│   │   │   └── callHandler.js     # WebSocket message handler
│   │   └── index.js               # HTTP + WebSocket server entry
│   ├── .env.example
│   └── package.json
│
└── README.md
```

---

## ⚠️ Known Limitations

- Audio turns longer than ~30 seconds may not transcribe correctly (Sarvam's synchronous STT endpoint limit)
- The free Render tier spins down after 15 minutes of inactivity — the first connection after idle may take 30–60 seconds to wake up
- Gemini free tier has rate limits (15 RPM / 1500 RPD) — suitable for demos, not production traffic
- In-memory call state means a server restart ends any active call

---

