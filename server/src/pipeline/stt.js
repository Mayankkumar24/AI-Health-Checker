import { SarvamAIClient } from 'sarvamai';
import { Readable } from 'node:stream';

const sarvam = new SarvamAIClient({ apiSubscriptionKey: process.env.SARVAM_API_KEY });

// NOTE: verify method/param names against https://docs.sarvam.ai when you
// install this - the JS SDK is Fern-generated and camelCases the REST API's
// snake_case params (language_code -> languageCode), but exact field names
// can shift across SDK versions. The REST API's synchronous endpoint is
// documented for audio under 30 seconds, which comfortably covers a single
// push-to-talk turn; a caller who rambles past that would need the Batch
// API instead - not handled here, flagged as a known limitation.

/**
 * Transcribes one turn of audio with auto language detection (Saaras v3
 * natively handles Hindi/English code-mixing, so no language needs to be
 * pre-selected). Returns:
 *   - { transcript: string, detectedLanguage: string|null } on success
 *     (transcript may be '' if Sarvam heard silence/noise)
 *   - { transcript: null, detectedLanguage: null } if the API call itself failed
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
