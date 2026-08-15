import { SarvamAIClient } from 'sarvamai';

const sarvam = new SarvamAIClient({ apiSubscriptionKey: process.env.SARVAM_API_KEY });

const DEFAULT_SPEAKER = process.env.SARVAM_TTS_SPEAKER || 'meera';
const DEFAULT_TTS_LANGUAGE = 'en-IN';

// Bulbul v3 covers these - Hindi + 9 other Indian languages + Indian-accent
// English. If Saaras ever detects something outside this set (rare, but
// possible on a bad transcription), fall back to en-IN rather than sending
// an unsupported code to the TTS call.
const SUPPORTED_TTS_LANGUAGES = new Set([
  'hi-IN', 'bn-IN', 'ta-IN', 'te-IN', 'kn-IN',
  'ml-IN', 'mr-IN', 'gu-IN', 'pa-IN', 'od-IN', 'en-IN',
]);

/**
 * Synthesizes speech for the given text in the given language. Returns a
 * base64-encoded WAV string, or null if synthesis failed - the caller/client
 * falls back to browser speech synthesis in that case rather than the call
 * going silent.
 */
export async function synthesizeSpeech(text, languageCode) {
  const targetLanguage = SUPPORTED_TTS_LANGUAGES.has(languageCode)
    ? languageCode
    : DEFAULT_TTS_LANGUAGE;

  try {
    const response = await sarvam.textToSpeech.convert({
      text,
      targetLanguageCode: targetLanguage,
      model: 'bulbul:v3',
      speaker: DEFAULT_SPEAKER,
    });

    // Sarvam returns { audios: [base64WavString, ...] } - already base64,
    // no manual stream/buffer assembly needed (unlike Deepgram's TTS).
    const base64Audio = response?.audios?.[0];
    if (!base64Audio) {
      console.error('[TTS] Sarvam returned no audio');
      return null;
    }
    return base64Audio;
  } catch (err) {
    console.error('[TTS] synthesis failed:', err.message);
    return null;
  }
}
