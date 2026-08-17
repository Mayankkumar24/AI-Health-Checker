import { SarvamAIClient } from 'sarvamai';
import { Readable } from 'node:stream';

const sarvam = new SarvamAIClient({ apiSubscriptionKey: process.env.SARVAM_API_KEY });


/**
 * Transcribes one turn of audio with auto language detection (Saaras v3
 * natively handles Hindi/English code-mixing, so no language needs to be
 * pre-selected).
 */
export async function transcribeAudio(audioBuffer) {
  try {
    const fileStream = Readable.from(audioBuffer);

    const response = await sarvam.speechToText.transcribe({
      file: fileStream,
      model: 'saaras:v3',
      languageCode: 'unknown', // auto-detect; response includes the detected language
    });

    const transcript = (response?.transcript ?? '').trim();
    const detectedLanguage = response?.languageCode ?? response?.language_code ?? null;

    return { transcript, detectedLanguage };
  } catch (err) {
    console.error('[STT] transcription failed:', err.message);
    return { transcript: null, detectedLanguage: null };
  }
}
