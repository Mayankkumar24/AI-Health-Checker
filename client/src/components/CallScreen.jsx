import { useRef, useState } from 'react';

/* ── Inline SVG icons (no extra deps) ── */
const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8"  y1="23" x2="16" y2="23"/>
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const PhoneOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A2 2 0 0 1 10.68 13.31z"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M3.74 3.74A19.79 19.79 0 0 0 2.12 12a2 2 0 0 0 2 1.72h.15"/>
  </svg>
);

const HeartPulseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5 19.79 19.79 0 0 1 1.61 4.9 2 2 0 0 1 3.6 2.72h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 10.4a16 16 0 0 0 6.09 6.09l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 17.4v-.48z"/>
  </svg>
);

/**
 * Handles the pre-call "Start call" screen, the in-call transcript +
 * controls, and mic recording (push-to-talk style).
 */
export default function CallScreen({ callState }) {
  const {
    status, transcript, error, screeningComplete, agentLoading,
    startCall, sendUserAudio, markListening, stopAgentAudio, endCall,
  } = callState;

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const transcriptEndRef = useRef(null);

  async function toggleRecording() {
    if (!isRecording) {
      try {
        stopAgentAudio();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const base64 = await blobToBase64(blob);
          sendUserAudio(base64);
          stream.getTracks().forEach((t) => t.stop());
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        markListening();
      } catch (err) {
        console.error('[CallScreen] microphone access failed:', err);
        alert('Could not access the microphone. Please allow microphone permission and try again.');
      }
    } else {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }
  }

  /* ── Pre-call / connecting screen ── */
  if (status === 'idle' || status === 'connecting') {
    return (
      <div className="card">
        <div className="pre-call">
          <div className="pre-call-icon">
            <MicIcon />
          </div>
          <h1>Health Screening</h1>
          <p>
            Speak in English, Hindi, or a natural mix — the agent will follow along and assess your symptoms.
          </p>
          <button
            className="btn-primary"
            onClick={() => startCall()}
            disabled={status === 'connecting'}
          >
            <PhoneIcon />
            {status === 'connecting' ? 'Connecting…' : 'Start call'}
          </button>
          {error && <p className="error-bar" style={{ marginTop: 16 }}>{error}</p>}
        </div>
      </div>
    );
  }

  /* ── In-call screen ── */
  return (
    <div className="card">
      <div className="in-call">

        {/* Header */}
        <div className="call-header">
          <span className="call-header-dot" />
          <span className="call-header-title">Health Screening</span>
          <span className="call-header-sub">
            {agentLoading ? 'Agent preparing…' : 'Live call'}
          </span>
        </div>

        {/* Agent loading state */}
        {agentLoading ? (
          <div className="agent-loading">
            <div className="agent-loading-avatar">
              <span className="pulse-ring" />
              <span className="pulse-ring" />
              <span className="pulse-ring" />
              <div className="agent-loading-avatar-bg">
                <MicIcon />
              </div>
            </div>
            <p className="agent-loading-label">Agent is preparing…</p>
            <p className="agent-loading-sub">
              Your health screening agent is loading.<br />
              This takes just a moment.
            </p>
          </div>
        ) : (
          /* Transcript */
          <div className="transcript">
            {transcript.length === 0 && (
              <div className="transcript-empty">Conversation will appear here…</div>
            )}
            {transcript.map((t, i) => (
              <div key={i} className={`bubble-row ${t.role}`}>
                <div className="bubble-avatar">
                  {t.role === 'agent' ? 'AI' : 'You'}
                </div>
                <div className={`bubble ${isPlaceholder(t.text) ? 'placeholder' : ''}`}>
                  {t.text}
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}

        {/* Hint */}
        {screeningComplete && (
          <p className="hint">
            ✓ Screening complete — you may end the call anytime.
          </p>
        )}

        {/* Error */}
        {error && <p className="error-bar">{error}</p>}

        {/* Controls */}
        <div className="controls">
          <button
            className={`btn-mic ${isRecording ? 'recording' : ''}`}
            onClick={toggleRecording}
            disabled={status !== 'in_call' || agentLoading}
          >
            {isRecording ? <SendIcon /> : <MicIcon />}
            {isRecording ? 'Send' : 'Start speaking'}
          </button>
          <button className="btn-end" onClick={endCall} disabled={status !== 'in_call'} title="End call">
            <PhoneOffIcon />
          </button>
        </div>

      </div>
    </div>
  );
}

function isPlaceholder(text) {
  return text === '(listening...)' || text === '(processing...)';
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
