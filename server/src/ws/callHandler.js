import { createInitialState } from '../state/conversationState.js';
import { transcribeAudio } from '../pipeline/stt.js';
import { getNextAgentTurn } from '../pipeline/llm.js';
import { synthesizeSpeech } from '../pipeline/tts.js';
import { generateReport } from '../report/generateReport.js';

/**
 * One call = one WebSocket connection = one closure holding `state`.
 * Message protocol (client -> server):
 *   { type: 'start_call' }
 *   { type: 'user_audio', audio: base64String }   // one full turn's audio
 *   { type: 'end_call' }
 *
 * Message protocol (server -> client):
 *   { type: 'agent_audio', text, audio: base64|null, language, userText, screeningComplete }
 *   { type: 'agent_text_only', text, speak: true, language, userText, screeningComplete }
 *   { type: 'report', report: {...} }
 *   { type: 'error', message }
 *
 * There's no client-side language selection anymore - Saaras v3 auto-detects
 * the caller's language every turn, and every agent turn always tries
 * server-side TTS (Sarvam Bulbul) regardless of language; it only falls
 * back to agent_text_only (browser speech synthesis) if that TTS call fails.
 */
export function handleConnection(ws) {
  let state = null;

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: 'error', message: 'Malformed message received.' });
      return;
    }

    try {
      switch (msg.type) {
        case 'start_call':
          await handleStartCall();
          break;
        case 'user_audio':
          await handleUserAudio(msg);
          break;
        case 'end_call':
          await handleEndCall();
          break;
        default:
          send(ws, { type: 'error', message: `Unknown message type: ${msg.type}` });
      }
    } catch (err) {
      console.error('[callHandler] unhandled error:', err);
      send(ws, {
        type: 'error',
        message: 'Something went wrong on our end. Please try again.',
      });
    }
  });

  ws.on('close', () => {
    state = null;
  });

  async function handleStartCall() {
    state = createInitialState();

    const turn = await getNextAgentTurn(state, null);
    if (!turn) {
      send(ws, {
        type: 'agent_text_only',
        text: recoveryMessage(state.language, 'llm_error'),
        speak: true,
        language: state.language,
        userText: null,
        screeningComplete: false,
      });
      return;
    }

    await respondWithAgentTurn(turn, null);
  }

  async function handleUserAudio(msg) {
    if (!state || state.status === 'ended') {
      send(ws, {
        type: 'error',
        message: 'Call is not active. Please start a new call.',
      });
      return;
    }

    const audioBuffer = Buffer.from(msg.audio, 'base64');
    const { transcript, detectedLanguage } = await transcribeAudio(audioBuffer);

    // Sarvam call itself failed (network/auth/service error).
    if (transcript === null) {
      send(ws, {
        type: 'agent_text_only',
        text: recoveryMessage(state.language, 'stt_error'),
        speak: true,
        language: state.language,
        userText: '(could not process audio)',
        screeningComplete: false,
      });
      return;
    }

    // Sarvam succeeded but heard nothing usable (silence / background noise).
    if (!transcript) {
      send(ws, {
        type: 'agent_text_only',
        text: recoveryMessage(state.language, 'empty'),
        speak: true,
        language: state.language,
        userText: '(no speech detected)',
        screeningComplete: false,
      });
      return;
    }

    // Only move to a newly detected language if we actually got one -
    // avoids thrashing state.language on a turn where detection is unclear.
    if (detectedLanguage) {
      state.language = detectedLanguage;
    }

    state.turnHistory.push({ role: 'user', text: transcript });

    const turn = await getNextAgentTurn(state, transcript);
    if (!turn) {
      send(ws, {
        type: 'agent_text_only',
        text: recoveryMessage(state.language, 'llm_error'),
        speak: true,
        language: state.language,
        userText: transcript,
        screeningComplete: false,
      });
      return;
    }

    applyStateUpdate(turn.updatedFields);
    await respondWithAgentTurn(turn, transcript);
  }

  async function handleEndCall() {
    if (!state) {
      send(ws, { type: 'error', message: 'No active call to end.' });
      return;
    }
    state.status = 'ended';
    const report = await generateReport(state);
    send(ws, { type: 'report', report });
  }

  function applyStateUpdate(fields = {}) {
    if (fields.name) state.name = fields.name;
    if (fields.mainConcern) state.mainConcern = fields.mainConcern;
    if (fields.duration) state.duration = fields.duration;
    if (fields.severity) state.severity = fields.severity;
    if (Array.isArray(fields.newRelatedSymptoms)) {
      state.relatedSymptoms.push(...fields.newRelatedSymptoms.filter(Boolean));
    }
    if (Array.isArray(fields.newFlags)) {
      state.flaggedForFollowup.push(...fields.newFlags.filter(Boolean));
    }
  }

  async function respondWithAgentTurn(turn, userText) {
    state.turnHistory.push({ role: 'agent', text: turn.agentMessage });

    const base = {
      text: turn.agentMessage,
      userText,
      screeningComplete: !!turn.screeningComplete,
      language: state.language,
    };

    // Always try Sarvam TTS first, regardless of language - unlike the old
    // Deepgram setup, there's no language that has to skip straight to the
    // browser fallback anymore.
    const audioBase64 = await synthesizeSpeech(turn.agentMessage, state.language);

    if (audioBase64) {
      send(ws, { type: 'agent_audio', ...base, audio: audioBase64 });
    } else {
      send(ws, { type: 'agent_text_only', ...base, speak: true });
    }
  }
}

function recoveryMessage(language, kind) {
  // Simple heuristic fallback: Hindi-ish detected codes get the Hindi
  // message, everything else (including languages Bulbul doesn't have a
  // dedicated recovery string for) gets English.
  const isHindi = language?.startsWith('hi');

  const messages = {
    en: {
      empty: "Sorry, I didn't catch that. Could you say it again?",
      stt_error: 'Sorry, I had trouble hearing that. Could you repeat it?',
      llm_error:
        'Sorry, something went wrong on my end. Could you repeat your last answer?',
    },
    hi: {
      empty: 'माफ़ कीजिए, मैं समझ नहीं पाया। क्या आप दोबारा बता सकते हैं?',
      stt_error: 'माफ़ कीजिए, सुनने में दिक्कत हुई। कृपया दोबारा बोलें।',
      llm_error: 'माफ़ कीजिए, कुछ गड़बड़ हो गई। कृपया अपना पिछला जवाब दोबारा बताएं।',
    },
  };

  return isHindi ? messages.hi[kind] : messages.en[kind];
}

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}
