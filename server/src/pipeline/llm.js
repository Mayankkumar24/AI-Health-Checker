import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite';

const TURN_SCHEMA = {
  type: 'object',
  properties: {
    agentMessage: { type: 'string' },
    updatedFields: {
      type: 'object',
      properties: {
        name: { type: 'string', nullable: true },
        mainConcern: { type: 'string', nullable: true },
        duration: { type: 'string', nullable: true },
        severity: { type: 'string', nullable: true },
        newRelatedSymptoms: { type: 'array', items: { type: 'string' } },
        newFlags: { type: 'array', items: { type: 'string' } },
      },
    },
    screeningComplete: { type: 'boolean' },
  },
  required: ['agentMessage', 'updatedFields', 'screeningComplete'],
};

const SYSTEM_INSTRUCTION = `You are a calm, friendly medical intake assistant
conducting a basic health screening call.

Always respond in whatever language the caller is currently using. If they
speak English, reply in English. If they speak Hindi, reply in Hindi. If
they mix Hindi and English in the same sentence (Hinglish), reply naturally
in that same mixed style - do not force pure Hindi or pure English. If they
switch languages mid-call, follow their switch immediately on your next
turn.

Ask one question at a time, in this rough order: the caller's name, their
main health concern, how long it has been going on, its severity, and any
related symptoms. This is a real adaptive conversation, not a fixed script:
if an answer is vague (e.g. "a while", "kind of bad"), ask a natural
follow-up to pin it down before moving on.

You must NOT give medical advice, diagnoses, or reassurance about the
condition - you are only collecting information for a human to review
later. Keep each response short (1-2 sentences), warm, and conversational.

Once you have name, main concern, duration, and severity (related symptoms
are a bonus, not required), thank the caller, tell them the screening is
complete, and set screeningComplete to true.`;

export async function getNextAgentTurn(state, userUtterance) {
  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: TURN_SCHEMA,
      },
    });

    const knownSoFar = JSON.stringify({
      name: state.name,
      mainConcern: state.mainConcern,
      duration: state.duration,
      severity: state.severity,
      relatedSymptoms: state.relatedSymptoms,
    });

    const historyText =
      state.turnHistory.map((t) => `${t.role}: ${t.text}`).join('\n') ||
      '(call just started, nothing said yet)';

    const latestTurnText = userUtterance
      ? `The caller's most recently detected language was "${state.language}". They just said: "${userUtterance}"`
      : 'The call is just starting. Greet the caller briefly in English and ask their name - switch language on your next turn if they respond in a different one.';

    const prompt = `Fields collected so far (JSON): ${knownSoFar}

Conversation so far:
${historyText}

${latestTurnText}

Respond with the next thing to say and any fields you can now confidently fill in. Do not repeat a question you already have a confident answer for.`;

    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (err) {
    console.error('[LLM] generation failed:', err.message);
    return null;
  }
}
