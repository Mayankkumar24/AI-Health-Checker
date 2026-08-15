// Central shape of a call's state. Every field here is what we consider
// "the truth" about the call so far - the LLM is asked to update this
// structured object each turn rather than us just replaying raw transcript
// text back at it.
//
// `language` is no longer picked upfront by the user - it starts at a
// default and updates each turn based on what Saaras v3 detects the caller
// speaking, so the call adapts naturally if they switch languages mid-call.

export function createInitialState() {
  return {
    language: 'en-IN', // default until the first user utterance is detected
    name: null,
    mainConcern: null,
    duration: null,
    severity: null,
    relatedSymptoms: [],
    flaggedForFollowup: [],
    turnHistory: [], // [{ role: 'user' | 'agent', text: string }]
    status: 'in_progress', // 'in_progress' | 'ended'
  };
}
