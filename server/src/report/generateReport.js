import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite';

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    mainConcern: { type: 'string', nullable: true },
    keySymptoms: { type: 'array', items: { type: 'string' } },
    duration: { type: 'string', nullable: true },
    severity: { type: 'string', nullable: true },
    followUpFlags: { type: 'array', items: { type: 'string' } },
    completeness: { type: 'string', enum: ['complete', 'partial', 'minimal'] },
  },
  required: ['summary', 'completeness'],
};

/**
 * Turns a call's structured state + transcript into a doctor-glanceable
 * report. Handles the "call ended after one exchange" case explicitly
 * instead of letting the model guess or hallucinate to fill gaps.
 */
export async function generateReport(state) {
  // Nothing was ever said - don't even call the LLM, just say so.
  if (state.turnHistory.length === 0) {
    return {
      summary: 'The call ended before any information was collected.',
      mainConcern: null,
      keySymptoms: [],
      duration: null,
      severity: null,
      followUpFlags: [],
      completeness: 'minimal',
    };
  }

  const fieldsCollected = [
    state.name,
    state.mainConcern,
    state.duration,
    state.severity,
  ].filter(Boolean).length;

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: `You are summarizing a health-screening call
transcript into a structured report a doctor could glance at in a few
seconds. Be factual and concise. Do not diagnose. Do not invent details
that are not present in the conversation - if something was never
discussed, say so plainly instead of guessing.

The call itself may have been conducted in English, Hindi, or a mix of
both. Always write the report itself in English regardless of which
language(s) the call used, since it needs to be quickly readable by any
reviewing clinician.`,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: REPORT_SCHEMA,
      },
    });

    const collected = JSON.stringify({
      name: state.name,
      mainConcern: state.mainConcern,
      duration: state.duration,
      severity: state.severity,
      relatedSymptoms: state.relatedSymptoms,
      flags: state.flaggedForFollowup,
    });

    const transcriptText = state.turnHistory
      .map((t) => `${t.role}: ${t.text}`)
      .join('\n');

    const prompt = `Fields collected during the call (JSON): ${collected}

Full transcript:
${transcriptText}

Write the structured report now. Set completeness to "complete" if name,
main concern, duration, and severity are all present; "partial" if some are
missing; "minimal" if almost nothing was collected.`;

    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (err) {
    console.error('[REPORT] generation failed:', err.message);
    // Fall back to a manually-assembled report from raw state so the call
    // still produces something useful even if Gemini is down.
    return {
      summary:
        'The call ended, but the report could not be generated automatically ' +
        'due to a service error. Raw collected fields are shown below.',
      mainConcern: state.mainConcern,
      keySymptoms: state.relatedSymptoms,
      duration: state.duration,
      severity: state.severity,
      followUpFlags: state.flaggedForFollowup,
      completeness:
        fieldsCollected >= 4 ? 'complete' : fieldsCollected > 0 ? 'partial' : 'minimal',
    };
  }
}
