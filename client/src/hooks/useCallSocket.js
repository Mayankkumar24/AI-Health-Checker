import { useCallback, useRef, useState } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';

/**
 * Owns the WebSocket connection for one call and exposes reactive state +
 * actions to the UI. Also owns audio playback: agent turns normally arrive
 * as base64 WAV from Sarvam Bulbul (whatever language was detected that
 * turn - no client-side language selection). If Bulbul TTS fails for a
 * turn, we fall back to the browser's Web Speech API so a TTS outage never
 * means the call just goes silent.
 */
export function useCallSocket() {
  const wsRef = useRef(null);
  const currentAudioRef = useRef(null); // tracks the currently playing agent Audio object
  const [status, setStatus] = useState('idle'); // idle | connecting | in_call | ended
  const [transcript, setTranscript] = useState([]); // [{ role, text }]
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [screeningComplete, setScreeningComplete] = useState(false);
  const [agentLoading, setAgentLoading] = useState(false); // true from start_call until first agent reply

  const speakBrowser = useCallback((text, language) => {
    if (!('speechSynthesis' in window) || !text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    // Sarvam's language codes (e.g. 'hi-IN', 'en-IN') are valid BCP-47 tags,
    // so we can pass them straight through to the Web Speech API.
    utterance.lang = language || 'en-IN';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  // Stops any currently playing agent audio (both HTML Audio and browser TTS).
  const stopAgentAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const playAgentAudio = useCallback(
    (base64Audio, fallbackText, language) => {
      if (!base64Audio) {
        speakBrowser(fallbackText, language);
        return;
      }
      // Sarvam returns WAV, not mp3.
      const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
      currentAudioRef.current = audio;
      audio.play().catch(() => speakBrowser(fallbackText, language));
      audio.onended = () => {
        currentAudioRef.current = null;
      };
    },
    [speakBrowser]
  );


  const appendTurn = useCallback((userText, agentText, role = 'agent') => {
    setTranscript((prev) => {
      const next = [...prev];
      if (userText !== null && userText !== undefined) {
        const idx = [...next].reverse().findIndex(
          (t) => t.role === 'user' && t.text === '(processing...)'
        );
        if (idx !== -1) {
          const realIdx = next.length - 1 - idx;
          next[realIdx] = { role: 'user', text: userText };
        }
      }
      return [...next, { role, text: agentText }];
    });
  }, []);

  const handleMessage = useCallback(
    (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case 'agent_audio':
          setAgentLoading(false);
          appendTurn(msg.userText, msg.text, 'agent');
          playAgentAudio(msg.audio, msg.text, msg.language);
          if (msg.screeningComplete) setScreeningComplete(true);
          break;

        case 'agent_text_only':
          setAgentLoading(false);
          appendTurn(msg.userText, msg.text, 'agent');
          if (msg.speak) speakBrowser(msg.text, msg.language);
          if (msg.screeningComplete) setScreeningComplete(true);
          break;

        case 'report':
          setReport(msg.report);
          setStatus('ended');
          break;

        case 'error':
          setError(msg.message);
          break;

        default:
          console.warn('[useCallSocket] unknown message type:', msg.type);
      }
    },
    [appendTurn, playAgentAudio, speakBrowser]
  );

  const startCall = useCallback(() => {
    setError(null);
    setTranscript([]);
    setReport(null);
    setScreeningComplete(false);
    setStatus('connecting');

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('in_call');
      setAgentLoading(true);
      ws.send(JSON.stringify({ type: 'start_call' }));
    };
    ws.onmessage = handleMessage;
    ws.onerror = () => {
      setError('Connection error. Check that the server is running and try again.');
    };
    ws.onclose = () => {
      setStatus((prev) => (prev === 'ended' ? prev : 'idle'));
    };
  }, [handleMessage]);

  const sendUserAudio = useCallback((base64Audio) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
    
      setTranscript((prev) => {
        const next = [...prev];
        const idx = [...next].reverse().findIndex(
          (t) => t.role === 'user' && t.text === '(listening...)'
        );
        if (idx !== -1) {
          const realIdx = next.length - 1 - idx;
          next[realIdx] = { role: 'user', text: '(processing...)' };
        }
        return next;
      });
      wsRef.current.send(JSON.stringify({ type: 'user_audio', audio: base64Audio }));
    }
  }, []);

 
  const markListening = useCallback(() => {
    setTranscript((prev) => [...prev, { role: 'user', text: '(listening...)' }]);
  }, []);

  const endCall = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_call' }));
    }
  }, []);

  return {
    status,
    transcript,
    report,
    error,
    screeningComplete,
    agentLoading,
    startCall,
    sendUserAudio,
    markListening,
    stopAgentAudio,
    endCall,
  };
}
