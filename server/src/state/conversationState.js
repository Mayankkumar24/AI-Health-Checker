
export function createInitialState() {
  return {
    language: 'en-IN',
    name: null,
    mainConcern: null,
    duration: null,
    severity: null,
    relatedSymptoms: [],
    flaggedForFollowup: [],
    turnHistory: [],
    status: 'in_progress',
  };
}
